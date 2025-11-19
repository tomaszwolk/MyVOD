import logging
import uuid

from django.db import transaction
from django.db.models import Exists, OuterRef, Prefetch, Max, Subquery
from django.db.models.functions import Coalesce
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
        platform_ids: Optional list of platform IDs to filter availability by.
            If None, uses user's platforms.
    """

    # Resolve canonical user UUID (custom user model has UUID id)
    supabase_user_uuid = _resolve_user_uuid(user)

    # Use provided platform_ids or fall back to user's platforms
    filter_platform_ids = (
        platform_ids if platform_ids is not None
        else _get_user_platform_ids(supabase_user_uuid)
    )

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

        # If platform_ids is specified but is_available is not, filter by availability on selected platforms
    if platform_ids is not None and len(platform_ids) > 0:
        # Filter to movies available on at least one of the selected platforms
        available_on_selected = MovieAvailability.objects.filter(
            tconst=OuterRef('tconst'),
            platform_id__in=filter_platform_ids,
            is_available=True,
        )
        queryset = queryset.filter(Exists(available_on_selected))

    # Handle ordering parameter
    if ordering_param:
        # Handle user rating sorting with NULL handling
        if ordering_param == '-user_rating':
            queryset = queryset.order_by(Coalesce('user_rating', -1).desc())
        else:
            queryset = queryset.order_by(ordering_param)
    else:
        # Default ordering to ensure consistent pagination results
        if status_param == 'watchlist':
            queryset = queryset.order_by('-watchlisted_at')
        elif status_param == 'watched':
            queryset = queryset.order_by('-watched_at')

    return queryset


@transaction.atomic
def add_user_movie(*, user, tconst: str, action: str | None, rating: int | None, added_from_ai_suggestion: bool = False):
    """Adds or updates a user-movie entry based on provided action.

    Business Logic:
    - Validates that the movie exists.
    - Finds or creates a UserMovie entry.
    - If rating is provided, marks as watched and sets the rating.
    - If action is 'mark_as_watched', marks as watched.
    - Otherwise, adds to watchlist (or restores a soft-deleted entry).
    - Returns the final UserMovie instance with prefetched data.
    """
    supabase_user_uuid = _resolve_user_uuid(user)
    logger.info(f"Adding/updating movie: user_id={supabase_user_uuid}, tconst={tconst}, action={action}, rating={rating}")

    if not Movie.objects.filter(tconst=tconst).exists():
        raise Movie.DoesNotExist(f"Movie with tconst '{tconst}' does not exist in database")

    user_movie, created = UserMovie.objects.get_or_create(
        user_id=supabase_user_uuid,
        tconst_id=tconst,
        defaults={
            'added_from_ai_suggestion': added_from_ai_suggestion
        }
    )

    update_fields = []
    
    if rating is not None:
        if user_movie.watched_at is None:
            user_movie.watched_at = timezone.now()
            update_fields.append('watched_at')
        user_movie.user_rating = rating
        update_fields.append('user_rating')

    elif action == 'mark_as_watched':
        if user_movie.watched_at is not None:
            # Movie is already watched, do nothing or return a specific status
            pass
        else:
            user_movie.watched_at = timezone.now()
            update_fields.append('watched_at')

    else:  # Default action: add to watchlist
        if user_movie.watchlisted_at is not None and user_movie.watchlist_deleted_at is None:
            raise ValueError("Movie is already on the watchlist")
        
        user_movie.watchlisted_at = timezone.now()
        user_movie.watchlist_deleted_at = None
        update_fields.extend(['watchlisted_at', 'watchlist_deleted_at'])

    if added_from_ai_suggestion and not created:
        user_movie.added_from_ai_suggestion = True
        update_fields.append('added_from_ai_suggestion')

    if update_fields:
        user_movie.save(update_fields=update_fields)

    # Fetch with related data for response
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
        # Hard delete from watched: set watched_at and user_rating to NULL
        user_movie.watched_at = None
        user_movie.user_rating = None
        user_movie.save(update_fields=['watched_at', 'user_rating'])
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


def build_on_vod_movies_queryset(*, user, platform_ids: list[int] | None = None, ordering: str = "added_desc"):
    """Builds the queryset for listing movies available on VOD platforms.

    Returns unique movies that are available on at least one VOD platform,
    optionally filtered by specific platform IDs. It also annotates user-specific
    data like watchlist status and rating.

    Args:
        user: The authenticated user object.
        platform_ids: Optional list of platform IDs to filter by. If None, includes all platforms.
        ordering: Sort order for movies. Defaults to "added_desc".

    Returns:
        QuerySet of Movie objects with prefetched availability data and user data,
        ordered by specified criteria.
    """
    supabase_user_uuid = _resolve_user_uuid(user)

    # Subquery to get user-specific data for each movie
    user_movie_subquery = UserMovie.objects.filter(
        user_id=supabase_user_uuid,
        tconst=OuterRef('tconst')
    )

    # Subquery for active watchlist entries only
    active_watchlist_subquery = user_movie_subquery.filter(
        watchlist_deleted_at__isnull=True
    )

    # Base queryset: movies annotated with user data
    queryset = Movie.objects.annotate(
        user_movie_id=Subquery(user_movie_subquery.values('id')[:1]),
        watchlisted_at=Subquery(active_watchlist_subquery.values('watchlisted_at')[:1]),
        watched_at=Subquery(user_movie_subquery.values('watched_at')[:1]),
        user_rating=Subquery(user_movie_subquery.values('user_rating')[:1]),
    )

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
    queryset = queryset.filter(Exists(availability_filter))

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

    # Apply ordering based on parameter
    if ordering == "added_desc":
        # Order by the maximum availability id (most recently added availability first)
        queryset = queryset.annotate(
            latest_availability_id=Max('availability_entries__id')
        ).order_by('-latest_availability_id')
    elif ordering == "imdb_desc":
        queryset = queryset.order_by(Coalesce('avg_rating', -1).desc())
    elif ordering == "year_desc":
        queryset = queryset.order_by(Coalesce('start_year', 0).desc())
    elif ordering == "year_asc":
        queryset = queryset.order_by(Coalesce('start_year', 9999))

    return queryset
