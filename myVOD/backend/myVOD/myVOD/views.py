"""
Views for myVOD project root.
"""

import logging
from urllib.parse import urlencode
from django.shortcuts import redirect
from django.db import DatabaseError, IntegrityError
from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth import get_user_model
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.utils.encoding import force_str, force_bytes
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework_simplejwt.views import TokenObtainPairView
from drf_spectacular.utils import extend_schema
from drf_spectacular.types import OpenApiTypes
from django.http import StreamingHttpResponse
from movies.models import Platform
from .serializers import (
    EmailTokenObtainPairSerializer,
    PlatformSerializer,
    UserProfileSerializer,
    UpdateUserProfileSerializer,
    ChangePasswordSerializer,
    RegisterUserSerializer,
    RegisteredUserSerializer,
    AISuggestionsSerializer,
    PasswordResetSerializer,
    PasswordResetValidateSerializer,
    PasswordResetConfirmSerializer
)
from services.user_profile_service import (
    get_user_profile,
    update_user_platforms,
    change_user_password,
)
from services.user_registration_service import register_user
from services.ai_suggestions_service import (
    get_or_generate_suggestions,
    InsufficientDataError,
    RateLimitError
)
from services.availability_sync_service import AvailabilitySyncService


logger = logging.getLogger(__name__)


def root_redirect(request):
    """
    Redirect root URL to API documentation.

    Users visiting http://localhost:8000/ will be redirected to
    http://localhost:8000/api/docs/ (Swagger UI).
    """
    return redirect('swagger-ui')


class EmailTokenObtainPairView(TokenObtainPairView):
    """
    Custom JWT token obtain view that uses email instead of username.

    This view uses EmailTokenObtainPairSerializer to accept 'email' field
    for authentication instead of the default 'username' field.
    """
    serializer_class = EmailTokenObtainPairSerializer


class PlatformListView(APIView):
    """
    API view for retrieving all available VOD platforms.

    GET /api/platforms/

    This is a public endpoint (no authentication required).
    Returns a complete list of all VOD platforms available in the system.

    Returns:
        200: List of PlatformDto
        500: Internal server error

    Business Logic:
        - Public endpoint (no authentication)
        - Returns all platforms from database
        - Read-only data, primarily for display to users
        - No query parameters or filtering
    """
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Get all VOD platforms",
        description=(
            "Retrieves a list of all available VOD platforms. "
            "This is a public endpoint that does not require authentication. "
            "Returns platform information including id, slug, and display name."
        ),
        responses={
            200: PlatformSerializer(many=True),
            500: OpenApiTypes.OBJECT,
        },
        tags=['Platforms'],
    )
    def get(self, request):
        """
        Handle GET request for platforms list.

        Implements guard clauses for early error returns:
        1. Query database for all platforms
        2. Serialize and return results
        """
        try:
            # Query all platforms from database
            platforms = Platform.objects.all().order_by('id')

            # Serialize results
            serializer = PlatformSerializer(platforms, many=True)

            logger.info(
                f"Successfully returned {len(serializer.data)} platforms"
            )

            return Response(serializer.data, status=status.HTTP_200_OK)

        except DatabaseError as e:
            logger.error(
                f"Database error while fetching platforms: {str(e)}",
                exc_info=True
            )
            return Response(
                {"error": "An error occurred while retrieving platforms. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        except Exception as e:
            logger.error(
                f"Unexpected error while fetching platforms: {str(e)}",
                exc_info=True
            )
            return Response(
                {"error": "An unexpected error occurred. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class UserProfileView(APIView):
    """
    API view for retrieving, updating, and deleting user profile.

    GET /api/me/ - Retrieve current user's profile with selected platforms
    PATCH /api/me/ - Update current user's platform selections
    DELETE /api/me/ - Permanently delete current user's account (GDPR compliant)

    Authentication required for all operations.

    Returns:
        GET 200: UserProfileDto with email and platforms
        GET 401: Missing or invalid authentication
        GET 500: Internal server error

        PATCH 200: Updated UserProfileDto
        PATCH 400: Invalid platform IDs or malformed request
        PATCH 401: Missing or invalid authentication
        PATCH 500: Internal server error

        DELETE 204: Account deleted successfully
        DELETE 401: Missing or invalid authentication
        DELETE 500: Internal server error

    Business Logic:
        GET:
        - Returns authenticated user's email and selected platforms
        - Platforms fetched via user_platform join table

        PATCH:
        - Replaces user's current platform selections
        - Validates all platform IDs exist
        - Performs idempotent sync in a transaction
        - Deletes platforms not in request
        - Inserts missing platforms
        - Keeps existing unchanged

        DELETE:
        - Permanently deletes user account and all associated data
        - Uses CASCADE delete to remove related records
        - Operation is irreversible
        - Logs deletion for audit purposes
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Get current user profile",
        description=(
            "Retrieves the profile of the currently authenticated user, "
            "including their email and selected VOD platforms. "
            "Requires JWT authentication."
        ),
        responses={
            200: UserProfileSerializer,
            401: OpenApiTypes.OBJECT,
            500: OpenApiTypes.OBJECT,
        },
        tags=['User Profile'],
    )
    def get(self, request):
        """
        Handle GET request for user profile.

        Implements guard clauses for early error returns:
        1. User is already authenticated (permission class)
        2. Fetch user profile from service layer
        3. Serialize and return results
        """
        try:
            # Get user profile with platforms from service layer
            profile_data = get_user_profile(request.user)

            # Serialize response
            serializer = UserProfileSerializer(profile_data)

            return Response(serializer.data, status=status.HTTP_200_OK)

        except DatabaseError as e:
            logger.error(
                f"Database error while fetching user profile: {str(e)}",
                exc_info=True
            )
            return Response(
                {"error": "An error occurred while retrieving your profile. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        except Exception as e:
            logger.error(
                f"Unexpected error while fetching user profile: {str(e)}",
                exc_info=True
            )
            return Response(
                {"error": "An unexpected error occurred. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @extend_schema(
        summary="Update current user profile",
        description=(
            "Updates the profile of the currently authenticated user. "
            "Primarily used for managing VOD platform selections. "
            "Replaces current platform selections with the provided list. "
            "All changes are wrapped in a transaction for atomicity. "
            "Requires JWT authentication."
        ),
        request=UpdateUserProfileSerializer,
        responses={
            200: UserProfileSerializer,
            400: OpenApiTypes.OBJECT,
            401: OpenApiTypes.OBJECT,
            500: OpenApiTypes.OBJECT,
        },
        tags=['User Profile'],
    )
    def patch(self, request):
        """
        Handle PATCH request for updating user profile.

        Implements guard clauses for early error returns:
        1. User is already authenticated (permission class)
        2. Validate request data
        3. Update platforms via service layer
        4. Serialize and return updated profile
        """
        # Validate request data
        serializer = UpdateUserProfileSerializer(data=request.data)
        if not serializer.is_valid():
            logger.warning(
                f"Invalid PATCH request for user {request.user.email}: "
                f"{serializer.errors}"
            )
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Update user platforms via service layer
            platform_ids = serializer.validated_data['platforms']
            profile_data = update_user_platforms(request.user, platform_ids)

            # Serialize response
            response_serializer = UserProfileSerializer(profile_data)

            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except DatabaseError as e:
            logger.error(
                f"Database error while updating user profile: {str(e)}",
                exc_info=True
            )
            return Response(
                {"error": "An error occurred while updating your profile. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        except Exception as e:
            logger.error(
                f"Unexpected error while updating user profile: {str(e)}",
                exc_info=True
            )
            return Response(
                {"error": "An unexpected error occurred. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @extend_schema(
        summary="Delete current user account",
        description=(
            "Permanently deletes the authenticated user's account and all associated data. "
            "This operation is irreversible and complies with GDPR requirements. "
            "Requires JWT authentication."
        ),
        responses={
            204: None,
            401: OpenApiTypes.OBJECT,
            500: OpenApiTypes.OBJECT,
        },
        tags=['User Profile'],
    )
    def delete(self, request):
        """
        Handle DELETE request for user account deletion (GDPR compliant).

        Implements guard clauses for early error returns:
        1. User is already authenticated (permission class)
        2. Delete user account (cascades to all related data)
        3. Return 204 No Content
        """
        try:
            # Store user info for logging before deletion
            user_email = request.user.email
            user_id = request.user.id

            # Delete the user account (cascades to all related data)
            request.user.delete()

            logger.info(
                f"User account deleted successfully: {user_email} (ID: {user_id})"
            )

            return Response(status=status.HTTP_204_NO_CONTENT)

        except DatabaseError as e:
            logger.error(
                f"Database error while deleting user account {request.user.email}: {str(e)}",
                exc_info=True
            )
            return Response(
                {"error": "An error occurred while deleting your account. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        except Exception as e:
            logger.error(
                f"Unexpected error while deleting user account {request.user.email}: {str(e)}",
                exc_info=True
            )
            return Response(
                {"error": "An unexpected error occurred. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ChangePasswordView(APIView):
    """
    API view for changing user password.

    POST /api/me/change-password/

    Requires authentication (JWT token).
    Allows authenticated user to change their password by providing
    current password for verification and new password meeting security requirements.

    Returns:
        200: Success message
        400: Invalid current password, weak new password, or new password same as current
        401: Missing or invalid authentication
        500: Internal server error

    Business Logic:
        - Validates current password is correct
        - Validates new password meets security requirements (min 8 chars, letters and numbers)
        - Ensures new password is different from current password
        - Hashes new password using Django's authentication system
        - Updates user's password in database
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Change user password",
        description=(
            "Changes the password for the currently authenticated user. "
            "Requires current password for verification and new password "
            "meeting security requirements (min 8 chars, letters and numbers). "
            "New password must be different from current password. "
            "Requires JWT authentication."
        ),
        request=ChangePasswordSerializer,
        responses={
            200: OpenApiTypes.OBJECT,
            400: OpenApiTypes.OBJECT,
            401: OpenApiTypes.OBJECT,
            500: OpenApiTypes.OBJECT,
        },
        tags=['User Profile'],
    )
    def post(self, request):
        """
        Handle POST request for changing user password.

        Implements guard clauses for early error returns:
        1. User is already authenticated (permission class)
        2. Validate request data (current password, new password)
        3. Verify current password
        4. Update password via service layer
        5. Return success response
        """
        # Validate request data
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if not serializer.is_valid():
            logger.warning(
                f"Invalid password change request for user {request.user.email}: "
                f"{serializer.errors}"
            )
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Update password via service layer
            new_password = serializer.validated_data['new_password']
            change_user_password(request.user, new_password)
            
            logger.info(
                f"Successfully changed password for user {request.user.email}"
            )
            
            return Response(
                {"message": "Password changed successfully"},
                status=status.HTTP_200_OK
            )
        
        except ValueError as e:
            logger.warning(
                f"Value error while changing password for user {request.user.email}: {str(e)}"
            )
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except DatabaseError as e:
            logger.error(
                f"Database error while changing password for user {request.user.email}: {str(e)}",
                exc_info=True
            )
            return Response(
                {"error": "An error occurred while changing password. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            logger.error(
                f"Unexpected error while changing password for user {request.user.email}: {str(e)}",
                exc_info=True
            )
            return Response(
                {"error": "An unexpected error occurred. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class RegisterView(APIView):
    """
    API view for user registration.

    POST /api/register/

    This is a public endpoint (no authentication required).
    Creates a new user account with the provided email and password.

    Returns:
        201: RegisteredUserDto with email
        400: Invalid email format, weak password, or user already exists
        500: Internal server error

    Business Logic:
        - Validates email format
        - Enforces password policy: minimum 8 characters, must contain letters and numbers
        - Uses Django password validators
        - Hashes password using Django's authentication system
        - Creates user record with auto-generated UUID
        - User email must be unique
        - Returns only email in response (no sensitive data)
        - Does NOT automatically log in the user (user must call /api/token/)
    """
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Register a new user",
        description=(
            "Creates a new user account with the provided email and password. "
            "This is a public endpoint that does not require authentication. "
            "Password must be at least 8 characters and contain both letters and numbers. "
            "Email must be unique. "
            "After successful registration, user must call /api/token/ to obtain JWT tokens."
        ),
        request=RegisterUserSerializer,
        responses={
            201: RegisteredUserSerializer,
            400: OpenApiTypes.OBJECT,
            500: OpenApiTypes.OBJECT,
        },
        tags=['Authentication'],
    )
    def post(self, request):
        """
        Handle POST request for user registration.

        Implements guard clauses for early error returns:
        1. Validate request data (email format, password strength, email uniqueness)
        2. Register user via service layer
        3. Serialize and return response
        """
        # Validate request data
        serializer = RegisterUserSerializer(data=request.data)
        if not serializer.is_valid():
            logger.warning(
                f"Invalid registration request: {serializer.errors}"
            )
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Register user via service layer
            email = serializer.validated_data['email']
            password = serializer.validated_data['password']

            user_data = register_user(email, password)

            # Serialize response
            response_serializer = RegisteredUserSerializer(user_data)

            logger.info(f"Successfully registered user: {email}")

            return Response(
                response_serializer.data,
                status=status.HTTP_201_CREATED
            )

        except IntegrityError as e:
            # Handle race condition where user was created between validation and insertion
            logger.warning(
                f"Integrity error during registration: {str(e)}"
            )
            return Response(
                {"email": ["Użytkownik o tym emailu już istnieje"]},
                status=status.HTTP_400_BAD_REQUEST
            )

        except DatabaseError as e:
            logger.error(
                f"Database error during user registration: {str(e)}",
                exc_info=True
            )
            return Response(
                {"error": "An error occurred while creating your account. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        except Exception as e:
            logger.error(
                f"Unexpected error during user registration: {str(e)}",
                exc_info=True
            )
            return Response(
                {"error": "An unexpected error occurred. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AISuggestionsView(APIView):
    """
    API view for AI-powered movie suggestions.

    GET /api/suggestions/

    Generates or retrieves cached AI movie suggestions for the authenticated user.
    Rate limited to one suggestion batch per calendar day (server timezone).

    Optional query parameter: debug=true to bypass daily rate limiting and always generate new suggestions for testing.

    Returns:
        200: AISuggestionsDto with suggestions and expiration time
        401: Missing or invalid authentication
        404: User has no movies in watchlist or watched history
        429: User already received suggestions today
        500: Internal server error

    Business Logic:
        - Check for cached suggestions from today (same calendar date)
        - If cached suggestions exist, return them
        - If no cached suggestions:
          - Validate user has watchlist/watched movies (404 if empty)
          - Generate new suggestions using AI (Gemini API)
          - Cache suggestions with expiration at end of day (23:59:59)
          - Include availability for user's selected platforms
        - Rate limiting based on calendar date, not 24-hour rolling window
          - Example: Request at 15:00 on Oct 20 → next allowed at 00:00 on Oct 21
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Get AI movie suggestions",
        description=(
            "Generates or retrieves cached AI-powered movie suggestions based on "
            "the user's watchlist and watched history. "
            "Rate limited to one request per calendar day (server timezone). "
            "Suggestions expire at the end of the day (23:59:59) and new suggestions "
            "can be requested starting from the next day (00:00:00). "
            "Requires JWT authentication. "
            "Optional query parameter: debug=true to bypass daily rate limiting for testing purposes."
        ),
        responses={
            200: AISuggestionsSerializer,
            401: OpenApiTypes.OBJECT,
            404: OpenApiTypes.OBJECT,
            429: OpenApiTypes.OBJECT,
            500: OpenApiTypes.OBJECT,
        },
        tags=['AI Suggestions'],
    )
    def get(self, request):
        """
        Handle GET request for AI suggestions.

        Implements guard clauses for early error returns:
        1. User is already authenticated (permission class)
        2. Check for insufficient data (no watchlist/watched movies)
        3. Check rate limit (suggestions already generated today)
        4. Get or generate suggestions via service layer
        5. Serialize and return results
        """
        try:
            # Parse debug parameter from query params
            debug = request.query_params.get('debug', 'false').lower() == 'true'

            # Get or generate suggestions via service layer
            suggestions_data = get_or_generate_suggestions(request.user, debug=debug)

            # Serialize response
            serializer = AISuggestionsSerializer(suggestions_data)

            logger.info(
                f"Successfully returned {len(suggestions_data['suggestions'])} "
                f"suggestions for user {request.user.email}"
            )

            return Response(serializer.data, status=status.HTTP_200_OK)

        except InsufficientDataError as e:
            logger.warning(
                f"Insufficient data for user {request.user.email}: {str(e)}"
            )
            return Response(
                {"error": str(e)},
                status=status.HTTP_404_NOT_FOUND
            )

        except RateLimitError as e:
            logger.info(
                f"Rate limit exceeded for user {request.user.email}"
            )
            return Response(
                {"error": str(e)},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        except DatabaseError as e:
            logger.error(
                f"Database error while fetching suggestions for {request.user.email}: {str(e)}",
                exc_info=True
            )
            return Response(
                {"error": "An error occurred while generating suggestions. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        except Exception as e:
            logger.error(
                f"Unexpected error while fetching suggestions for {request.user.email}: {str(e)}",
                exc_info=True
            )
            return Response(
                {"error": "An unexpected error occurred. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PasswordResetView(APIView):
    """
    API view for password reset request.

    POST /api/password-reset/

    This is a public endpoint (no authentication required).
    Accepts email address and sends password reset link to the user.

    Returns:
        200: Success message (always returned for security - doesn't reveal if email exists)
        400: Invalid email format
        500: Internal server error
    """
    permission_classes = [AllowAny]
    authentication_classes: tuple = ()

    @extend_schema(
        summary="Request password reset",
        description=(
            "Initiates password reset process by sending an email with reset link. "
            "For security reasons, always returns success message even if email doesn't exist. "
            "This prevents email enumeration attacks. "
            "Requires valid email format."
        ),
        request=PasswordResetSerializer,
        responses={
            200: OpenApiTypes.OBJECT,
            400: OpenApiTypes.OBJECT,
            500: OpenApiTypes.OBJECT,
        },
        tags=['Authentication'],
    )
    def post(self, request):
        """
        Handle POST request for password reset.

        Always returns success for security reasons.
        """
        serializer = PasswordResetSerializer(data=request.data)
        if not serializer.is_valid():
            logger.warning(
                f"Invalid password reset request: {serializer.errors}"
            )
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        email = serializer.validated_data['email']

        try:
            # Try to find user by email
            User = get_user_model()
            try:
                user = User.objects.get(email=email, is_active=True)
                # Generate reset token and send email
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                token = default_token_generator.make_token(user)

                # Send email with reset link
                subject = "Resetowanie hasła - MyVOD"
                query_string = urlencode({"uid": uid, "token": token})
                reset_url = f"{settings.FRONTEND_URL}/auth/reset-password?{query_string}"

                logger.info(f"Generated reset URL: {reset_url}")

                context = {
                    'user': user,
                    'reset_url': reset_url,
                    'site_name': 'MyVOD',
                }

                message = render_to_string('password_reset_email.html', context)

                send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[email],
                    html_message=message,
                )

                logger.info(f"Password reset email sent to: {email}")

            except User.DoesNotExist:
                # Don't reveal if email exists or not
                logger.info(f"Password reset attempted for non-existent email: {email}")
                pass

            # Always return success for security
            return Response(
                {"message": "Jeśli podany adres email jest powiązany z kontem, otrzymasz wiadomość z linkiem do resetowania hasła."},
                status=status.HTTP_200_OK
            )

        except Exception as e:
            logger.error(
                f"Error sending password reset email to {email}: {str(e)}",
                exc_info=True
            )
            # Still return success to avoid revealing internal errors
            return Response(
                {"message": "Jeśli podany adres email jest powiązany z kontem, otrzymasz wiadomość z linkiem do resetowania hasła."},
                status=status.HTTP_200_OK
            )


class PasswordResetValidateView(APIView):
    """
    API view for password reset token validation.

    POST /api/password-reset/validate_token/

    This is a public endpoint (no authentication required).
    Validates that the reset token is valid and not expired.

    Returns:
        200: Token is valid
        400: Invalid token or user
        500: Internal server error
    """
    permission_classes = [AllowAny]
    authentication_classes: tuple = ()

    @extend_schema(
        summary="Validate password reset token",
        description=(
            "Validates that the password reset token is valid and not expired. "
            "Used by frontend to check if user can proceed with password reset."
        ),
        request=PasswordResetValidateSerializer,
        responses={
            200: OpenApiTypes.OBJECT,
            400: OpenApiTypes.OBJECT,
            500: OpenApiTypes.OBJECT,
        },
        tags=['Authentication'],
    )
    def post(self, request):
        """
        Handle POST request for token validation.
        """
        serializer = PasswordResetValidateSerializer(data=request.data)
        if not serializer.is_valid():
            logger.warning(
                f"Invalid token validation request: {serializer.errors}"
            )
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        uid = serializer.validated_data['uid']
        token = serializer.validated_data['token']

        logger.info(f"Validating reset token - uid: {uid}, token: {token}")

        try:
            # Decode user ID from base64
            try:
                logger.info(f"Attempting to decode uid: {uid}")
                user_id = force_str(urlsafe_base64_decode(uid))
                logger.info(f"Decoded user_id: {user_id}")
                User = get_user_model()
                user = User.objects.get(pk=user_id, is_active=True)
                logger.info(f"Found user: {user.email}")
            except (TypeError, ValueError, OverflowError, User.DoesNotExist) as e:
                logger.warning(f"Invalid user ID in password reset token: {uid}, error: {str(e)}")
                return Response(
                    {"error": "Nieprawidłowy link resetowania hasła."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check if token is valid
            if default_token_generator.check_token(user, token):
                logger.info(f"Valid password reset token for user: {user.email}")
                return Response(
                    {"message": "Token jest prawidłowy."},
                    status=status.HTTP_200_OK
                )
            else:
                logger.warning(f"Invalid password reset token for user: {user.email}")
                return Response(
                    {"error": "Link resetowania hasła jest nieprawidłowy lub wygasł."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        except Exception as e:
            logger.error(
                f"Error validating password reset token: {str(e)}",
                exc_info=True
            )
            return Response(
                {"error": "Wystąpił błąd podczas sprawdzania tokenu."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PasswordResetConfirmView(APIView):
    """
    API view for password reset confirmation.

    POST /api/password-reset/confirm/

    This is a public endpoint (no authentication required).
    Sets new password using validated reset token.

    Returns:
        200: Password changed successfully
        400: Invalid token, user, or password
        500: Internal server error
    """
    permission_classes = [AllowAny]
    authentication_classes: tuple = ()

    @extend_schema(
        summary="Confirm password reset",
        description=(
            "Sets new password using the validated reset token. "
            "Token must be valid and not expired. "
            "New password must meet security requirements."
        ),
        request=PasswordResetConfirmSerializer,
        responses={
            200: OpenApiTypes.OBJECT,
            400: OpenApiTypes.OBJECT,
            500: OpenApiTypes.OBJECT,
        },
        tags=['Authentication'],
    )
    def post(self, request):
        """
        Handle POST request for password reset confirmation.
        """
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if not serializer.is_valid():
            logger.warning(
                f"Invalid password reset confirmation request: {serializer.errors}"
            )
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        uid = serializer.validated_data['uid']
        token = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']

        logger.info(f"Confirming password reset - uid: {uid}, token length: {len(token) if token else 0}")

        try:
            # Decode user ID from base64
            try:
                logger.info(f"Attempting to decode uid for confirmation: {uid}")
                user_id = force_str(urlsafe_base64_decode(uid))
                logger.info(f"Decoded user_id for confirmation: {user_id}")
                User = get_user_model()
                user = User.objects.get(pk=user_id, is_active=True)
                logger.info(f"Found user for confirmation: {user.email}")
            except (TypeError, ValueError, OverflowError, User.DoesNotExist) as e:
                logger.warning(f"Invalid user ID in password reset confirmation: {uid}, error: {str(e)}")
                return Response(
                    {"error": "Nieprawidłowy link resetowania hasła."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check if token is valid
            if not default_token_generator.check_token(user, token):
                logger.warning(f"Invalid password reset token for user: {user.email}")
                return Response(
                    {"error": "Link resetowania hasła jest nieprawidłowy lub wygasł."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Set new password
            user.set_password(new_password)
            user.save()

            logger.info(f"Password successfully reset for user: {user.email}")

            return Response(
                {"message": "Hasło zostało pomyślnie zmienione."},
                status=status.HTTP_200_OK
            )

        except Exception as e:
            logger.error(
                f"Error confirming password reset: {str(e)}",
                exc_info=True
            )
            return Response(
                {"error": "Wystąpił błąd podczas ustawiania nowego hasła."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TriggerAvailabilitySyncView(APIView):
    """
    API view for triggering VOD availability synchronization tasks.

    POST /api/admin/tasks/trigger-availability-sync/

    This is an admin-only endpoint.
    Triggers a potentially long-running task to synchronize movie availability
    from an external API (e.g., Watchmode) with the local database.
    It streams the logs of the operation back to the client in real-time.
    """
    permission_classes = [IsAdminUser]

    @extend_schema(
        summary="Trigger VOD Availability Synchronization",
        description=(
            "Triggers a server-side task to synchronize movie availability for a "
            "specific VOD platform or all platforms. The server streams back "
            "logs in real-time. This is a long-running, admin-only operation. "
            "Use '__all__' in platform_slug to sync all platforms."
        ),
        request={"application/json": {"schema": {"type": "object", "properties": {"platform_slug": {"type": "string"}}}}},
        responses={
            200: {
                "description": "Log stream of the synchronization process.",
                "content": {"text/plain": {"schema": {"type": "string"}}}
            },
            400: OpenApiTypes.OBJECT,
            403: OpenApiTypes.OBJECT,
        },
        tags=['Admin'],
    )
    def post(self, request):
        """
        Handle POST request to start the synchronization task.
        """
        platform_slug = request.data.get('platform_slug')

        if not platform_slug:
            return Response(
                {"error": "platform_slug is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        service = AvailabilitySyncService()

        try:
            if platform_slug == '__all__':
                generator = service.sync_all_platforms()
            else:
                generator = service.sync_platform(platform_slug)

            response = StreamingHttpResponse(generator, content_type="text/plain")
            return response

        except Exception as e:
            logger.error(
                f"Unexpected error while triggering sync for '{platform_slug}': {str(e)}",
                exc_info=True
            )
            # This part might not be sent if headers are already sent,
            # but it's good practice to have it.
            return Response(
                {"error": f"An unexpected server error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
