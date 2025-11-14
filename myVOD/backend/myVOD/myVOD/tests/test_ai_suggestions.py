"""
Integration tests for AI suggestions API endpoint.

Tests the full request-response cycle for GET /api/suggestions/ endpoint.
"""
import uuid
import os
from unittest.mock import Mock, patch
from datetime import datetime, time

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient, APITestCase
from rest_framework import status
from movies.models import (
    AiSuggestionBatch,
    UserMovie,
    Movie,
    Platform,
    UserPlatform,
    MovieAvailability
)
from dotenv import load_dotenv

load_dotenv()

User = get_user_model()


class AISuggestionsGetAPITests(APITestCase):
    """
    Integration tests for GET /api/suggestions/ endpoint.

    Tests cover:
    - Successful suggestions generation (200)
    - Cached suggestions retrieval (200)
    - Authentication required (401)
    - No movies in watchlist/watched (404)
    - Database errors (500)
    - Response structure validation
    """

    def setUp(self):
        """Set up test data for each test."""
        # Clean up first to ensure clean state
        self.test_user_id = uuid.UUID(os.getenv("TEST_USER", str(uuid.uuid4())))

        # Clean up any leftover data from previous tests
        AiSuggestionBatch.objects.filter(user_id=self.test_user_id).delete()
        UserMovie.objects.filter(user_id=self.test_user_id).delete()
        UserPlatform.objects.filter(user_id=self.test_user_id).delete()
        # Clean movie availability (will be recreated as needed)
        MovieAvailability.objects.filter(tconst='tt0111161').delete()

        # Get or create test user with UUID (real Django user)
        self.user, created = User.objects.get_or_create(
            id=self.test_user_id,
            defaults={
                "username": f"test_user_{self.test_user_id.hex[:8]}",
                "email": "test@example.com",
            }
        )
        if not self.user.has_usable_password():
            self.user.set_password("testpass")
            self.user.save()

        # Ensure user is committed to DB
        self.user.refresh_from_db()

        self.client = APIClient()

        # Create test platform
        self.platform, _ = Platform.objects.get_or_create(
            platform_slug="test-netflix-suggestions",
            defaults={'platform_name': "Test Netflix Suggestions"}
        )

        # Create test movie
        self.movie, _ = Movie.objects.get_or_create(
            tconst='tt0111161',
            defaults={
                'primary_title': 'The Shawshank Redemption',
                'start_year': 1994,
                'genres': ['Drama'],
                'avg_rating': 9.3
            }
        )

        # Associate platform with user (after cleanup)
        UserPlatform.objects.get_or_create(
            user_id=self.user.id,
            platform_id=self.platform.id
        )

        # URL for the endpoint
        self.url = reverse('suggestions')

    def tearDown(self):
        """Clean up test data after each test."""
        from django.db import connection, transaction

        # If we're in a broken transaction, roll it back
        if connection.in_atomic_block and transaction.get_rollback():
            transaction.set_rollback(False)
            connection.needs_rollback = False

        try:
            # Clean up test data but keep the user (for reuse in other tests)
            AiSuggestionBatch.objects.filter(user_id=self.user.id).delete()
            UserMovie.objects.filter(user_id=self.user.id).delete()
            UserPlatform.objects.filter(user_id=self.user.id).delete()
            MovieAvailability.objects.filter(tconst=self.movie).delete()
            # Note: We don't delete the user to avoid conflicts with TEST_USER UUID
        except Exception as e:
            # If cleanup fails, log but don't fail the test
            print(f"Warning: tearDown cleanup failed: {e}")

    def test_suggestions_requires_authentication(self):
        """Test that endpoint requires authentication (401)."""
        # Make request without authentication
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('detail', response.data)

    def test_suggestions_no_movies_returns_404(self):
        """Test that 404 is returned when user has no movies."""
        # Authenticate request
        self.client.force_authenticate(user=self.user)

        # Make request (no movies in database)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('error', response.data)
        self.assertIn('add movies', response.data['error'].lower())

    @patch('services.ai_suggestions_service.genai')
    def test_suggestions_generate_success(self, mock_genai):
        """Test successful generation of new suggestions."""
        # Mock Gemini API response
        mock_model = Mock()
        mock_response = Mock()
        mock_response.text = '[]'
        mock_model.generate_content.return_value = mock_response
        mock_genai.GenerativeModel.return_value = mock_model

        # Add movie to user's watchlist
        UserMovie.objects.create(
            user_id=self.user.id,
            tconst=self.movie,
            watchlisted_at=timezone.now()
        )

        # Create movie availability on user's platform
        MovieAvailability.objects.create(
            tconst=self.movie,
            platform=self.platform,
            is_available=True,
            last_checked=timezone.now(),
            source='test'
        )

        # Authenticate request
        self.client.force_authenticate(user=self.user)

        # Make request
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify response structure
        self.assertIn('expires_at', response.data)
        self.assertIn('suggestions', response.data)
        self.assertIsInstance(response.data['suggestions'], list)

        # Verify expires_at is end of today
        today = timezone.now().date()
        response_expires = timezone.datetime.fromisoformat(
            response.data['expires_at'].replace('Z', '+00:00')
        )
        self.assertEqual(response_expires.date(), today)

    def test_suggestions_cached_response(self):
        """Test that cached suggestions from today are returned."""
        # Add movie to user's watchlist
        UserMovie.objects.create(
            user_id=self.user.id,
            tconst=self.movie,
            watchlisted_at=timezone.now()
        )

        # Create cached suggestions
        today = timezone.now().date()
        expires_at = timezone.make_aware(
            datetime.combine(today, time(23, 59, 59))
        )

        cached_suggestions = [
            {
                'tconst': 'tt0133093',
                'primary_title': 'The Matrix',
                'start_year': 1999,
                'justification': 'Great sci-fi movie'
            }
        ]

        AiSuggestionBatch.objects.create(
            user_id=self.user.id,
            generated_at=timezone.now(),
            expires_at=expires_at,
            prompt="Test prompt",
            response=cached_suggestions
        )

        # Authenticate request
        self.client.force_authenticate(user=self.user)

        # Make first request
        response1 = self.client.get(self.url)
        self.assertEqual(response1.status_code, status.HTTP_200_OK)

        # Make second request (should return same cached data)
        response2 = self.client.get(self.url)
        self.assertEqual(response2.status_code, status.HTTP_200_OK)

        # Verify same data returned
        self.assertEqual(response1.data['expires_at'], response2.data['expires_at'])

        # Verify no new batch was created
        batch_count = AiSuggestionBatch.objects.filter(user_id=self.user.id).count()
        self.assertEqual(batch_count, 1)

    def test_suggestions_with_availability(self):
        """Test that suggestions include availability information."""
        # Add movie to user's watchlist
        UserMovie.objects.create(
            user_id=self.user.id,
            tconst=self.movie,
            watchlisted_at=timezone.now()
        )

        # Create movie availability
        MovieAvailability.objects.create(
            tconst=self.movie,
            platform=self.platform,
            is_available=True,
            last_checked=timezone.now(),
            source='test'
        )

        # Create cached batch
        today = timezone.now().date()
        expires_at = timezone.make_aware(
            datetime.combine(today, time(23, 59, 59))
        )

        cached_suggestions = {
            self.platform.platform_name: [
                {
                    'tconst': self.movie.tconst,
                    'primary_title': self.movie.primary_title,
                    'start_year': self.movie.start_year,
                    'justification': 'Excellent drama'
                }
            ]
        }

        AiSuggestionBatch.objects.create(
            user_id=self.user.id,
            generated_at=timezone.now(),
            expires_at=expires_at,
            prompt="Test prompt",
            response=cached_suggestions
        )

        # Authenticate request
        self.client.force_authenticate(user=self.user)

        # Make request
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['suggestions']), 1)

        suggestion = response.data['suggestions'][0]
        self.assertIn('availability', suggestion)
        self.assertIsInstance(suggestion['availability'], list)
        self.assertEqual(len(suggestion['availability']), 1)

        # Verify availability structure
        availability = suggestion['availability'][0]
        self.assertIn('platform_id', availability)
        self.assertIn('platform_name', availability)
        self.assertIn('is_available', availability)
        self.assertEqual(availability['platform_id'], self.platform.id)
        self.assertTrue(availability['is_available'])

    def test_suggestions_response_structure(self):
        """Test that response has correct structure with all required fields."""
        # Add movie to user's watchlist
        UserMovie.objects.create(
            user_id=self.user.id,
            tconst=self.movie,
            watchlisted_at=timezone.now()
        )

        # Create cached batch with suggestion
        today = timezone.now().date()
        expires_at = timezone.make_aware(
            datetime.combine(today, time(23, 59, 59))
        )

        cached_suggestions = {
            "Test Platform": [
                {
                    'tconst': 'tt0068646',
                    'primary_title': 'The Godfather',
                    'start_year': 1972,
                    'justification': 'Classic crime drama'
                }
            ]
        }

        AiSuggestionBatch.objects.create(
            user_id=self.user.id,
            generated_at=timezone.now(),
            expires_at=expires_at,
            prompt="Test prompt",
            response=cached_suggestions
        )

        # Authenticate request
        self.client.force_authenticate(user=self.user)

        # Make request
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify top-level structure
        self.assertIn('expires_at', response.data)
        self.assertIn('suggestions', response.data)

        # Verify suggestion structure
        self.assertEqual(len(response.data['suggestions']), 1)
        suggestion = response.data['suggestions'][0]

        required_fields = ['tconst', 'primary_title', 'start_year', 'justification', 'availability']
        for field in required_fields:
            self.assertIn(field, suggestion)

        # Verify field types
        self.assertIsInstance(suggestion['tconst'], str)
        self.assertIsInstance(suggestion['primary_title'], str)
        self.assertIsInstance(suggestion['justification'], str)
        self.assertIsInstance(suggestion['availability'], list)

    @patch('services.ai_suggestions_service.genai')
    def test_suggestions_watched_movies_valid(self, mock_genai):
        """Test that watched movies (not watchlisted) are valid for suggestions."""
        # Mock Gemini API response
        mock_model = Mock()
        mock_response = Mock()
        mock_response.text = '[]'
        mock_model.generate_content.return_value = mock_response
        mock_genai.GenerativeModel.return_value = mock_model

        # Add movie to watched history (not watchlist)
        UserMovie.objects.create(
            user_id=self.user.id,
            tconst=self.movie,
            watched_at=timezone.now()
        )

        # Create movie availability
        MovieAvailability.objects.create(
            tconst=self.movie,
            platform=self.platform,
            is_available=True,
            last_checked=timezone.now(),
            source='test'
        )

        # Authenticate request
        self.client.force_authenticate(user=self.user)

        # Make request (should succeed)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('suggestions', response.data)

    def test_suggestions_deleted_watchlist_ignored(self):
        """Test that soft-deleted watchlist movies are ignored."""
        # Add movie to watchlist but mark as deleted
        UserMovie.objects.create(
            user_id=self.user.id,
            tconst=self.movie,
            watchlisted_at=timezone.now(),
            watchlist_deleted_at=timezone.now()  # Soft deleted
        )

        # Authenticate request
        self.client.force_authenticate(user=self.user)

        # Make request (should return 404 - no valid movies)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('error', response.data)

    @patch('services.ai_suggestions_service.genai')
    def test_suggestions_empty_list_valid(self, mock_genai):
        """Test that empty suggestions list is valid response when no available movies."""
        # Mock Gemini API response - should return empty due to no available movies
        mock_model = Mock()
        mock_response = Mock()
        mock_response.text = '[]'
        mock_model.generate_content.return_value = mock_response
        mock_genai.GenerativeModel.return_value = mock_model

        # Add movie to user's watchlist
        UserMovie.objects.create(
            user_id=self.user.id,
            tconst=self.movie,
            watchlisted_at=timezone.now()
        )

        # Intentionally NOT creating MovieAvailability
        # This simulates scenario where user has movies but none are available on platforms
        # Function should return empty list from _get_available_movies_for_platforms

        # Authenticate request
        self.client.force_authenticate(user=self.user)

        # Make request
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('suggestions', response.data)
        # Empty list is valid when no movies available on platforms
        self.assertIsInstance(response.data['suggestions'], list)
        self.assertEqual(len(response.data['suggestions']), 0)

    @patch('services.ai_suggestions_service.genai')
    @patch('services.ai_suggestions_service.AiSuggestionBatch.objects.filter')
    def test_suggestions_database_error_returns_500(self, mock_filter, mock_genai):
        """Test that database errors return 500."""
        # Mock Gemini API response (though it won't be reached due to DB error)
        mock_model = Mock()
        mock_response = Mock()
        mock_response.text = '[]'
        mock_model.generate_content.return_value = mock_response
        mock_genai.GenerativeModel.return_value = mock_model

        # Add movie to user's watchlist
        UserMovie.objects.create(
            user_id=self.user.id,
            tconst=self.movie,
            watchlisted_at=timezone.now()
        )

        # Create movie availability
        MovieAvailability.objects.create(
            tconst=self.movie,
            platform=self.platform,
            is_available=True,
            last_checked=timezone.now(),
            source='test'
        )

        # Mock database error
        from django.db import DatabaseError
        mock_filter.side_effect = DatabaseError("Database connection failed")

        # Authenticate request
        self.client.force_authenticate(user=self.user)

        # Make request
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn('error', response.data)

    def test_suggestions_multiple_platforms(self):
        """Test suggestions with availability on multiple platforms."""
        # Add second platform
        platform2, _ = Platform.objects.get_or_create(
            platform_slug="test-hbo-suggestions",
            defaults={'platform_name': "Test HBO Suggestions"}
        )

        UserPlatform.objects.get_or_create(
            user_id=self.user.id,
            platform_id=platform2.id
        )

        # Add movie to user's watchlist
        UserMovie.objects.create(
            user_id=self.user.id,
            tconst=self.movie,
            watchlisted_at=timezone.now()
        )

        # Create availability on both platforms
        MovieAvailability.objects.create(
            tconst=self.movie,
            platform=self.platform,
            is_available=True,
            last_checked=timezone.now(),
            source='test'
        )
        MovieAvailability.objects.create(
            tconst=self.movie,
            platform=platform2,
            is_available=True,
            last_checked=timezone.now(),
            source='test'
        )

        # Create cached batch
        today = timezone.now().date()
        expires_at = timezone.make_aware(
            datetime.combine(today, time(23, 59, 59))
        )

        cached_suggestions = {
            self.platform.platform_name: [
                {
                    'tconst': self.movie.tconst,
                    'primary_title': self.movie.primary_title,
                    'start_year': self.movie.start_year,
                    'justification': 'Available on multiple platforms'
                }
            ]
        }

        AiSuggestionBatch.objects.create(
            user_id=self.user.id,
            generated_at=timezone.now(),
            expires_at=expires_at,
            prompt="Test prompt",
            response=cached_suggestions
        )

        # Authenticate request
        self.client.force_authenticate(user=self.user)

        # Make request
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify both platforms in availability
        suggestion = response.data['suggestions'][0]
        self.assertEqual(len(suggestion['availability']), 2)

        platform_ids = [av['platform_id'] for av in suggestion['availability']]
        self.assertIn(self.platform.id, platform_ids)
        self.assertIn(platform2.id, platform_ids)

        # Clean up
        UserPlatform.objects.filter(user_id=self.user.id, platform_id=platform2.id).delete()
        MovieAvailability.objects.filter(tconst=self.movie, platform=platform2).delete()

    @patch('services.ai_suggestions_service._log_integration_error')
    def test_suggestions_ai_error_logs_to_database(self, mock_log_error):
        """Test that AI errors are logged to integration_error_log."""
        # Add movie to user's watchlist
        UserMovie.objects.create(
            user_id=self.user.id,
            tconst=self.movie,
            watchlisted_at=timezone.now()
        )

        # Mock AI generation error
        with patch('services.ai_suggestions_service._generate_mock_suggestions') as mock_ai:
            mock_ai.side_effect = Exception("AI API error")

            # Authenticate request
            self.client.force_authenticate(user=self.user)

            # Make request (should still succeed with empty suggestions)
            response = self.client.get(self.url)

            self.assertEqual(response.status_code, status.HTTP_200_OK)

            # Verify error logging function was called
            self.assertTrue(mock_log_error.called)

            # Verify logging was called with correct parameters
            call_args = mock_log_error.call_args
            self.assertEqual(call_args[1]['api_type'], 'gemini')
            self.assertIn('AI API error', call_args[1]['error_message'])
            self.assertEqual(call_args[1]['user_id'], self.user.id)
