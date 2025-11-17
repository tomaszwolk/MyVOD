import logging
import uuid

from django.db import transaction
from django.db.models import Exists, OuterRef, Prefetch, Max
from django.utils import timezone

from movies.models import Movie, MovieAvailability, UserMovie, UserPlatform  # type: ignore

logger = logging.getLogger(__name__)


def _get_user_platform_ids(user_id):
    return list(
        UserPlatform.objects.filter(user_id=user_id).values_list("platform_id", flat=True)
    )


def _resolve_user_uuid(user):
    """Resolve canonical UUID for the given user (Django `users_user`)."""
    if not hasattr(user, "id"):
        raise Exception("Unable to resolve user UUID: missing id on user")

    try:
        return str(uuid.UUID(str(user.id)))
    except Exception:
        raise Exception("User id is not a valid UUID")


def build_user_movies_queryset(
    *,
    user,
    status_param: str,
    ordering_param: str | None = None,
    is_available: bool | None = None,
    platform_ids: list[int] | None = None,
):
    """Builds the queryset for listing user's movies with optional filters.

    Args:
        user: The authenticated user object; must expose an `id` UUID.
        status_param: 'watchlist' or 'watched'. Required.
        ordering_param: Optional ordering field ('-watchlisted_at' or '-tconst__avg_rating').
        is_available: Optional boolean to filter by availability across user's platforms.
        platform_ids: Optional list of platform IDs to filter availability by. If None, uses user's platforms.
    """

    # Resolve canonical user UUID (custom user model has UUID id)
    supabase_user_uuid = _resolve_user_uuid(user)

    # Use provided platform_ids or fall back to user's platforms
    filter_platform_ids = platform_ids if platform_ids is not None else _get_user_platform_ids(supabase_user_uuid)

    availability_prefetch = Prefetch(
        'tconst__availability_entries',
        queryset=MovieAvailability.objects.filter(platform_id__in=filter_platform_ids).select_related('platform'),
        to_attr='availability_filtered'
    )

    if status_param == 'watchlist':
        queryset = (
            UserMovie.objects.filter(
                user_id=supabase_user_uuid,
                watchlist_deleted_at__isnull=True,
                watchlisted_at__isnull=False,
                watched_at__isnull=True  # Not watched yet
            )
            .select_related('tconst')
            .prefetch_related(availability_prefetch)
        )
    elif status_param == 'watched':
        queryset = (
            UserMovie.objects.filter(
                user_id=supabase_user_uuid,
                watched_at__isnull=False  # Is watched
            )
            .select_related('tconst')
            .prefetch_related(availability_prefetch)
        )
    else:
        # Fallback for other status values
        queryset = (
            UserMovie.objects.filter(user_id=supabase_user_uuid, watchlist_deleted_at__isnull=True)
            .select_related('tconst')
            .prefetch_related(availability_prefetch)
        )

    if is_available is True:
        # Use EXISTS subquery for better performance (no materialized list)
        available_subquery = MovieAvailability.objects.filter(
            tconst=OuterRef('tconst'),
            platform_id__in=filter_platform_ids,
            is_available=True,
        )
        queryset = queryset.filter(Exists(available_subquery))
    elif is_available is False:
        # Movies with at least one FALSE and NO TRUE entries on user's platforms
        has_true = MovieAvailability.objects.filter(
            tconst=OuterRef('tconst'),
            platform_id__in=filter_platform_ids,
            is_available=True,
        )
        has_false = MovieAvailability.objects.filter(
            tconst=OuterRef('tconst'),
            platform_id__in=filter_platform_ids,
            is_available=False,
        )
        queryset = queryset.filter(Exists(has_false)).exclude(Exists(has_true))

    if ordering_param in ['-watchlisted_at', '-tconst__avg_rating']:
        queryset = queryset.order_by(ordering_param)
    else:
        # Default ordering to ensure consistent pagination results
        if status_param == 'watchlist':
            queryset = queryset.order_by('-watchlisted_at')
        elif status_param == 'watched':
            queryset = queryset.order_by('-watched_at')

    return queryset


@transaction.atomic
def add_movie_to_watchlist(*, user, tconst: str, added_from_ai_suggestion: bool = False):
    """Adds a movie to user's watchlist or restores a soft-deleted entry.

    Business Logic:
    - Validates that the movie exists in the database
    - Checks for duplicate active watchlist entries (raises ValueError if found)
    - Restores soft-deleted entries if they exist
    - Creates new entries with watchlisted_at set to current timestamp
    - Returns the created/restored UserMovie instance with prefetched data

    Args:
        user: The authenticated user object with `email` attribute
        tconst: The IMDb movie identifier (e.g., 'tt0816692')
        added_from_ai_suggestion: Whether the movie was added from an AI suggestion (default: False)

    Returns:
        UserMovie: The created or restored user_movie instance with:
            - tconst (Movie) prefetched via select_related
            - availability_filtered prefetched for user's platforms

    Raises:
        Movie.DoesNotExist: If the movie with given tconst doesn't exist
        ValueError: If the movie is already on user's active watchlist
        Exception: If Supabase user not found
    """
    # Resolve canonical user UUID for the user
    supabase_user_uuid = _resolve_user_uuid(user)

    logger.info(f"Adding movie to watchlist: user_id={supabase_user_uuid}, tconst={tconst}")

    # Guard clause: Validate movie exists
    if not Movie.objects.filter(tconst=tconst).exists():
        raise Movie.DoesNotExist(f"Movie with tconst '{tconst}' does not exist in database")

    # Guard clause: Check for ANY existing entry (active OR soft-deleted)
    # This prevents IntegrityError on unique constraint (user_id, tconst)
    existing_entry = UserMovie.objects.filter(
        user_id=supabase_user_uuid,
        tconst=tconst
    ).first()

    if existing_entry:
        # Check if it's an active watchlist entry
        is_active = (
            existing_entry.watchlisted_at is not None and
            existing_entry.watchlist_deleted_at is None
        )

        logger.info(f"Found existing user_movie id={existing_entry.id}, is_active={is_active}")

        if is_active:
            raise ValueError("Movie is already on the watchlist")

        # Entry exists but is soft-deleted or incomplete - restore it
        if existing_entry.watchlist_deleted_at is not None:
            logger.info(f"Restoring soft-deleted user_movie id={existing_entry.id}")
            existing_entry.watchlisted_at = timezone.now()
            existing_entry.watchlist_deleted_at = None
            if added_from_ai_suggestion:
                existing_entry.added_from_ai_suggestion = True
            existing_entry.save(update_fields=['watchlisted_at', 'watchlist_deleted_at', 'added_from_ai_suggestion'] if added_from_ai_suggestion else ['watchlisted_at', 'watchlist_deleted_at'])
            user_movie = existing_entry
        else:
            # Entry exists but watchlisted_at is NULL - set it now
            logger.info(f"Updating incomplete user_movie id={existing_entry.id}")
            existing_entry.watchlisted_at = timezone.now()
            if added_from_ai_suggestion:
                existing_entry.added_from_ai_suggestion = True
            existing_entry.save(update_fields=['watchlisted_at', 'added_from_ai_suggestion'] if added_from_ai_suggestion else ['watchlisted_at'])
            user_movie = existing_entry
    else:
        # No existing entry - create new one
        logger.info(f"Creating new user_movie for user_id={supabase_user_uuid}, tconst={tconst}")
        user_movie = UserMovie.objects.create(
            user_id=supabase_user_uuid,
            tconst_id=tconst,
            watchlisted_at=timezone.now(),
            watchlist_deleted_at=None,
            watched_at=None,
            added_from_ai_suggestion=added_from_ai_suggestion
        )
        logger.info(f"Created new user_movie with id={user_movie.id}")

    # Fetch with related data for response
    platform_ids = _get_user_platform_ids(supabase_user_uuid)

    availability_prefetch = Prefetch(
        'tconst__availability_entries',
        queryset=MovieAvailability.objects.filter(
            platform_id__in=platform_ids
        ).select_related('platform'),
        to_attr='availability_filtered'
    )

    # Re-fetch the instance with all required prefetch/select_related
    user_movie = (
        UserMovie.objects
        .filter(id=user_movie.id)
        .select_related('tconst')
        .prefetch_related(availability_prefetch)
        .first()
    )

    return user_movie


@transaction.atomic
def add_movie_as_watched(*, user, tconst: str, added_from_ai_suggestion: bool = False):
    """Add or update a movie as watched without affecting watchlisted_at when not needed."""

    supabase_user_uuid = _resolve_user_uuid(user)

    logger.info(f"Marking movie as watched: user_id={supabase_user_uuid}, tconst={tconst}")

    if not Movie.objects.filter(tconst=tconst).exists():
        raise Movie.DoesNotExist(f"Movie with tconst '{tconst}' does not exist in database")

    existing_entry = UserMovie.objects.filter(
        user_id=supabase_user_uuid,
        tconst=tconst
    ).first()

    created = False

    if existing_entry:
        if existing_entry.watched_at is not None:
            raise ValueError("Movie is already marked as watched")

        update_fields = ['watched_at']
        existing_entry.watched_at = timezone.now()

        if existing_entry.watchlist_deleted_at is not None:
            existing_entry.watchlist_deleted_at = None
            update_fields.append('watchlist_deleted_at')

        if added_from_ai_suggestion:
            existing_entry.added_from_ai_suggestion = True
            update_fields.append('added_from_ai_suggestion')

        existing_entry.save(update_fields=update_fields)
        user_movie = existing_entry
    else:
        user_movie = UserMovie.objects.create(
            user_id=supabase_user_uuid,
            tconst_id=tconst,
            watchlisted_at=None,
            watchlist_deleted_at=None,
            watched_at=timezone.now(),
            added_from_ai_suggestion=added_from_ai_suggestion
        )
        created = True

    platform_ids = _get_user_platform_ids(supabase_user_uuid)

    availability_prefetch = Prefetch(
        'tconst__availability_entries',
        queryset=MovieAvailability.objects.filter(
            platform_id__in=platform_ids
        ).select_related('platform'),
        to_attr='availability_filtered'
    )

    user_movie = (
        UserMovie.objects
        .filter(id=user_movie.id)
        .select_related('tconst')
        .prefetch_related(availability_prefetch)
        .first()
    )

    return user_movie, created


@transaction.atomic
def update_user_movie(*, user, user_movie_id: int, action: str, rating: int | None = None):
    """Updates a user-movie entry.

    Actions:
    - mark_as_watched: Sets watched_at, soft-deletes from watchlist.
    - restore_to_watchlist: Clears watched_at, restores to watchlist.
    - rate_movie: Sets user_rating for a watched movie.
    """
    # Resolve canonical user UUID for the user
    supabase_user_uuid = _resolve_user_uuid(user)

    # Guard clause: Fetch the user_movie and ensure it belongs to authenticated user
    try:
        user_movie = UserMovie.objects.get(id=user_movie_id, user_id=supabase_user_uuid)
    except UserMovie.DoesNotExist:
        raise UserMovie.DoesNotExist(
            f"UserMovie with id {user_movie_id} not found or does not belong to user"
        )

    # Note: We don't check soft-deleted status here because business logic
    # for each action should determine the appropriate error message
    # (e.g., "must be on watchlist" for mark_as_watched)

    # Handle mark_as_watched action
    if action == 'mark_as_watched':
        # Precondition: Movie must be on watchlist (not soft-deleted) and NOT watched
        if user_movie.watchlisted_at is None or user_movie.watchlist_deleted_at is not None:
            raise ValueError("Movie must be on watchlist to mark as watched")
        if user_movie.watched_at is not None:
            raise ValueError("Movie is already marked as watched")

        # Update watched_at and soft-delete from watchlist
        now = timezone.now()
        user_movie.watched_at = now
        user_movie.watchlist_deleted_at = now
        user_movie.save(update_fields=['watched_at', 'watchlist_deleted_at'])

    # Handle restore_to_watchlist action
    elif action == 'restore_to_watchlist':
        # Precondition: Movie must be marked as watched
        if user_movie.watched_at is None:
            raise ValueError("Movie is not marked as watched, cannot restore to watchlist")

        # Clear watched_at and restore to watchlist (clear soft-delete)
        user_movie.watched_at = None
        user_movie.watchlist_deleted_at = None
        user_movie.save(update_fields=['watched_at', 'watchlist_deleted_at'])

    # Handle rate_movie action
    elif action == 'rate_movie':
        # Precondition: Movie must be marked as watched
        if user_movie.watched_at is None:
            raise ValueError("Movie must be watched to be rated")
        
        # Update user_rating
        user_movie.user_rating = rating
        user_movie.save(update_fields=['user_rating'])

    # Fetch with related data for response
    platform_ids = _get_user_platform_ids(supabase_user_uuid)

    availability_prefetch = Prefetch(
        'tconst__availability_entries',
        queryset=MovieAvailability.objects.filter(
            platform_id__in=platform_ids
        ).select_related('platform'),
        to_attr='availability_filtered'
    )

    # Re-fetch the instance with all required prefetch/select_related
    user_movie = (
        UserMovie.objects
        .filter(id=user_movie.id)
        .select_related('tconst')
        .prefetch_related(availability_prefetch)
        .first()
    )

    return user_movie


@transaction.atomic
def delete_user_movie_soft(*, user, user_movie_id: int):
    """Deletes a user-movie entry from watchlist or watched history.

    Business Logic:
    - Authorization: Ensures the user_movie belongs to the authenticated user
    - For watched movies (watched_at IS NOT NULL): Hard delete by setting watched_at to NULL
    - For watchlist movies (watched_at IS NULL): Soft delete by setting watchlist_deleted_at to current timestamp
    - Returns the updated UserMovie with full data (movie, availability)

    Args:
        user: The authenticated user object with `email` attribute
        user_movie_id: The ID of the user_movie entry to delete

    Returns:
        UserMovie: The updated user_movie instance with:
            - tconst (Movie) prefetched via select_related
            - availability_filtered prefetched for user's platforms

    Raises:
        UserMovie.DoesNotExist: If user_movie not found or doesn't belong to user
        Exception: If Supabase user not found
    """
    # Resolve canonical user UUID for the user
    supabase_user_uuid = _resolve_user_uuid(user)

    # Guard clause: Fetch the user_movie and ensure it belongs to authenticated user
    try:
        user_movie = UserMovie.objects.get(id=user_movie_id, user_id=supabase_user_uuid)
    except UserMovie.DoesNotExist:
        raise UserMovie.DoesNotExist(
            f"UserMovie with id {user_movie_id} not found or does not belong to user"
        )

    # Determine if movie is watched or on watchlist
    is_watched = user_movie.watched_at is not None
    
    if is_watched:
        # Hard delete from watched: set watched_at to NULL
        user_movie.watched_at = None
        user_movie.save(update_fields=['watched_at'])
    else:
        # Guard clause: Check if already soft-deleted (only for watchlist)
        if user_movie.watchlist_deleted_at is not None:
            raise UserMovie.DoesNotExist(
                f"UserMovie with id {user_movie_id} not found or does not belong to user"
            )
        
        # Soft delete from watchlist: set watchlist_deleted_at
        user_movie.watchlist_deleted_at = timezone.now()
        user_movie.save(update_fields=['watchlist_deleted_at'])

    # No response body needed for DELETE 204 in view → avoid extra re-fetch
    return user_movie


def build_on_vod_movies_queryset(*, platform_ids: list[int] | None = None):
    """Builds the queryset for listing movies available on VOD platforms.

    Returns unique movies that are available on at least one VOD platform,
    optionally filtered by specific platform IDs.

    Args:
        platform_ids: Optional list of platform IDs to filter by. If None, includes all platforms.

    Returns:
        QuerySet of Movie objects with prefetched availability data, ordered by latest availability.
    """
    # Base queryset: movies that have at least one availability record
    filter_platforms = platform_ids if platform_ids is not None else None

    if filter_platforms:
        # Filter by specific platforms
        availability_filter = MovieAvailability.objects.filter(
            tconst=OuterRef('tconst'),
            platform_id__in=filter_platforms,
            is_available=True
        )
    else:
        # Include all platforms - any movie with any availability
        availability_filter = MovieAvailability.objects.filter(
            tconst=OuterRef('tconst'),
            is_available=True
        )

    # Get movies that have availability on selected platforms
    queryset = Movie.objects.filter(Exists(availability_filter))

    # Prefetch availability data for the selected platforms
    if filter_platforms:
        availability_prefetch = Prefetch(
            'availability_entries',
            queryset=MovieAvailability.objects.filter(
                platform_id__in=filter_platforms,
                is_available=True
            ).select_related('platform'),
            to_attr='availability_filtered'
        )
    else:
        availability_prefetch = Prefetch(
            'availability_entries',
            queryset=MovieAvailability.objects.filter(
                is_available=True
            ).select_related('platform'),
            to_attr='availability_filtered'
        )

    # Apply prefetch and ordering
    queryset = queryset.prefetch_related(availability_prefetch)

    # Order by the maximum availability id (most recently added availability first)
    # This ensures consistent pagination and shows newest available movies first
    queryset = queryset.annotate(
        latest_availability_id=Max('availability_entries__id')
    ).order_by('-latest_availability_id')

    return queryset
