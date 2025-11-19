from rest_framework import serializers
from movies.models import Movie, MovieAvailability, UserMovie  # type: ignore
from datetime import timedelta
from django.utils import timezone
from tasks.movie_tasks import update_movie_poster


class MovieSerializer(serializers.ModelSerializer):
    # avg_rating as string per API spec (not number)
    avg_rating = serializers.CharField(allow_null=True, read_only=True)

    class Meta:
        model = Movie
        fields = [
            "tconst",
            "primary_title",
            "start_year",
            "genres",
            "avg_rating",
            "poster_path",
        ]

    def to_representation(self, instance):
        """
        Serialize the movie instance and trigger poster update if needed.
        """
        representation = super().to_representation(instance)

        # Trigger poster update task if poster is missing or outdated
        needs_update = False
        if not instance.poster_path:
            needs_update = True
        elif instance.poster_last_checked:
            thirty_days_ago = timezone.now() - timedelta(days=30)
            if instance.poster_last_checked < thirty_days_ago:
                needs_update = True
        
        if needs_update:
            update_movie_poster.delay(instance.tconst)

        return representation


class MovieAvailabilitySerializer(serializers.ModelSerializer):
    platform_name = serializers.CharField(source="platform.platform_name")

    class Meta:
        model = MovieAvailability
        fields = ["platform_id", "platform_name", "is_available"]


class UserMovieSerializer(serializers.ModelSerializer):
    movie = MovieSerializer(source="tconst")
    availability = serializers.SerializerMethodField()

    class Meta:
        model = UserMovie
        fields = ["id", "movie", "availability", "watchlisted_at", "watched_at", "user_rating"]

    def get_availability(self, obj):
        """Get availability data from prefetched attribute or query directly."""
        # First try prefetched data
        availability_data = getattr(obj, 'availability_filtered', [])

        # If no prefetched data, try direct query as fallback
        if not availability_data:
            from movies.models import MovieAvailability
            availability_data = list(MovieAvailability.objects.filter(
                tconst=obj.tconst.tconst
            ).select_related('platform'))

        return MovieAvailabilitySerializer(availability_data, many=True).data


class OnVODMovieSerializer(serializers.Serializer):
    """Serializer for movies returned by /api/on-vod-movies/ endpoint.

    Returns the same structure as UserMovieSerializer but with:
    - id: always null (no user-movie relationship)
    - movie: full movie data
    - availability: filtered availability data
    - watchlisted_at, watched_at, user_rating: always null (no user context)
    """

    id = serializers.IntegerField(source="user_movie_id", read_only=True, allow_null=True)
    movie = MovieSerializer(source='*')
    availability = serializers.SerializerMethodField()
    watchlisted_at = serializers.DateTimeField(read_only=True, allow_null=True)
    watched_at = serializers.DateTimeField(read_only=True, allow_null=True)
    user_rating = serializers.IntegerField(read_only=True, allow_null=True)

    def get_availability(self, obj):
        """Get availability data from prefetched attribute."""
        # First try prefetched data
        availability_data = getattr(obj, 'availability_filtered', [])

        # If no prefetched data, try direct query as fallback
        if not availability_data:
            from movies.models import MovieAvailability
            availability_data = list(MovieAvailability.objects.filter(
                tconst=obj.tconst
            ).select_related('platform'))

        return MovieAvailabilitySerializer(availability_data, many=True).data


class UserMovieQueryParamsSerializer(serializers.Serializer):
    """Validates query parameters for GET /api/user-movies/.

    - status: required, one of ['watchlist', 'watched']
    - ordering: optional, allow-listed fields
    - is_available: optional boolean (None if not provided)
    - platform_ids: optional, comma-separated list of platform IDs to filter by
    - genres: optional, comma-separated list of genres to filter by
    """

    status = serializers.ChoiceField(choices=["watchlist", "watched"], required=False)
    ordering = serializers.ChoiceField(
        choices=[
            "-watchlisted_at",
            "-tconst__avg_rating",
            "-watched_at",
            "-user_rating",
            "-tconst__avg_rating",  # imdb_rating_desc / imdb_desc
            "-tconst__start_year",  # year_desc
            "tconst__start_year"    # year_asc
        ],
        required=False
    )
    is_available = serializers.BooleanField(required=False, allow_null=True, default=None)
    platform_ids = serializers.CharField(required=False, allow_blank=True)
    genres = serializers.CharField(required=False, allow_blank=True)

    def validate_platform_ids(self, value):
        """Validate and parse platform_ids parameter.

        Expects a comma-separated list of platform IDs (integers).
        Returns a list of integers, or None if empty.
        """
        if not value or value.strip() == "":
            return None

        try:
            # Parse comma-separated values
            platform_ids_str = [pid.strip() for pid in value.split(',') if pid.strip()]
            platform_ids = [int(pid) for pid in platform_ids_str]

            # Validate that all platform IDs exist
            from movies.models import Platform
            existing_ids = set(Platform.objects.values_list('id', flat=True))
            invalid_ids = [pid for pid in platform_ids if pid not in existing_ids]

            if invalid_ids:
                valid_ids_str = ", ".join(str(id) for id in sorted(existing_ids))
                raise serializers.ValidationError(
                    f"Invalid platform IDs: {invalid_ids}. Valid platform IDs: [{valid_ids_str}]"
                )

            return platform_ids

        except ValueError:
            raise serializers.ValidationError(
                f"Invalid platform_ids format. Expected comma-separated integers, got: {value}"
            )
            
    def validate_genres(self, value):
        """Validate and parse genres parameter."""
        if not value or value.strip() == "":
            return None
        
        genres_list = [genre.strip() for genre in value.split(',') if genre.strip()]
        
        from movies.models import Genre
        existing_genres = set(Genre.objects.values_list('name', flat=True))
        invalid_genres = [genre for genre in genres_list if genre not in existing_genres]

        if invalid_genres:
            raise serializers.ValidationError(f"Invalid genres: {', '.join(invalid_genres)}")

        return genres_list


class OnVODMoviesQueryParamsSerializer(serializers.Serializer):
    """Validates query parameters for GET /api/on-vod-movies/.

    - page: optional, pagination page number
    - platform_ids: optional, comma-separated list of platform IDs to filter by
    - ordering: optional, sort order for movies
    - genres: optional, comma-separated list of genres to filter by
    - exclude_watched: optional, boolean to exclude watched movies
    - exclude_watchlisted: optional, boolean to exclude watchlisted movies
    """

    page = serializers.IntegerField(min_value=1, required=False)
    platform_ids = serializers.CharField(required=False, allow_blank=True)
    ordering = serializers.ChoiceField(
        choices=["added_desc", "imdb_desc", "year_desc", "year_asc"],
        required=False,
        default="added_desc"
    )
    genres = serializers.CharField(required=False, allow_blank=True)
    exclude_watched = serializers.BooleanField(required=False, default=False)
    exclude_watchlisted = serializers.BooleanField(required=False, default=False)

    def validate_platform_ids(self, value):
        """Validate and parse platform_ids parameter.

        Expects a comma-separated list of platform IDs (integers).
        Returns a list of integers, or None if empty.
        """
        if not value or value.strip() == "":
            return None

        try:
            # Parse comma-separated values
            platform_ids_str = [pid.strip() for pid in value.split(',') if pid.strip()]
            platform_ids = [int(pid) for pid in platform_ids_str]

            # Validate that all platform IDs exist
            from movies.models import Platform
            existing_ids = set(Platform.objects.values_list('id', flat=True))
            invalid_ids = [pid for pid in platform_ids if pid not in existing_ids]

            if invalid_ids:
                valid_ids_str = ", ".join(str(id) for id in sorted(existing_ids))
                raise serializers.ValidationError(
                    f"Invalid platform IDs: {invalid_ids}. Valid platform IDs: [{valid_ids_str}]"
                )

            return platform_ids

        except ValueError:
            raise serializers.ValidationError(
                f"Invalid platform_ids format. Expected comma-separated integers, got: {value}"
            )

    def validate_genres(self, value):
        """Validate and parse genres parameter."""
        if not value or value.strip() == "":
            return None
        
        genres_list = [genre.strip() for genre in value.split(',') if genre.strip()]
        
        from movies.models import Genre
        existing_genres = set(Genre.objects.values_list('name', flat=True))
        invalid_genres = [genre for genre in genres_list if genre not in existing_genres]

        if invalid_genres:
            raise serializers.ValidationError(f"Invalid genres: {', '.join(invalid_genres)}")

        return genres_list


class CreateUserMovieCommandSerializer(serializers.Serializer):
    """Command serializer for adding a movie to user's lists.

    Corresponds to CreateUserMovieCommand type in TypeScript.
    Validates that tconst is provided and has valid format.
    Accepts optional action and rating.
    """
    tconst = serializers.RegexField(
        regex=r'^tt\d{7,8}$',
        required=True,
        error_messages={
            'required': 'tconst field is required',
            'invalid': 'Invalid tconst format. Expected format: tt followed by 7-8 digits (e.g., tt0816692)'
        }
    )
    action = serializers.ChoiceField(
        choices=['mark_as_watched'],
        required=False
    )
    rating = serializers.IntegerField(min_value=1, max_value=10, required=False)
    added_from_ai_suggestion = serializers.BooleanField(required=False, default=False)


class UpdateUserMovieCommandSerializer(serializers.Serializer):
    """Command serializer for updating a user-movie entry (PATCH).

    Corresponds to UpdateUserMovieCommand type in TypeScript.
    Validates that action is one of the allowed values.
    """
    action = serializers.ChoiceField(
        choices=['mark_as_watched', 'restore_to_watchlist', 'rate_movie'],
        required=True,
        error_messages={
            'required': 'action field is required',
            'invalid_choice': 'Invalid action. Must be "mark_as_watched", "restore_to_watchlist", or "rate_movie"'
        }
    )
    rating = serializers.IntegerField(min_value=1, max_value=10, required=False)

    def validate(self, attrs):
        """
        Check that rating is provided when action is 'rate_movie'.
        """
        if attrs.get('action') == 'rate_movie' and 'rating' not in attrs:
            raise serializers.ValidationError({"rating": "Rating is required when action is 'rate_movie'."})
        return attrs
