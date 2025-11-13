"""
Custom serializers for myVOD project.
"""

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from movies.models import Platform

User = get_user_model()


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT serializer that uses email instead of username for authentication.

    This overrides the default TokenObtainPairSerializer to accept 'email'
    field instead of 'username' field, matching the PRD specification.
    """

    email = serializers.CharField(required=True)
    password = serializers.CharField(required=True)
    username_field = 'email'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Remove the default 'username' field
        if 'username' in self.fields:
            del self.fields['username']

    def validate(self, attrs):
        """
        Authenticate using email instead of username.
        """
        email = attrs.get('email')
        password: str = attrs.get('password') or ""

        # Authenticate using email; fallback to username if needed
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            try:
                user = User.objects.get(username=email)
            except User.DoesNotExist:
                raise serializers.ValidationError('Account not found or invalid credentials')

        if not user.check_password(password):
            raise serializers.ValidationError('Account not found or invalid credentials')

        # Check if user is active
        if not user.is_active:
            raise serializers.ValidationError(
                'User account is disabled'
            )

        # Issue tokens and add custom claims to both refresh and access
        refresh = RefreshToken.for_user(user)

        user_email: str = str(getattr(user, 'email', email))
        user_uuid: str = str(getattr(user, 'id'))  # Use Django users_user UUID

        # Add claims to both tokens
        access = refresh.access_token
        for token in (refresh, access):
            token['user_id'] = user_uuid
            token['email'] = user_email

        return {
            'access': str(access),
            'refresh': str(refresh)
        }


class PlatformSerializer(serializers.ModelSerializer):
    """
    Serializer for Platform model.

    This maps to PlatformDto on the frontend.
    Returns all platform information for public display.

    Fields:
        - id: Platform unique identifier
        - platform_slug: URL-friendly slug (e.g., "netflix")
        - platform_name: User-friendly name (e.g., "Netflix")
    """

    class Meta:
        model = Platform
        fields = ['id', 'platform_slug', 'platform_name']


class UserProfileSerializer(serializers.Serializer):
    """
    Serializer for user profile response.

    This maps to UserProfileDto on the frontend.
    Returns authenticated user's email, their selected VOD platforms, and is_staff flag.
    Staff flag indicates if user has admin dashboard access.

    Response for GET /api/me/
    """
    email = serializers.EmailField()
    platforms = PlatformSerializer(many=True, read_only=True)
    is_staff = serializers.BooleanField()


class UpdateUserProfileSerializer(serializers.Serializer):
    """
    Serializer for updating user profile.

    This maps to UpdateUserProfileCommand on the frontend.
    Validates the platform IDs provided in the request body.

    Request body for PATCH /api/me/
    """
    platforms = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=True,
        allow_empty=True,
        help_text="List of platform IDs to associate with the user"
    )

    def validate_platforms(self, value):
        """
        Validate that all platform IDs exist in the database.

        Args:
            value: List of platform IDs

        Returns:
            List of validated platform IDs

        Raises:
            ValidationError: If any platform ID doesn't exist
        """
        if not value:
            # Empty list is valid - user wants to remove all platforms
            return value

        # Check for duplicates
        if len(value) != len(set(value)):
            raise serializers.ValidationError(
                "Platform IDs must be unique"
            )

        # Verify all platform IDs exist
        existing_platform_ids = set(
            Platform.objects.filter(id__in=value).values_list('id', flat=True)
        )

        invalid_ids = set(value) - existing_platform_ids
        if invalid_ids:
            raise serializers.ValidationError(
                f"Invalid platform IDs: {sorted(invalid_ids)}"
            )

        return value


class ChangePasswordSerializer(serializers.Serializer):
    """
    Serializer for password change request.
    Validates current password and new password requirements.

    Request body for POST /api/me/change-password/
    """
    current_password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'},
        help_text="Current password for verification"
    )
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'},
        help_text="New password (minimum 8 characters, must contain letters and numbers)"
    )

    def validate_current_password(self, value):
        """Verify that current password is correct."""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate_new_password(self, value):
        """Validate new password meets security requirements."""
        user = self.context['request'].user
        # Use Django's password validators
        try:
            validate_password(value, user=user)
        except DjangoValidationError as e:
            # Convert Django ValidationError to DRF ValidationError
            raise serializers.ValidationError(list(e.messages))
        
        # Check if new password is different from current
        if user.check_password(value):
            raise serializers.ValidationError(
                "New password must be different from current password."
            )
        
        return value


class RegisterUserSerializer(serializers.Serializer):
    """
    Serializer for user registration request.

    This maps to RegisterUserCommand on the frontend.
    Validates email format and password strength requirements.

    Request body for POST /api/register/

    Password Requirements:
        - Minimum 8 characters
        - Must contain both letters and numbers
        - Must not be too similar to user attributes
        - Must not be a commonly used password
    """
    email = serializers.EmailField(
        required=True,
        help_text="User's email address (must be unique)"
    )
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'},
        help_text="Password (minimum 8 characters, must contain letters and numbers)"
    )

    def validate_email(self, value):
        """
        Validate that email is unique.

        Args:
            value: Email address to validate

        Returns:
            Validated email address (normalized to lowercase)

        Raises:
            ValidationError: If email already exists
        """
        # Normalize email to lowercase for consistency
        email = value.lower()

        # Check if email already exists
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError(
                "Użytkownik o tym emailu już istnieje"
            )

        return email

    def validate_password(self, value):
        """
        Validate password meets security requirements.

        Uses Django's password validation framework to enforce:
        - Minimum length (8 characters)
        - Contains letters and numbers
        - Not too similar to user attributes
        - Not a commonly used password

        Args:
            value: Password to validate

        Returns:
            Validated password

        Raises:
            ValidationError: If password doesn't meet requirements
        """
        try:
            # Use Django's password validators
            # Note: We pass None for user since user doesn't exist yet
            validate_password(value, user=None)
        except DjangoValidationError as e:
            # Convert Django ValidationError to DRF ValidationError
            raise serializers.ValidationError(list(e.messages))

        return value


class RegisteredUserSerializer(serializers.Serializer):
    """
    Serializer for user registration response.

    This maps to RegisteredUserDto on the frontend.
    Returns only non-sensitive user information after successful registration.

    Response for POST /api/register/
    """
    email = serializers.EmailField(
        read_only=True,
        help_text="Registered user's email address"
    )


class MovieAvailabilitySerializer(serializers.Serializer):
    """
    Serializer for movie availability on a specific platform.

    This maps to MovieAvailabilityDto on the frontend.
    Used in AI suggestions and user movie responses.

    Fields:
        - platform_id: Platform unique identifier
        - platform_name: User-friendly platform name
        - is_available: Boolean indicating if movie is available on this platform
    """
    platform_id = serializers.IntegerField()
    platform_name = serializers.CharField()
    is_available = serializers.BooleanField()


class SuggestionItemSerializer(serializers.Serializer):
    """
    Serializer for a single AI-generated movie suggestion.

    This maps to SuggestionItemDto on the frontend.
    Nested within AISuggestionsSerializer.

    Fields:
        - tconst: IMDb movie identifier
        - primary_title: Movie title
        - start_year: Release year
        - justification: AI-generated reason for the suggestion
        - availability: List of platform availability information
    """
    tconst = serializers.CharField()
    primary_title = serializers.CharField()
    start_year = serializers.IntegerField(allow_null=True)
    poster_path = serializers.CharField(allow_null=True, required=False)
    genres = serializers.ListField(child=serializers.CharField(), required=False)
    justification = serializers.CharField()
    availability = MovieAvailabilitySerializer(many=True)


class AISuggestionsSerializer(serializers.Serializer):
    """
    Serializer for AI movie suggestions response.

    This maps to AISuggestionsDto on the frontend.
    Returns a batch of AI-generated movie suggestions with expiration time.

    Response for GET /api/suggestions/

    Fields:
        - expires_at: ISO 8601 timestamp when suggestions expire (end of day)
        - suggestions: List of suggested movies with justifications and availability
    """
    expires_at = serializers.DateTimeField()
    suggestions = SuggestionItemSerializer(many=True)


class PasswordResetSerializer(serializers.Serializer):
    """
    Serializer for password reset request.

    This maps to ForgotPasswordCommand on the frontend.
    Accepts email address to send password reset link.

    Request body for POST /api/password-reset/
    """
    email = serializers.EmailField(
        required=True,
        help_text="Email address for password reset"
    )

    def validate_email(self, value):
        """
        Validate that user with this email exists.
        We don't want to reveal if email exists or not for security reasons,
        so we don't raise validation error here - just return the email.
        """
        return value.lower()


class PasswordResetValidateSerializer(serializers.Serializer):
    """
    Serializer for password reset token validation.

    This maps to ValidateResetTokenCommand on the frontend.
    Validates that the reset token is valid and not expired.

    Request body for POST /api/password-reset/validate_token/
    """
    uid = serializers.CharField(
        required=True,
        help_text="User ID encoded in base64"
    )
    token = serializers.CharField(
        required=True,
        help_text="Password reset token"
    )


class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    Serializer for password reset confirmation.

    This maps to ResetPasswordConfirmCommand on the frontend.
    Sets new password using the validated reset token.

    Request body for POST /api/password-reset/confirm/
    """
    uid = serializers.CharField(
        required=True,
        help_text="User ID encoded in base64"
    )
    token = serializers.CharField(
        required=True,
        help_text="Password reset token"
    )
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'},
        help_text="New password (minimum 8 characters, must contain letters and numbers)"
    )

    def validate_new_password(self, value):
        """
        Validate new password meets security requirements.
        """
        try:
            # Use Django's password validators (user doesn't exist yet in this context)
            validate_password(value, user=None)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))

        return value