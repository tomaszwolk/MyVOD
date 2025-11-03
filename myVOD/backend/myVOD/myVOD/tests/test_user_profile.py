"""
Integration tests for user profile API endpoints.

Tests the full request-response cycle for GET /api/me/ and PATCH /api/me/ endpoints.
"""
import os
import uuid
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.db import DatabaseError
from django.urls import reverse
from rest_framework.test import APIClient, APITestCase
from rest_framework import status

from movies.models import Platform, UserPlatform
from dotenv import load_dotenv

load_dotenv()

User = get_user_model()


class UserProfileGetAPITests(APITestCase):
    """
    Integration tests for GET /api/me/ endpoint.

    Tests cover:
    - Successful retrieval of user profile (200)
    - Authentication required (401)
    - Response structure validation
    - User with platforms
    - User without platforms
    - Database errors (500)
    """

    def setUp(self):
        """
        Set up test data for each test.

        Creates mock users and test platforms.
        """
        # Clean up first
        self.test_user_id = uuid.UUID(os.getenv("TEST_USER", str(uuid.uuid4())))
        self.test_user2_id = uuid.UUID(os.getenv("TEST_USER_2", str(uuid.uuid4())))

        # Clean up any leftover data
        UserPlatform.objects.filter(user_id=self.test_user_id).delete()
        UserPlatform.objects.filter(user_id=self.test_user2_id).delete()

        # Get or create test user with UUID
        self.user, _ = User.objects.get_or_create(
            id=self.test_user_id,
            defaults={
                "username": f"profile_user_{self.test_user_id.hex[:8]}",
                "email": "test@example.com",
            }
        )
        if not self.user.has_usable_password():
            self.user.set_password("testpass")
            self.user.save()
        self.user.refresh_from_db()

        # Get or create second test user
        self.user2, _ = User.objects.get_or_create(
            id=self.test_user2_id,
            defaults={
                "username": f"profile_user_2_{self.test_user2_id.hex[:8]}",
                "email": "test2@example.com",
            }
        )
        if not self.user2.has_usable_password():
            self.user2.set_password("testpass")
            self.user2.save()
        self.user2.refresh_from_db()

        self.client = APIClient()

        # Create second test user
        self.platform1, _ = Platform.objects.get_or_create(
            platform_slug="test-netflix-profile",
            defaults={'platform_name': "Test Netflix"}
        )
        self.platform2, _ = Platform.objects.get_or_create(
            platform_slug="test-hbo-profile",
            defaults={'platform_name': "Test HBO"}
        )
        self.platform3, _ = Platform.objects.get_or_create(
            platform_slug="test-disney-profile",
            defaults={'platform_name': "Test Disney+"}
        )

        # Associate platforms with test user
        UserPlatform.objects.get_or_create(
            user_id=self.user.id,
            platform_id=self.platform1.id
        )
        UserPlatform.objects.get_or_create(
            user_id=self.user.id,
            platform_id=self.platform2.id
        )

    def test_get_user_profile_success(self):
        """Test successful retrieval of user profile with platforms."""
        url = reverse('user-profile')

        # Authenticate request using DRF's force_authenticate
        self.client.force_authenticate(user=self.user)
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('email', response.data)
        self.assertIn('platforms', response.data)
        self.assertIn('is_staff', response.data)
        self.assertEqual(response.data['email'], self.user.email)
        self.assertIsInstance(response.data['platforms'], list)
        self.assertIsInstance(response.data['is_staff'], bool)
        self.assertEqual(response.data['is_staff'], getattr(self.user, 'is_staff', False))

    def test_get_user_profile_response_structure(self):
        """Test that response has correct structure matching UserProfileDto."""
        url = reverse('user-profile')

        # Authenticate request
        self.client.force_authenticate(user=self.user)
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify top-level fields
        self.assertIn('email', response.data)
        self.assertIn('platforms', response.data)
        self.assertIn('is_staff', response.data)
        self.assertEqual(set(response.data.keys()), {'email', 'platforms', 'is_staff'})

        # Verify field types
        self.assertIsInstance(response.data['email'], str)
        self.assertIsInstance(response.data['platforms'], list)
        self.assertIsInstance(response.data['is_staff'], bool)

        # Verify platform structure if platforms exist
        if len(response.data['platforms']) > 0:
            platform = response.data['platforms'][0]
            self.assertIn('id', platform)
            self.assertIn('platform_slug', platform)
            self.assertIn('platform_name', platform)
            self.assertEqual(set(platform.keys()), {'id', 'platform_slug', 'platform_name'})

    def test_get_user_profile_with_platforms(self):
        """Test retrieval of user profile with multiple platforms."""
        url = reverse('user-profile')

        self.client.force_authenticate(user=self.user)
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'test@example.com')

        # User should have 2 platforms
        platforms = response.data['platforms']
        self.assertEqual(len(platforms), 2)

        # Verify platform IDs
        platform_ids = [p['id'] for p in platforms]
        self.assertIn(self.platform1.id, platform_ids)
        self.assertIn(self.platform2.id, platform_ids)

        # Verify platforms are ordered by id
        self.assertEqual(platform_ids, sorted(platform_ids))

    def test_get_user_profile_without_platforms(self):
        """Test retrieval of user profile with no platforms."""
        url = reverse('user-profile')

        # Use user2 who has no platforms
        self.client.force_authenticate(user=self.user2)
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'test2@example.com')
        self.assertEqual(response.data['platforms'], [])

    def test_get_user_profile_requires_authentication(self):
        """Test that endpoint requires authentication."""
        url = reverse('user-profile')

        # Make request without authentication
        self.client.force_authenticate(user=None)
        response = self.client.get(url)

        # Should return 401 Unauthorized
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_user_profile_only_accepts_get_and_patch(self):
        """Test that endpoint only accepts GET and PATCH methods."""
        url = reverse('user-profile')
        self.client.force_authenticate(user=self.user)

        # POST should not be allowed
        response = self.client.post(url, {})
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

        # PUT should not be allowed
        response = self.client.put(url, {})
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

        # DELETE should not be allowed
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_get_user_profile_database_error(self):
        """Test handling of database errors."""
        url = reverse('user-profile')
        self.client.force_authenticate(user=self.user)

        with patch('services.user_profile_service.UserPlatform.objects.filter',
                   side_effect=DatabaseError("DB connection lost")):
            response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn('error', response.data)

    def tearDown(self):
        """Clean up test data."""
        from django.db import connection, transaction

        # If we're in a broken transaction, roll it back
        if connection.in_atomic_block and transaction.get_rollback():
            transaction.set_rollback(False)
            connection.needs_rollback = False

        try:
            # Clean up user platforms created during tests but keep users
            UserPlatform.objects.filter(user_id=self.user.id).delete()
            UserPlatform.objects.filter(user_id=self.user2.id).delete()
            # Note: We don't delete users to avoid conflicts with TEST_USER UUIDs
        except Exception as e:
            # If cleanup fails, log but don't fail the test
            print(f"Warning: tearDown cleanup failed: {e}")


class UserProfilePatchAPITests(APITestCase):
    """
    Integration tests for PATCH /api/me/ endpoint.

    Tests cover:
    - Successful update of platforms (200)
    - Authentication required (401)
    - Invalid platform IDs (400)
    - Empty platforms list (200)
    - Duplicate platform IDs (400)
    - Idempotent behavior
    - Transaction rollback on error
    """

    def setUp(self):
        """
        Set up test data for each test.

        Creates mock users and test platforms.
        """
        # Clean up first
        self.test_user_id = uuid.UUID(os.getenv("TEST_USER", str(uuid.uuid4())))
        UserPlatform.objects.filter(user_id=self.test_user_id).delete()

        # Get or create test user
        self.user, _ = User.objects.get_or_create(
            id=self.test_user_id,
            defaults={
                "username": f"profile_patch_{self.test_user_id.hex[:8]}",
                "email": "test@example.com",
            }
        )
        if not self.user.has_usable_password():
            self.user.set_password("testpass")
            self.user.save()
        self.user.refresh_from_db()

        self.client = APIClient()

        # Create test platforms
        self.platform1, _ = Platform.objects.get_or_create(
            platform_slug="test-netflix-patch",
            defaults={'platform_name': "Test Netflix"}
        )
        self.platform2, _ = Platform.objects.get_or_create(
            platform_slug="test-hbo-patch",
            defaults={'platform_name': "Test HBO"}
        )
        self.platform3, _ = Platform.objects.get_or_create(
            platform_slug="test-disney-patch",
            defaults={'platform_name': "Test Disney+"}
        )

        # Associate initial platforms with user
        UserPlatform.objects.get_or_create(
            user_id=self.user.id,
            platform_id=self.platform1.id
        )

    def test_patch_user_profile_add_platforms(self):
        """Test adding new platforms to user profile."""
        url = reverse('user-profile')
        self.client.force_authenticate(user=self.user)

        # Add platform2 and platform3
        data = {'platforms': [self.platform1.id, self.platform2.id, self.platform3.id]}
        response = self.client.patch(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'test@example.com')
        self.assertEqual(len(response.data['platforms']), 3)

        # Verify platforms in database
        user_platform_ids = set(
            UserPlatform.objects.filter(user_id=self.user.id).values_list('platform_id', flat=True)
        )
        self.assertEqual(user_platform_ids, {self.platform1.id, self.platform2.id, self.platform3.id})

    def test_patch_user_profile_remove_platforms(self):
        """Test removing platforms from user profile."""
        url = reverse('user-profile')
        self.client.force_authenticate(user=self.user)

        # Add some platforms first
        UserPlatform.objects.get_or_create(user_id=self.user.id, platform_id=self.platform2.id)
        UserPlatform.objects.get_or_create(user_id=self.user.id, platform_id=self.platform3.id)

        # Now remove platform2 and platform3, keep only platform1
        data = {'platforms': [self.platform1.id]}
        response = self.client.patch(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['platforms']), 1)
        self.assertEqual(response.data['platforms'][0]['id'], self.platform1.id)

        # Verify in database
        user_platform_ids = list(
            UserPlatform.objects.filter(user_id=self.user.id).values_list('platform_id', flat=True)
        )
        self.assertEqual(user_platform_ids, [self.platform1.id])

    def test_patch_user_profile_replace_platforms(self):
        """Test replacing all platforms (idempotent sync)."""
        url = reverse('user-profile')
        self.client.force_authenticate(user=self.user)

        # User initially has platform1, replace with platform2 and platform3
        data = {'platforms': [self.platform2.id, self.platform3.id]}
        response = self.client.patch(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['platforms']), 2)

        platform_ids = [p['id'] for p in response.data['platforms']]
        self.assertIn(self.platform2.id, platform_ids)
        self.assertIn(self.platform3.id, platform_ids)
        self.assertNotIn(self.platform1.id, platform_ids)

    def test_patch_user_profile_empty_platforms(self):
        """Test removing all platforms (empty list)."""
        url = reverse('user-profile')
        self.client.force_authenticate(user=self.user)

        # Remove all platforms
        data = {'platforms': []}
        response = self.client.patch(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['platforms'], [])

        # Verify in database
        count = UserPlatform.objects.filter(user_id=self.user.id).count()
        self.assertEqual(count, 0)

    def test_patch_user_profile_invalid_platform_ids(self):
        """Test validation of invalid platform IDs."""
        url = reverse('user-profile')
        self.client.force_authenticate(user=self.user)

        # Use non-existent platform ID
        data = {'platforms': [99999]}
        response = self.client.patch(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('platforms', response.data)

    def test_patch_user_profile_duplicate_platform_ids(self):
        """Test validation of duplicate platform IDs."""
        url = reverse('user-profile')
        self.client.force_authenticate(user=self.user)

        # Use duplicate platform IDs
        data = {'platforms': [self.platform1.id, self.platform1.id]}
        response = self.client.patch(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('platforms', response.data)

    def test_patch_user_profile_missing_platforms_field(self):
        """Test validation when platforms field is missing."""
        url = reverse('user-profile')
        self.client.force_authenticate(user=self.user)

        # Missing platforms field
        data = {}
        response = self.client.patch(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('platforms', response.data)

    def test_patch_user_profile_invalid_data_type(self):
        """Test validation with invalid data type for platforms."""
        url = reverse('user-profile')
        self.client.force_authenticate(user=self.user)

        # Platforms as string instead of list
        data = {'platforms': 'invalid'}
        response = self.client.patch(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patch_user_profile_idempotent(self):
        """Test that multiple identical requests produce same result."""
        url = reverse('user-profile')
        self.client.force_authenticate(user=self.user)

        data = {'platforms': [self.platform1.id, self.platform2.id]}

        # First request
        response1 = self.client.patch(url, data, format='json')
        self.assertEqual(response1.status_code, status.HTTP_200_OK)

        # Second identical request
        response2 = self.client.patch(url, data, format='json')
        self.assertEqual(response2.status_code, status.HTTP_200_OK)

        # Results should be identical
        self.assertEqual(response1.data, response2.data)

        # Verify database state
        user_platform_ids = set(
            UserPlatform.objects.filter(user_id=self.user.id).values_list('platform_id', flat=True)
        )
        self.assertEqual(user_platform_ids, {self.platform1.id, self.platform2.id})

    def test_patch_user_profile_requires_authentication(self):
        """Test that endpoint requires authentication."""
        url = reverse('user-profile')

        # Make request without authentication
        self.client.force_authenticate(user=None)
        data = {'platforms': [self.platform1.id]}
        response = self.client.patch(url, data, format='json')

        # Should return 401 Unauthorized
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_patch_user_profile_response_structure(self):
        """Test that response has correct structure after update."""
        url = reverse('user-profile')
        self.client.force_authenticate(user=self.user)

        data = {'platforms': [self.platform1.id, self.platform2.id]}
        response = self.client.patch(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify response structure
        self.assertIn('email', response.data)
        self.assertIn('platforms', response.data)
        self.assertIn('is_staff', response.data)
        self.assertEqual(set(response.data.keys()), {'email', 'platforms', 'is_staff'})
        
        # Verify field types
        self.assertIsInstance(response.data['is_staff'], bool)

        # Verify platform structure
        for platform in response.data['platforms']:
            self.assertIn('id', platform)
            self.assertIn('platform_slug', platform)
            self.assertIn('platform_name', platform)

    def test_patch_user_profile_database_error(self):
        """Test handling of database errors during update."""
        url = reverse('user-profile')
        self.client.force_authenticate(user=self.user)

        data = {'platforms': [self.platform1.id]}

        with patch('services.user_profile_service.UserPlatform.objects.filter',
                   side_effect=DatabaseError("DB connection lost")):
            response = self.client.patch(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn('error', response.data)

    def tearDown(self):
        """Clean up test data."""
        from django.db import connection, transaction

        # If we're in a broken transaction, roll it back
        if connection.in_atomic_block and transaction.get_rollback():
            transaction.set_rollback(False)
            connection.needs_rollback = False

        try:
            # Clean up user platforms created during tests but keep user
            UserPlatform.objects.filter(user_id=self.user.id).delete()
            # Note: We don't delete user to avoid conflicts with TEST_USER UUID
        except Exception as e:
            # If cleanup fails, log but don't fail the test
            print(f"Warning: tearDown cleanup failed: {e}")
