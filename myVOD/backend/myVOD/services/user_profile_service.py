"""
Service layer for user profile operations.

This module contains business logic for retrieving and updating user profiles,
including platform selections.
"""

import logging
from django.db import transaction, DatabaseError
from django.contrib.auth import get_user_model
from movies.models import Platform, UserPlatform
from services.user_movies_service import _resolve_user_uuid
import uuid

logger = logging.getLogger(__name__)

User = get_user_model()


def get_user_profile(user):
    """
    Retrieve user profile with selected platforms.

    This function implements business logic for GET /api/me/

    Args:
        user: Authenticated Django User instance

    Returns:
        dict: User profile data with structure:
            {
                'email': str,
                'platforms': [PlatformDto, ...],
                'is_staff': bool
            }

    Raises:
        DatabaseError: If database query fails
    """
    try:
        # Resolve canonical Supabase user UUID (works for both UUID and int ids)
        user_uuid_str = _resolve_user_uuid(user)
        user_uuid = uuid.UUID(str(user_uuid_str))

        # Get user's platform IDs
        user_platform_ids = UserPlatform.objects.filter(
            user_id=user_uuid
        ).values_list('platform_id', flat=True)

        # Fetch platform details
        platforms = Platform.objects.filter(
            id__in=user_platform_ids
        ).order_by('id')

        logger.info(
            f"Successfully retrieved profile for user {user.email} "
            f"with {len(platforms)} platforms"
        )

        return {
            'email': user.email,
            'platforms': list(platforms),
            'is_staff': getattr(user, 'is_staff', False),
        }

    except DatabaseError as e:
        logger.error(
            f"Database error while fetching user profile for {user.email}: {str(e)}",
            exc_info=True
        )
        raise


def update_user_platforms(user, platform_ids: list[int]):
    """
    Update user's platform selections.

    This function implements business logic for PATCH /api/me/
    Performs idempotent sync: deletes platforms not in the list,
    inserts missing platforms, keeps existing unchanged.

    All operations are wrapped in a single transaction to ensure
    atomicity and consistency.

    Args:
        user: Authenticated Django User instance
        platform_ids: List of platform IDs to associate with user

    Returns:
        dict: Updated user profile data with structure:
            {
                'email': str,
                'platforms': [PlatformDto, ...],
                'is_staff': bool
            }

    Raises:
        DatabaseError: If database operation fails
        ValueError: If platform_ids validation fails (should be caught by serializer)
    """
    try:
        with transaction.atomic():
            # Resolve canonical Supabase user UUID (works for both UUID and int ids)
            user_uuid_str = _resolve_user_uuid(user)
            user_uuid = uuid.UUID(str(user_uuid_str))

            # Get current user platforms
            current_platform_ids = set(
                UserPlatform.objects.filter(
                    user_id=user_uuid
                ).values_list('platform_id', flat=True)
            )

            new_platform_ids = set(platform_ids)

            # Determine what to delete and what to add
            to_delete = current_platform_ids - new_platform_ids
            to_add = new_platform_ids - current_platform_ids

            # Delete platforms not in the new list
            if to_delete:
                deleted_count = UserPlatform.objects.filter(
                    user_id=user_uuid,
                    platform_id__in=to_delete
                ).delete()[0]

                logger.info(
                    f"Deleted {deleted_count} platform associations for user {user.email}"
                )

            # Insert new platforms (row-by-row to preserve UUID typing)
            if to_add:
                for platform_id in to_add:
                    # Using create avoids UNNEST(text[]) casting issues with UUID
                    UserPlatform.objects.create(
                        user_id=user_uuid,
                        platform_id=platform_id
                    )

                logger.info(
                    f"Added {len(to_add)} platform associations for user {user.email}"
                )

            # Fetch updated platform details
            platforms = Platform.objects.filter(
                id__in=platform_ids
            ).order_by('id')

            logger.info(
                f"Successfully updated platforms for user {user.email} "
                f"to {len(platforms)} platforms"
            )

            return {
                'email': user.email,
                'platforms': list(platforms),
                'is_staff': getattr(user, 'is_staff', False),
            }

    except DatabaseError as e:
        logger.error(
            f"Database error while updating platforms for {user.email}: {str(e)}",
            exc_info=True
        )
        raise


def change_user_password(user, new_password: str) -> None:
    """
    Change user's password.

    This function implements business logic for POST /api/me/change-password/

    Args:
        user: Django User instance
        new_password: New password (already validated)

    Raises:
        ValueError: If password is empty
        Exception: If password update fails
    """
    if not new_password:
        raise ValueError("New password is required")
    
    try:
        # Set password (Django automatically hashes it)
        user.set_password(new_password)
        user.save(update_fields=['password'])
        
        logger.info(
            f"Successfully changed password for user {user.email}"
        )
    
    except Exception as e:
        logger.error(
            f"Error changing password for user {user.email}: {str(e)}",
            exc_info=True
        )
        raise