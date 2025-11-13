"""
Service layer for user registration operations.

This module contains business logic for creating new user accounts.
"""

import logging
from django.db import transaction, DatabaseError, IntegrityError
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)

User = get_user_model()


def register_user(email: str, password: str) -> dict:
    """
    Register a new user account.

    This function implements business logic for POST /api/register/
    Creates a new user with hashed password using Django's authentication system.

    Args:
        email: User's email address (must be unique, already validated)
        password: Plain text password (will be hashed, already validated)

    Returns:
        dict: Registered user data with structure:
            {
                'email': str
            }

    Raises:
        IntegrityError: If email uniqueness constraint is violated (race condition)
        DatabaseError: If database operation fails
        ValueError: If email or password is empty
    """
    # Guard clause: validate inputs
    if not email or not email.strip():
        raise ValueError("Email is required")

    if not password:
        raise ValueError("Password is required")

    # Normalize email to lowercase for consistency
    email = email.lower().strip()

    try:
        with transaction.atomic():
            # Check if user already exists (double-check for race conditions)
            if User.objects.filter(email=email).exists():
                logger.warning(
                    f"Attempt to register with existing email: {email}"
                )
                raise IntegrityError(
                    "Użytkownik o tym emailu już istnieje"
                )

            # Create user with hashed password using default auth user model
            # For default Django User, we also set username for compatibility
            user = User.objects.create_user(
                username=email,
                email=email,
                password=password
            )

            logger.info(
                f"Successfully registered new user: {email} (ID: {user.id})"
            )

            return {
                'email': user.email
            }

    except IntegrityError as e:
        logger.warning(
            f"Integrity error during user registration for {email}: {str(e)}"
        )
        # Re-raise as a more specific error for the view to handle
        raise IntegrityError("Użytkownik o tym emailu już istnieje")

    except DatabaseError as e:
        logger.error(
            f"Database error during user registration for {email}: {str(e)}",
            exc_info=True
        )
        raise
