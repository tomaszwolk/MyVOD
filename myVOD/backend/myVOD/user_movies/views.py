import logging
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from django.db import DatabaseError, IntegrityError
from movies.models import UserMovie, Movie  # type: ignore
from .serializers import (
    UserMovieSerializer,
    UserMovieQueryParamsSerializer,
    OnVODMovieSerializer,
    OnVODMoviesQueryParamsSerializer,
    CreateUserMovieCommandSerializer,
    UpdateUserMovieCommandSerializer
)
from services.user_movies_service import (  # type: ignore
    build_user_movies_queryset,
    build_on_vod_movies_queryset,
    add_user_movie,
    update_user_movie,
    delete_user_movie_soft
)

logger = logging.getLogger(__name__)

# Create your views here.


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class UserMovieViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing user's movies (watchlist and watched history).

    Endpoints:
        GET /api/user-movies/?status=watchlist - retrieve user's watchlist
        GET /api/user-movies/?status=watched - retrieve watched history
        POST /api/user-movies/ - add movie to watchlist

    Query Parameters (GET):
        - status (required): 'watchlist' or 'watched'
        - ordering (optional): '-watchlisted_at' or '-tconst__avg_rating'
        - is_available (optional): boolean to filter by availability

    Request Body (POST):
        - tconst (required): IMDb movie identifier (e.g., 'tt0816692')
    """
    serializer_class = UserMovieSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination  # Enable pagination

    # Enable GET, POST, PATCH, DELETE methods
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        # Fallback queryset; real queryset is constructed in list() after validation
        return UserMovie.objects.none()

    def list(self, request, *args, **kwargs):
        """
        List user's movies with filtering and ordering.

        Implements business logic:
        - Application-level filtering by authenticated user
        - Status filtering (watchlist vs watched)
        - Availability filtering (available/unavailable on user's platforms)
        - Ordering support

        Returns:
            200: List of UserMovieDto
            400: Invalid query parameters
            401: Not authenticated
            500: Internal server error
        """
        # Validate query parameters
        params = UserMovieQueryParamsSerializer(data=request.query_params)
        if not params.is_valid():
            logger.warning(
                f"Invalid query parameters for user {request.user.id}: {params.errors}"
            )
            return Response(params.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Use service layer for all queryset building
            queryset = build_user_movies_queryset(
                user=request.user,
                status_param=params.validated_data.get('status'),
                ordering_param=params.validated_data.get('ordering'),
                is_available=params.validated_data.get('is_available'),
                platform_ids=params.validated_data.get('platform_ids'),
                genres=params.validated_data.get('genres')
            )

            # Handle pagination
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)

            # Serialize and return response
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)

        except DatabaseError as e:
            logger.error(
                f"Database error while fetching user movies for user {request.user.id}: {str(e)}",
                exc_info=True
            )
            return Response(
                {"detail": "A database error occurred. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            logger.error(
                f"Unexpected error while fetching user movies for user {request.user.id}: {str(e)}",
                exc_info=True
            )
            return Response(
                {"detail": "An unexpected error occurred. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def create(self, request, *args, **kwargs):
        """
        Add a movie to user's watchlist or mark as watched.

        Implements business logic:
        - Validates tconst format and movie existence
        - Prevents duplicates (returns 409 if already on watchlist)
        - Supports soft-delete restoration
        - Returns full movie data with availability info

        Returns:
            201: Created - UserMovieDto with movie details and availability
            400: Bad Request - Invalid tconst format or movie doesn't exist
            401: Unauthorized - Not authenticated
            409: Conflict - Movie already on watchlist
            500: Internal Server Error - Unexpected error
        """
        # Validate request body
        command_serializer = CreateUserMovieCommandSerializer(data=request.data)
        if not command_serializer.is_valid():
            logger.warning(
                f"Invalid request body for POST user-movies (user {request.user.id}): {command_serializer.errors}"
            )
            return Response(command_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        tconst = command_serializer.validated_data['tconst']
        action = command_serializer.validated_data.get('action')
        rating = command_serializer.validated_data.get('rating')
        added_from_ai_suggestion = command_serializer.validated_data.get('added_from_ai_suggestion', False)

        try:
            user_movie, created = add_user_movie(
                user=request.user,
                tconst=tconst,
                action=action,
                rating=rating,
                added_from_ai_suggestion=added_from_ai_suggestion
            )
            status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
            
            # Serialize and return response
            serializer = self.get_serializer(user_movie)
            return Response(serializer.data, status=status_code)

        except Movie.DoesNotExist:
            logger.info(
                f"Movie not found for user {request.user.id}: {tconst}"
            )
            return Response(
                {"tconst": [f"Movie with tconst '{tconst}' does not exist in database"]},
                status=status.HTTP_400_BAD_REQUEST
            )

        except ValueError as e:
            logger.info(
                f"Business rule violation for user {request.user.id} during POST user-movies: {tconst} ({str(e)})"
            )
            return Response(
                {"detail": str(e)},
                status=status.HTTP_409_CONFLICT
            )

        except IntegrityError:
            # Handle race condition on unique (user_id, tconst)
            logger.info(
                f"IntegrityError (duplicate) when adding movie for user {request.user.id}: {tconst}"
            )
            return Response(
                {"detail": "Movie is already on the watchlist"},
                status=status.HTTP_409_CONFLICT
            )

        except DatabaseError as e:
            logger.error(
                f"Database error while adding movie to watchlist for user {request.user.id}: {str(e)}",
                exc_info=True
            )
            return Response(
                {"detail": "A database error occurred. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        except Exception as e:
            logger.error(
                f"Unexpected error while adding movie to watchlist for user {request.user.id}: {str(e)}",
                exc_info=True
            )
            return Response(
                {"detail": "An unexpected error occurred. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def update(self, request, pk=None, *args, **kwargs):
        """
        Update a user-movie entry (PATCH).

        Implements business logic:
        - Validates action parameter (mark_as_watched or restore_to_watchlist)
        - Ensures user can only update their own entries (IDOR protection)
        - Validates preconditions for each action
        - Returns updated movie with full details and availability

        Returns:
            200: OK - Updated UserMovieDto
            400: Bad Request - Invalid action or preconditions violated
            401: Unauthorized - Not authenticated
            404: Not Found - Entry not found or doesn't belong to user
            500: Internal Server Error - Unexpected error
        """
        # Validate request body
        command_serializer = UpdateUserMovieCommandSerializer(data=request.data)
        if not command_serializer.is_valid():
            logger.warning(
                f"Invalid request body for PATCH user-movies/{pk} (user {request.user.id}): {command_serializer.errors}"
            )
            return Response(command_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        action = command_serializer.validated_data['action']
        rating = command_serializer.validated_data.get('rating')

        try:
            # Use service layer for business logic
            user_movie = update_user_movie(
                user=request.user,
                user_movie_id=pk,
                action=action,
                rating=rating  # Pass rating to the service layer
            )

            # Serialize and return response
            serializer = self.get_serializer(user_movie)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except UserMovie.DoesNotExist:
            logger.info(
                f"User movie not found for user {request.user.id}: {pk}"
            )
            return Response(
                {"detail": f"User movie with id {pk} not found or does not belong to authenticated user"},
                status=status.HTTP_404_NOT_FOUND
            )

        except ValueError as e:
            # Business rule violation (precondition not met)
            logger.info(
                f"Business logic violation for user {request.user.id} updating user-movie {pk}: {str(e)}"
            )
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        except DatabaseError as e:
            logger.error(
                f"Database error while updating user-movie {pk} for user {request.user.id}: {str(e)}",
                exc_info=True
            )
            return Response(
                {"detail": "A database error occurred. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        except Exception as e:
            logger.error(
                f"Unexpected error while updating user-movie {pk} for user {request.user.id}: {str(e)}",
                exc_info=True
            )
            return Response(
                {"detail": "An unexpected error occurred. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def partial_update(self, request, *args, **kwargs):
        """
        Delegate PATCH requests to the same logic as update(),
        ensuring action-based updates are handled consistently.
        """
        return self.update(request, *args, **kwargs)

    def destroy(self, request, pk=None, *args, **kwargs):
        """
        Soft-delete a movie from user's watchlist (DELETE).

        Implements business logic:
        - Performs soft-delete by setting watchlist_deleted_at to current timestamp
        - Ensures user can only delete their own entries (IDOR protection)
        - Returns 204 No Content on success
        - Returns 404 if entry not found, belongs to another user, or already soft-deleted

        Returns:
            204: No Content - Soft-delete successful, no response body
            401: Unauthorized - Not authenticated
            404: Not Found - Entry not found, doesn't belong to user, or already deleted
            500: Internal Server Error - Unexpected error
        """
        try:
            # Use service layer for business logic
            delete_user_movie_soft(
                user=request.user,
                user_movie_id=pk
            )

            # Return 204 No Content (no response body)
            return Response(status=status.HTTP_204_NO_CONTENT)

        except UserMovie.DoesNotExist:
            logger.info(
                f"User movie not found for deletion by user {request.user.id}: {pk}"
            )
            return Response(
                {"detail": f"User movie with id {pk} not found or does not belong to authenticated user"},
                status=status.HTTP_404_NOT_FOUND
            )

        except ValueError as e:
            # Business rule violation (already soft-deleted or other precondition)
            logger.info(
                f"Business logic violation for user {request.user.id} deleting user-movie {pk}: {str(e)}"
            )
            return Response(
                {"detail": str(e)},
                status=status.HTTP_404_NOT_FOUND
            )

        except DatabaseError as e:
            logger.error(
                f"Database error while deleting user-movie {pk} for user {request.user.id}: {str(e)}",
                exc_info=True
            )
            return Response(
                {"detail": "A database error occurred. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        except Exception as e:
            logger.error(
                f"Unexpected error while deleting user-movie {pk} for user {request.user.id}: {str(e)}",
                exc_info=True
            )
            return Response(
                {"detail": "An unexpected error occurred. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class OnVODMoviesView(APIView):
    """
    API view for listing movies available on VOD platforms.

    GET /api/on-vod-movies/ - retrieve paginated list of movies available on VOD

    Query Parameters:
        - page: optional, pagination page number (default: 1)
        - platform_ids: optional, comma-separated list of platform IDs to filter by

    Returns:
        200: Paginated list of OnVODMovieDto
        400: Invalid query parameters
        401: Not authenticated
        500: Internal server error
    """
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get(self, request):
        """
        List movies available on VOD platforms with optional platform filtering.

        Implements business logic:
        - Returns unique movies available on at least one VOD platform
        - Optional filtering by specific platforms
        - Ordered by most recently added availability
        - Includes availability data for user's platforms

        Returns:
            200: Paginated list of OnVODMovieDto
            400: Invalid query parameters
            401: Not authenticated
            500: Internal server error
        """
        # Validate query parameters
        params = OnVODMoviesQueryParamsSerializer(data=request.query_params)
        if not params.is_valid():
            logger.warning(
                f"Invalid query parameters for on-vod-movies (user {request.user.id}): {params.errors}"
            )
            return Response(params.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Use service layer for queryset building
            queryset = build_on_vod_movies_queryset(
                user=request.user,
                platform_ids=params.validated_data.get('platform_ids'),
                ordering=params.validated_data.get('ordering', 'added_desc'),
                genres=params.validated_data.get('genres'),
                exclude_watched=params.validated_data.get('exclude_watched'),
                exclude_watchlisted=params.validated_data.get('exclude_watchlisted')
            )

            # Handle pagination
            paginator = self.pagination_class()
            page = paginator.paginate_queryset(queryset, request, view=self)
            if page is not None:
                serializer = OnVODMovieSerializer(page, many=True)
                return paginator.get_paginated_response(serializer.data)

            # Serialize and return response
            serializer = OnVODMovieSerializer(queryset, many=True)
            return Response(serializer.data)

        except DatabaseError as e:
            logger.error(
                f"Database error while fetching on-vod movies for user {request.user.id}: {str(e)}",
                exc_info=True
            )
            return Response(
                {"detail": "A database error occurred. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            logger.error(
                f"Unexpected error while fetching on-vod movies for user {request.user.id}: {str(e)}",
                exc_info=True
            )
            return Response(
                {"detail": "An unexpected error occurred. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
