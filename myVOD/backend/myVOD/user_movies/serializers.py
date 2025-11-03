from rest_framework import serializers
from movies.models import Movie, MovieAvailability, UserMovie  # type: ignore


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
        fields = ["id", "movie", "availability", "watchlisted_at", "watched_at"]

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


class UserMovieQueryParamsSerializer(serializers.Serializer):
    """Validates query parameters for GET /api/user-movies/.

    - status: required, one of ['watchlist', 'watched']
    - ordering: optional, allow-listed fields
    - is_available: optional boolean (None if not provided)
    """

    status = serializers.ChoiceField(choices=["watchlist", "watched"], required=True)
    ordering = serializers.ChoiceField(
        choices=["-watchlisted_at", "-tconst__avg_rating"], required=False
    )
    is_available = serializers.BooleanField(required=False, allow_null=True, default=None)


class AddUserMovieCommandSerializer(serializers.Serializer):
    """Command serializer for adding a movie to user's watchlist.

    Corresponds to AddUserMovieCommand type in TypeScript.
    Validates that tconst is provided and has valid format.
    """
    tconst = serializers.RegexField(
        regex=r'^tt\d{7,8}$',
        required=True,
        error_messages={
            'required': 'tconst field is required',
            'invalid': 'Invalid tconst format. Expected format: tt followed by 7-8 digits (e.g., tt0816692)'
        }
    )
    mark_as_watched = serializers.BooleanField(required=False, default=False)
    added_from_ai_suggestion = serializers.BooleanField(required=False, default=False)


class UpdateUserMovieCommandSerializer(serializers.Serializer):
    """Command serializer for updating a user-movie entry (PATCH).

    Corresponds to UpdateUserMovieCommand type in TypeScript.
    Validates that action is one of the allowed values.
    """
    action = serializers.ChoiceField(
        choices=['mark_as_watched', 'restore_to_watchlist'],
        required=True,
        error_messages={
            'required': 'action field is required',
            'invalid_choice': 'Invalid action. Must be "mark_as_watched" or "restore_to_watchlist"'
        }
    )
