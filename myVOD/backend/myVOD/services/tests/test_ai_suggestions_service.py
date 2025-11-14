"""
Unit tests for ai_suggestions_service.

Tests the business logic for AI movie suggestions functionality.
"""
import os
import uuid
from datetime import datetime, time
from unittest.mock import Mock, patch, MagicMock

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import DatabaseError
from movies.models import (
    AiSuggestionBatch,
    UserMovie,
    Movie,
    Platform,
    MovieAvailability,
    UserPlatform
)
from services.ai_suggestions_service import (
    get_or_generate_suggestions,
    InsufficientDataError,
    _format_cached_suggestions,
    _get_movie_availability,
    _log_integration_error
)

User = get_user_model()


def resolve_test_user_uuid() -> uuid.UUID:
    env_value = os.getenv("TEST_USER")
    if env_value:
        try:
            return uuid.UUID(env_value)
        except ValueError:
            pass

    generated = uuid.uuid4()
    os.environ["TEST_USER"] = str(generated)
    return generated


class GetOrGenerateSuggestionsTests(TestCase):
    """
    Test suite for get_or_generate_suggestions service function.

    Tests cover:
    - Returning cached suggestions from today
    - Generating new suggestions when no cache exists
    - Rate limiting (one suggestion per day)
    - Insufficient data error (no watchlist/watched movies)
    - Database errors
    """

    def setUp(self):
        """Set up test data for each test."""
        # Ensure we have a real Django user with a deterministic UUID
        test_user_uuid = resolve_test_user_uuid()

        # Clean up any leftover data from previous tests
        AiSuggestionBatch.objects.filter(user_id=test_user_uuid).delete()
        UserMovie.objects.filter(user_id=test_user_uuid).delete()
        UserPlatform.objects.filter(user_id=test_user_uuid).delete()
        MovieAvailability.objects.filter(tconst='tt0111161').delete()

        self.user, created = User.objects.get_or_create(
            id=test_user_uuid,
            defaults={
                "email": "ai-test-user@example.com",
                "username": "ai_test_user",
                "is_active": True,
            },
        )
        # Ensure user is in DB
        self.user.refresh_from_db()

        # Create test platform
        self.platform, _ = Platform.objects.get_or_create(
            platform_slug="test-netflix-ai",
            defaults={'platform_name': "Test Netflix AI"}
        )

        # Create test movie (without genres to avoid type mismatch)
        self.movie, _ = Movie.objects.get_or_create(
            tconst='tt0111161',
            defaults={
                'primary_title': 'The Shawshank Redemption',
                'start_year': 1994,
                'avg_rating': 9.3
            }
        )

    def tearDown(self):
        """Clean up test data after each test."""
        from django.db import connection, transaction

        # If we're in a broken transaction, roll it back
        if connection.in_atomic_block and transaction.get_rollback():
            transaction.set_rollback(False)
            connection.needs_rollback = False

        try:
            # Clean up using UUID directly
            AiSuggestionBatch.objects.filter(user_id=self.user.id).delete()
            UserMovie.objects.filter(user_id=self.user.id).delete()
            UserPlatform.objects.filter(user_id=self.user.id).delete()
            MovieAvailability.objects.filter(tconst=self.movie).delete()
        except Exception as e:
            # If cleanup fails, log but don't fail the test
            print(f"Warning: tearDown cleanup failed: {e}")

    def test_insufficient_data_no_movies(self):
        """Test that InsufficientDataError is raised when user has no movies."""
        # No movies added to watchlist/watched

        with self.assertRaises(InsufficientDataError) as context:
            get_or_generate_suggestions(self.user)

        self.assertIn("add movies to your watchlist", str(context.exception))

    def test_insufficient_data_no_platforms(self):
        """Test that InsufficientDataError is raised when user has no VOD platforms."""
        # Add movie to user's watchlist but no platforms
        UserMovie.objects.create(
            user_id=self.user.id,
            tconst=self.movie,
            watchlisted_at=timezone.now()
        )

        with self.assertRaises(InsufficientDataError) as context:
            get_or_generate_suggestions(self.user)

        self.assertIn("configure at least one VOD platform", str(context.exception))

    @patch('services.ai_suggestions_service.genai')
    def test_generate_new_suggestions_success(self, mock_genai):
        """Test successful generation of new suggestions."""
        # Mock Gemini API response
        mock_model = Mock()
        mock_response = Mock()
        mock_response.text = '{"Netflix": [{"tconst": "tt0133093", "justification": "A classic."}]}'
        mock_model.generate_content.return_value = mock_response
        mock_genai.GenerativeModel.return_value = mock_model

        # Add platform to user
        UserPlatform.objects.create(
            user_id=self.user.id,
            platform=self.platform
        )

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

        result = get_or_generate_suggestions(self.user)

        # Verify response structure
        self.assertIn('expires_at', result)
        self.assertIn('suggestions', result)
        self.assertIsInstance(result['suggestions'], list)

        # Verify expires_at is end of today
        today = timezone.now().date()
        expected_expires = timezone.make_aware(
            datetime.combine(today, time(23, 59, 59))
        )
        self.assertEqual(result['expires_at'].date(), expected_expires.date())

        # Verify batch was cached
        batch = AiSuggestionBatch.objects.filter(user_id=self.user.id).first()
        self.assertIsNotNone(batch)
        self.assertEqual(batch.expires_at.date(), expected_expires.date())

    def test_return_cached_suggestions_from_today(self):
        """Test that cached suggestions from today are returned."""
        # Add movie to user's watchlist
        UserMovie.objects.create(
            user_id=self.user.id,
            tconst=self.movie,
            watchlisted_at=timezone.now()
        )

        # Create cached batch from today
        today = timezone.now().date()
        expires_at = timezone.make_aware(
            datetime.combine(today, time(23, 59, 59))
        )

        cached_suggestions = {
            self.platform.platform_name: [
                {
                    'tconst': 'tt0133093',
                    'primary_title': 'The Matrix',
                    'start_year': 1999,
                    'justification': 'Great sci-fi movie'
                }
            ]
        }

        batch = AiSuggestionBatch.objects.create(
            user_id=self.user.id,
            generated_at=timezone.now(),
            expires_at=expires_at,
            prompt="Test prompt",
            response=cached_suggestions
        )

        # Call service
        result = get_or_generate_suggestions(self.user)

        # Verify cached data was returned
        self.assertEqual(result['expires_at'], batch.expires_at)
        self.assertEqual(len(result['suggestions']), 1)

        # Verify no new batch was created
        batch_count = AiSuggestionBatch.objects.filter(user_id=self.user.id).count()
        self.assertEqual(batch_count, 1)

    def test_suggestions_with_availability(self):
        """Test that suggestions include availability information."""
        # Add platform to user (required for availability check)
        UserPlatform.objects.create(
            user_id=self.user.id,
            platform=self.platform
        )

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

        # Create cached batch with this movie
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
                    'justification': 'Great drama'
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

        # Call service
        result = get_or_generate_suggestions(self.user)

        # Verify availability is included
        self.assertEqual(len(result['suggestions']), 1)
        suggestion = result['suggestions'][0]
        self.assertIn('availability', suggestion)
        self.assertEqual(len(suggestion['availability']), 1)
        self.assertEqual(suggestion['availability'][0]['platform_id'], self.platform.id)
        self.assertEqual(suggestion['availability'][0]['platform_name'], self.platform.platform_name)
        self.assertTrue(suggestion['availability'][0]['is_available'])

    @patch('services.ai_suggestions_service.genai')
    def test_watched_movies_count_as_data(self, mock_genai):
        """Test that watched movies (not just watchlisted) are valid data."""
        # Mock Gemini API response
        mock_model = Mock()
        mock_response = Mock()
        mock_response.text = '{"Netflix": [{"tconst": "tt0133093", "justification": "A classic."}]}'
        mock_model.generate_content.return_value = mock_response
        mock_genai.GenerativeModel.return_value = mock_model

        # Add platform to user
        UserPlatform.objects.create(
            user_id=self.user.id,
            platform=self.platform
        )

        # Add movie to user's watched history (not watchlist)
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

        # Should succeed (not raise InsufficientDataError)
        result = get_or_generate_suggestions(self.user)

        self.assertIn('suggestions', result)
        self.assertIsInstance(result['suggestions'], list)

    def test_deleted_watchlist_movies_not_counted(self):
        """Test that soft-deleted watchlist movies don't count as data."""
        # Add movie to watchlist but mark as deleted
        UserMovie.objects.create(
            user_id=self.user.id,
            tconst=self.movie,
            watchlisted_at=timezone.now(),
            watchlist_deleted_at=timezone.now()  # Soft deleted
        )

        # Should raise InsufficientDataError
        with self.assertRaises(InsufficientDataError):
            get_or_generate_suggestions(self.user)


class FormatCachedSuggestionsTests(TestCase):
    """Test suite for _format_cached_suggestions helper function."""

    def setUp(self):
        """Set up test data for each test."""
        # Create a dedicated test user for this suite
        user_uuid = uuid.uuid4()
        self.user = User.objects.create(
            id=user_uuid,
            email=f"format-user-{user_uuid}@example.com",
            username=f"format_user_{user_uuid.hex[:8]}",
            is_active=True,
        )

        # Create test platform
        self.platform, _ = Platform.objects.get_or_create(
            platform_slug="test-platform-format",
            defaults={'platform_name': "Test Platform"}
        )

        # Create test movie (without genres to avoid type mismatch)
        self.movie, _ = Movie.objects.get_or_create(
            tconst='tt0068646',
            defaults={
                'primary_title': 'The Godfather',
                'start_year': 1972,
                'avg_rating': 9.2
            }
        )

    def tearDown(self):
        """Clean up test data after each test."""
        AiSuggestionBatch.objects.filter(user_id=self.user.id).delete()
        UserPlatform.objects.filter(user_id=self.user.id).delete()
        MovieAvailability.objects.filter(tconst=self.movie).delete()
        self.user.delete()

    def test_format_empty_suggestions(self):
        """Test formatting batch with empty suggestions."""
        today = timezone.now().date()
        expires_at = timezone.make_aware(
            datetime.combine(today, time(23, 59, 59))
        )

        batch = AiSuggestionBatch.objects.create(
            user_id=self.user.id,
            generated_at=timezone.now(),
            expires_at=expires_at,
            prompt="Test prompt",
            response=[]
        )

        result = _format_cached_suggestions(self.user, batch)

        self.assertEqual(result['expires_at'], expires_at)
        self.assertEqual(len(result['suggestions']), 0)

    def test_format_suggestions_with_availability(self):
        """Test formatting suggestions with availability data."""
        # Add platform to user (required for availability check)
        UserPlatform.objects.create(
            user_id=self.user.id,
            platform=self.platform
        )

        today = timezone.now().date()
        expires_at = timezone.make_aware(
            datetime.combine(today, time(23, 59, 59))
        )

        # Create availability
        MovieAvailability.objects.create(
            tconst=self.movie,
            platform=self.platform,
            is_available=True,
            last_checked=timezone.now(),
            source='test'
        )

        cached_suggestions = {
            self.platform.platform_name: [
                {
                    'tconst': self.movie.tconst,
                    'primary_title': self.movie.primary_title,
                    'start_year': self.movie.start_year,
                    'justification': 'Classic crime drama'
                }
            ]
        }

        batch = AiSuggestionBatch.objects.create(
            user_id=self.user.id,
            generated_at=timezone.now(),
            expires_at=expires_at,
            prompt="Test prompt",
            response=cached_suggestions
        )

        result = _format_cached_suggestions(self.user, batch)

        self.assertEqual(len(result['suggestions']), 1)
        suggestion = result['suggestions'][0]
        self.assertEqual(suggestion['tconst'], self.movie.tconst)
        self.assertEqual(suggestion['primary_title'], self.movie.primary_title)
        self.assertEqual(len(suggestion['availability']), 1)


class GetMovieAvailabilityTests(TestCase):
    """Test suite for _get_movie_availability helper function."""

    def setUp(self):
        """Set up test data for each test."""
        # Create test platforms
        self.platform1, _ = Platform.objects.get_or_create(
            platform_slug="test-netflix-avail",
            defaults={'platform_name': "Test Netflix"}
        )
        self.platform2, _ = Platform.objects.get_or_create(
            platform_slug="test-hbo-avail",
            defaults={'platform_name': "Test HBO"}
        )

        # Create test movie (without genres to avoid type mismatch)
        self.movie, _ = Movie.objects.get_or_create(
            tconst='tt0108052',
            defaults={
                'primary_title': 'Schindler\'s List',
                'start_year': 1993,
                'avg_rating': 9.0
            }
        )

    def tearDown(self):
        """Clean up test data after each test."""
        MovieAvailability.objects.filter(tconst=self.movie).delete()

    def test_get_availability_empty_platform_ids(self):
        """Test that empty platform_ids returns empty list."""
        result = _get_movie_availability(self.movie.tconst, [])

        self.assertEqual(result, [])

    def test_get_availability_no_data(self):
        """Test availability when no data exists in database."""
        result = _get_movie_availability(
            self.movie.tconst,
            [self.platform1.id, self.platform2.id]
        )

        self.assertEqual(result, [])

    def test_get_availability_only_true(self):
        """Test that only is_available=True entries are returned."""
        # Create availability entries
        MovieAvailability.objects.create(
            tconst=self.movie,
            platform=self.platform1,
            is_available=True,
            last_checked=timezone.now(),
            source='test'
        )
        MovieAvailability.objects.create(
            tconst=self.movie,
            platform=self.platform2,
            is_available=False,  # Should not be returned
            last_checked=timezone.now(),
            source='test'
        )

        result = _get_movie_availability(
            self.movie.tconst,
            [self.platform1.id, self.platform2.id]
        )

        # Only platform1 should be returned
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['platform_id'], self.platform1.id)
        self.assertTrue(result[0]['is_available'])

    def test_get_availability_correct_structure(self):
        """Test that returned data has correct structure."""
        MovieAvailability.objects.create(
            tconst=self.movie,
            platform=self.platform1,
            is_available=True,
            last_checked=timezone.now(),
            source='test'
        )

        result = _get_movie_availability(self.movie.tconst, [self.platform1.id])

        self.assertEqual(len(result), 1)
        availability = result[0]

        # Verify structure
        self.assertIn('platform_id', availability)
        self.assertIn('platform_name', availability)
        self.assertIn('is_available', availability)

        # Verify values
        self.assertEqual(availability['platform_id'], self.platform1.id)
        self.assertEqual(availability['platform_name'], self.platform1.platform_name)
        self.assertTrue(availability['is_available'])


class LogIntegrationErrorTests(TestCase):
    """Test suite for _log_integration_error helper function."""

    def setUp(self):
        """Set up test data for each test."""
        self.user_id = uuid.uuid4()

    @patch('services.ai_suggestions_service.IntegrationErrorLog.objects.create')
    def test_log_integration_error_success(self, mock_create):
        """Test successful logging of integration error."""
        # Mock the created error log
        mock_error_log = Mock()
        mock_error_log.id = 1
        mock_error_log.api_type = "gemini"
        mock_error_log.error_message = "API key invalid"
        mock_error_log.error_details = {"status_code": 401}
        mock_error_log.user_id = self.user_id
        mock_create.return_value = mock_error_log

        error_log = _log_integration_error(
            api_type="gemini",
            error_message="API key invalid",
            error_details={"status_code": 401},
            user_id=self.user_id
        )

        # Verify error was logged
        self.assertIsNotNone(error_log)
        self.assertEqual(error_log.api_type, "gemini")
        self.assertEqual(error_log.error_message, "API key invalid")
        self.assertEqual(error_log.error_details['status_code'], 401)
        self.assertEqual(error_log.user_id, self.user_id)

        # Verify create was called with correct arguments
        mock_create.assert_called_once()
        call_kwargs = mock_create.call_args[1]
        self.assertEqual(call_kwargs['api_type'], "gemini")
        self.assertEqual(call_kwargs['error_message'], "API key invalid")
        self.assertEqual(call_kwargs['error_details'], {"status_code": 401})
        self.assertEqual(call_kwargs['user_id'], self.user_id)

    @patch('services.ai_suggestions_service.IntegrationErrorLog.objects.create')
    def test_log_integration_error_without_details(self, mock_create):
        """Test logging error without error_details."""
        # Mock the created error log
        mock_error_log = Mock()
        mock_error_log.id = 2
        mock_error_log.api_type = "tmdb"
        mock_error_log.error_message = "Connection timeout"
        mock_error_log.error_details = {}
        mock_error_log.user_id = None
        mock_create.return_value = mock_error_log

        error_log = _log_integration_error(
            api_type="tmdb",
            error_message="Connection timeout"
        )

        self.assertIsNotNone(error_log)
        self.assertEqual(error_log.api_type, "tmdb")
        self.assertEqual(error_log.error_message, "Connection timeout")
        self.assertEqual(error_log.error_details, {})
        self.assertIsNone(error_log.user_id)

        # Verify create was called
        mock_create.assert_called_once()

    @patch('services.ai_suggestions_service.IntegrationErrorLog.objects.create')
    def test_log_integration_error_handles_exceptions(self, mock_create):
        """Test that logging errors don't break the flow."""
        mock_create.side_effect = DatabaseError("Database error")

        # Should not raise exception
        result = _log_integration_error(
            api_type="gemini",
            error_message="Test error"
        )

        # Should return None when logging fails
        self.assertIsNone(result)


class AiSuggestionsServiceTests(TestCase):

    @classmethod
    def setUpTestData(cls):
        cls.user_uuid = uuid.uuid4()
        cls.user, _ = User.objects.get_or_create(
            id=cls.user_uuid,
            defaults={
                "email": f"ai-service-{cls.user_uuid}@example.com",
                "username": f"ai_service_{cls.user_uuid.hex[:8]}",
                "is_active": True,
            },
        )

        # Platforms
        cls.p_netflix, _ = Platform.objects.get_or_create(
            platform_slug='netflix',
            defaults={'platform_name': 'Netflix'}
        )
        cls.p_hbo, _ = Platform.objects.get_or_create(
            platform_slug='hbomax',
            defaults={'platform_name': 'HBO Max'}
        )

        # User's subscribed platforms
        UserPlatform.objects.get_or_create(
            user_id=cls.user.id,
            platform=cls.p_netflix
        )

        # Movies with HIGH num_votes
        # (to ensure they appear in top 100 available movies)
        cls.m_matrix, _ = Movie.objects.get_or_create(
            tconst='tt0133093',
            defaults={'primary_title': 'The Matrix', 'num_votes': 2000000}
        )
        cls.m_dune, _ = Movie.objects.get_or_create(
            tconst='tt1160419',
            defaults={'primary_title': 'Dune', 'num_votes': 1500000}
        )
        cls.m_watched, _ = Movie.objects.get_or_create(
            tconst='tt0816692',
            defaults={'primary_title': 'Interstellar', 'num_votes': 1800000}
        )

        # User's watched movie
        UserMovie.objects.get_or_create(
            user_id=cls.user.id,
            tconst=cls.m_watched,
            defaults={'watched_at': timezone.now()}
        )

        # Availability data
        MovieAvailability.objects.get_or_create(
            tconst=cls.m_matrix,
            platform=cls.p_netflix,
            defaults={
                'is_available': True,
                'last_checked': timezone.now(),
                'source': 'test'
            }
        )
        MovieAvailability.objects.get_or_create(
            tconst=cls.m_dune,
            platform=cls.p_hbo,
            defaults={
                'is_available': True,  # Not on user's platform
                'last_checked': timezone.now(),
                'source': 'test'
            }
        )

    def test_insufficient_data_error_if_no_movies(self):
        # Arrange
        no_movies_user, _ = User.objects.get_or_create(
            username='nomovies',
            defaults={
                'email': 'nomovies@example.com',
                'password': 'password'
            }
        )

        # Act & Assert
        with self.assertRaises(InsufficientDataError):
            get_or_generate_suggestions(no_movies_user)

    @patch('services.ai_suggestions_service._get_available_movies_for_platforms')
    @patch('services.ai_suggestions_service.genai.GenerativeModel')
    def test_suggestions_are_generated_from_available_movies(
        self, MockGenerativeModel, mock_get_available
    ):
        # Clean up any existing cached suggestions for this user
        AiSuggestionBatch.objects.filter(user_id=self.user.id).delete()

        # Arrange
        # Mock available movies to return only The Matrix
        # (on user's platform Netflix)
        mock_get_available.return_value = [
            {
                'tconst': 'tt0133093',
                'title': 'The Matrix',
                'year': 1999,
                'genres': ['Action', 'Sci-Fi'],
                'rating': 8.7,
                'platforms': ['Netflix']
            }
        ]

        mock_model_instance = MockGenerativeModel.return_value
        mock_response = MagicMock()
        # Mocking a valid JSON response from Gemini
        response_json = (
            '{"Netflix": [{"tconst": "tt0133093", '
            '"justification": "Because it is a classic."}]}'
        )
        mock_response.text = response_json
        mock_model_instance.generate_content.return_value = mock_response

        # Act
        result = get_or_generate_suggestions(self.user)

        # Assert
        self.assertIn('suggestions', result)
        self.assertEqual(len(result['suggestions']), 1)
        # The Matrix
        self.assertEqual(result['suggestions'][0]['tconst'], 'tt0133093')

        # Check that the prompt sent to Gemini
        # contained ONLY available movies
        prompt_arg = mock_model_instance.generate_content.call_args[0][0]
        self.assertIn("Available Movies on User's Platforms", prompt_arg)

        # The Matrix should be in available movies list
        self.assertIn("[tt0133093] The Matrix", prompt_arg)

        # Dune should NOT be anywhere (not on user's platform)
        self.assertNotIn("Dune", prompt_arg)

        # Interstellar should be in "Watched" section but NOT in available
        self.assertIn("Movies User Has Watched:", prompt_arg)
        self.assertIn("Interstellar", prompt_arg)

        # Extract the "Available Movies" section
        # and verify Interstellar is NOT there
        available_section_start = prompt_arg.find("## Available Movies")
        available_section_end = prompt_arg.find("## Your Task:")
        available_section = (
            prompt_arg[available_section_start:available_section_end]
        )

        # Interstellar should NOT be in the available movies section
        self.assertNotIn("[tt0816692]", available_section)
        self.assertNotIn("Interstellar", available_section)

    @patch('services.ai_suggestions_service._get_available_movies_for_platforms')
    def test_cached_suggestions_returned_on_second_call(
        self, mock_get_available
    ):
        """Test that second call returns cached suggestions.

        Verifies that the second call doesn't call AI again.
        """
        # Clean up any existing cached suggestions for this user
        AiSuggestionBatch.objects.filter(user_id=self.user.id).delete()

        # Mock available movies
        mock_get_available.return_value = [
            {
                'tconst': 'tt0133093',
                'title': 'The Matrix',
                'year': 1999,
                'genres': ['Action', 'Sci-Fi'],
                'rating': 8.7,
                'platforms': ['Netflix']
            }
        ]

        # Arrange
        with patch(
            'services.ai_suggestions_service.genai.GenerativeModel'
        ) as MockModel:
            mock_model_instance = MockModel.return_value
            mock_response = MagicMock()
            mock_response.text = (
                '{"Netflix": [{"tconst": "tt0133093", "justification": "..."}]}'
            )
            mock_model_instance.generate_content.return_value = mock_response

            # First call to generate and cache
            first_result = get_or_generate_suggestions(self.user)
            first_call_count = (
                mock_model_instance.generate_content.call_count
            )

        # Act - second call should return cached data
        second_result = get_or_generate_suggestions(self.user)

        # Assert - second call should NOT call AI again (cached)
        self.assertEqual(
            mock_model_instance.generate_content.call_count,
            first_call_count
        )
        # Both results should have same structure
        self.assertIn('suggestions', second_result)
        self.assertIn('expires_at', second_result)
        # expires_at should be the same (same cached batch)
        self.assertEqual(
            first_result['expires_at'],
            second_result['expires_at']
        )
