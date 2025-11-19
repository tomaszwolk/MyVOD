"""
Views for movies app.

This module contains API views for movie-related endpoints.
"""
import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db import DatabaseError
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample
from drf_spectacular.types import OpenApiTypes
from .serializers import (
    MovieSearchQueryParamsSerializer,
    MovieSearchResultSerializer,
    GenreSerializer,
)
from services.movie_search_service import search_movies  # type: ignore
from .models import Genre

logger = logging.getLogger(__name__)


class GenresView(APIView):
    """
    API view for retrieving a list of all movie genres.

    GET /api/genres/
    """
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Get all movie genres",
        description="Retrieves a list of all unique movie genres, sorted alphabetically.",
        responses={
            200: GenreSerializer(many=True),
            500: OpenApiTypes.OBJECT,
        },
        tags=['Movies'],
    )
    def get(self, request):
        """
        Handle GET request for genres.
        """
        try:
            genres = Genre.objects.order_by('name')
            serializer = GenreSerializer(genres, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error retrieving genres: {str(e)}", exc_info=True)
            return Response(
                {"error": "An error occurred while retrieving genres."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class MovieSearchView(APIView):
    """
    API view for searching movies.

    GET /api/movies/?search=<query>

    This is a public endpoint (no authentication required).
    Searches for movies using case-insensitive, accent-insensitive matching.

    Query Parameters:
        search (str, required): Search query for movie title

    Returns:
        200: List of MovieSearchResultDto
        400: Invalid or missing search parameter
        500: Internal server error

    Business Logic:
        - Public endpoint (no authentication)
        - Validates search parameter (required, min 1 character)
        - Uses PostgreSQL GIN index for efficient search
        - Returns movies ordered by similarity score
    """
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Search for movies",
        description=(
            "Search for movies by title using fuzzy matching. "
            "The search is case-insensitive and accent-insensitive. "
            "Results are ordered by similarity score, rating, and release year. "
            "This is a public endpoint that does not require authentication."
        ),
        parameters=[
            OpenApiParameter(
                name='search',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                required=True,
                description='Search query for movie title (min 1 character, max 255 characters)',
                examples=[
                    OpenApiExample(
                        'Search for Interstellar',
                        value='Interstellar',
                        description='Search for the movie "Interstellar"'
                    ),
                    OpenApiExample(
                        'Partial match',
                        value='Dark Knight',
                        description='Search with partial title'
                    ),
                    OpenApiExample(
                        'Case insensitive',
                        value='inception',
                        description='Search is case-insensitive'
                    ),
                ]
            ),
        ],
        responses={
            200: MovieSearchResultSerializer(many=True),
            400: OpenApiTypes.OBJECT,
            500: OpenApiTypes.OBJECT,
        },
        tags=['Movies'],
    )
    def get(self, request):
        """
        Handle GET request for movie search.

        Implements guard clauses for early error returns:
        1. Validate query parameters
        2. Perform search
        3. Serialize and return results
        """
        # Guard clause: Validate query parameters
        params_serializer = MovieSearchQueryParamsSerializer(data=request.query_params)
        if not params_serializer.is_valid():
            logger.warning(
                f"Invalid search parameters: {params_serializer.errors}"
            )
            return Response(
                params_serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        search_query = params_serializer.validated_data['search']

        try:
            # Use service layer for business logic (already serialized data)
            movies = search_movies(search_query)

            logger.info(
                f"Successfully returned {len(movies)} movies for search '{search_query}'"
            )

            return Response(movies, status=status.HTTP_200_OK)

        except DatabaseError as e:
            logger.error(
                f"Database error during movie search for query '{search_query}': {str(e)}",
                exc_info=True
            )
            return Response(
                {"error": "An error occurred while searching for movies. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        except Exception as e:
            logger.error(
                f"Unexpected error during movie search for query '{search_query}': {str(e)}",
                exc_info=True
            )
            return Response(
                {"error": "An unexpected error occurred. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
