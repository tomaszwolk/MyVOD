"""
Integration tests for admin analytics API endpoints.

Tests cover:
- Metrics endpoint (/admin/analytics/api/metrics/)
- Top movies endpoint (/admin/analytics/api/top-movies/)
- Error logs endpoint (/admin/analytics/api/error-logs/)
- Authentication and authorization (staff required)
- Data calculation accuracy
- Filtering and pagination
"""

from datetime import timedelta, timezone as dt_timezone
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status

from users.models import User
from movies.models import Movie, UserMovie, IntegrationErrorLog


class AdminMetricsAPITests(APITestCase):
    """
    Tests for GET /admin/analytics/api/metrics/ endpoint.
    
    Tests cover:
    - Staff authentication required
    - Response structure validation
    - Metrics calculation accuracy
    - Edge cases (empty database, no users, etc.)
    """

    @classmethod
    def setUpTestData(cls):
        """Create test data once for all tests."""
        # Create staff user
        cls.staff_user = User.objects.create_user(
            username='admin_test',
            email='admin@test.com',
            password='testpass123',
            is_staff=True,
            is_active=True,
        )
        
        # Create regular user (not staff)
        cls.regular_user = User.objects.create_user(
            username='regular_test',
            email='regular@test.com',
            password='testpass123',
            is_staff=False,
            is_active=True,
        )
        
        # Create test movies
        cls.movie1, _ = Movie.objects.get_or_create(
            tconst="tt0001001",
            defaults={"primary_title": "Test Movie 1", "avg_rating": 8.5}
        )
        cls.movie2, _ = Movie.objects.get_or_create(
            tconst="tt0001002",
            defaults={"primary_title": "Test Movie 2", "avg_rating": 9.0}
        )
        cls.movie3, _ = Movie.objects.get_or_create(
            tconst="tt0001003",
            defaults={"primary_title": "Test Movie 3", "avg_rating": 7.0}
        )
        
        # Create test users with different registration dates
        now = timezone.now()
        
        # User registered today
        cls.user_today = User.objects.create_user(
            username='user_today',
            email='today@test.com',
            password='testpass123',
            is_active=True,
            date_joined=now,
        )
        
        # User registered 5 days ago
        cls.user_5d_ago = User.objects.create_user(
            username='user_5d',
            email='5d@test.com',
            password='testpass123',
            is_active=True,
            date_joined=now - timedelta(days=5),
        )
        
        # User registered 10 days ago
        cls.user_10d_ago = User.objects.create_user(
            username='user_10d',
            email='10d@test.com',
            password='testpass123',
            is_active=True,
            date_joined=now - timedelta(days=10),
        )
        
        # User registered 35 days ago
        cls.user_35d_ago = User.objects.create_user(
            username='user_35d',
            email='35d@test.com',
            password='testpass123',
            is_active=True,
            date_joined=now - timedelta(days=35),
        )
        
        # Create watchlist entries for retention testing
        # User registered 10 days ago has movies (retained)
        UserMovie.objects.create(
            user_id=cls.user_10d_ago.id,
            tconst=cls.movie1,
            watchlisted_at=now - timedelta(days=5),
        )
        
        # User registered 35 days ago has movies (retained)
        UserMovie.objects.create(
            user_id=cls.user_35d_ago.id,
            tconst=cls.movie2,
            watchlisted_at=now - timedelta(days=20),
        )
        
        # User registered 5 days ago has no movies (not retained)
        # User registered today has no movies (not retained)

    def setUp(self):
        """Set up for each test."""
        # Authenticate as staff user by default
        self.client.force_authenticate(user=self.staff_user)
        # Set Accept header to ensure JSON response (not HTML redirect)
        self.client.credentials(HTTP_ACCEPT='application/json')

    def test_get_metrics_requires_staff(self):
        """Test that endpoint requires staff permissions."""
        # Use direct URL path instead of reverse() to avoid namespace issues
        url = '/admin/analytics/api/metrics/'
        
        # Test without authentication - should return 401 (Unauthorized)
        self.client.force_authenticate(user=None)
        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # Test with regular user (not staff) - should return 403 (Forbidden)
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Test with staff user (should succeed)
        self.client.force_authenticate(user=self.staff_user)
        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_metrics_response_structure(self):
        """Test that response has correct structure."""
        url = '/admin/analytics/api/metrics/'
        response = self.client.get(url, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        
        # Check required fields
        required_fields = [
            'total_users',
            'new_users',
            'retention_7d_percent',
            'retention_30d_percent',
            'pct_users_with_min_10_movies',
            'pct_users_used_ai',
            'pct_users_added_ai_movies',
            'avg_movies_per_user',
            'retention_timeseries',
            'new_users_timeseries',
            'last_updated_at',
        ]
        
        for field in required_fields:
            self.assertIn(field, data, f"Missing field: {field}")
        
        # Check new_users structure
        self.assertIn('today', data['new_users'])
        self.assertIn('last_7_days', data['new_users'])
        self.assertIn('last_30_days', data['new_users'])

    def test_get_metrics_calculates_total_users(self):
        """Test that total_users is calculated correctly."""
        url = '/admin/analytics/api/metrics/'
        response = self.client.get(url, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        
        # Should include all active users (staff_user, regular_user, user_today, user_5d_ago, user_10d_ago, user_35d_ago)
        # At least 6 users (may be more if database has other users)
        self.assertGreaterEqual(data['total_users'], 6)
        self.assertIsInstance(data['total_users'], int)

    def test_get_metrics_calculates_new_users(self):
        """Test that new_users counts are calculated correctly."""
        url = '/admin/analytics/api/metrics/'
        response = self.client.get(url, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        
        # new_users should have at least user_today
        self.assertGreaterEqual(data['new_users']['today'], 1)
        self.assertGreaterEqual(data['new_users']['last_7_days'], 2)  # user_today + user_5d_ago
        self.assertGreaterEqual(data['new_users']['last_30_days'], 3)  # user_today + user_5d_ago + user_10d_ago
        
        self.assertIsInstance(data['new_users']['today'], int)
        self.assertIsInstance(data['new_users']['last_7_days'], int)
        self.assertIsInstance(data['new_users']['last_30_days'], int)

    def test_get_metrics_calculates_retention(self):
        """Test that retention percentages are calculated correctly."""
        url = '/admin/analytics/api/metrics/'
        response = self.client.get(url, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        
        # Retention should be a percentage (0-100)
        self.assertIsInstance(data['retention_7d_percent'], (int, float))
        self.assertGreaterEqual(data['retention_7d_percent'], 0)
        self.assertLessEqual(data['retention_7d_percent'], 100)
        
        self.assertIsInstance(data['retention_30d_percent'], (int, float))
        self.assertGreaterEqual(data['retention_30d_percent'], 0)
        self.assertLessEqual(data['retention_30d_percent'], 100)

    def test_get_metrics_timeseries_data(self):
        """Test that timeseries data is included."""
        url = '/admin/analytics/api/metrics/'
        response = self.client.get(url, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        
        # Check retention_timeseries
        self.assertIsInstance(data['retention_timeseries'], list)
        if len(data['retention_timeseries']) > 0:
            point = data['retention_timeseries'][0]
            self.assertIn('date', point)
            self.assertIn('retention_7d', point)
            self.assertIn('retention_30d', point)
        
        # Check new_users_timeseries
        self.assertIsInstance(data['new_users_timeseries'], list)
        if len(data['new_users_timeseries']) > 0:
            point = data['new_users_timeseries'][0]
            self.assertIn('date', point)
            self.assertIn('count', point)


class TopMoviesAPITests(APITestCase):
    """
    Tests for GET /admin/analytics/api/top-movies/ endpoint.
    
    Tests cover:
    - Staff authentication required
    - Filtering by type (watchlist/watched)
    - Filtering by range (7d/30d/all)
    - Response structure validation
    """

    @classmethod
    def setUpTestData(cls):
        """Create test data once for all tests."""
        # Create staff user
        cls.staff_user = User.objects.create_user(
            username='admin_topmovies',
            email='admin_topmovies@test.com',
            password='testpass123',
            is_staff=True,
            is_active=True,
        )
        
        # Create test users
        cls.user1 = User.objects.create_user(
            username='user1_topmovies',
            email='user1_topmovies@test.com',
            password='testpass123',
            is_active=True,
        )
        
        cls.user2 = User.objects.create_user(
            username='user2_topmovies',
            email='user2_topmovies@test.com',
            password='testpass123',
            is_active=True,
        )
        
        # Create test movies
        cls.movie1, _ = Movie.objects.get_or_create(
            tconst="tt0002001",
            defaults={"primary_title": "Top Movie 1", "avg_rating": 8.5}
        )
        cls.movie2, _ = Movie.objects.get_or_create(
            tconst="tt0002002",
            defaults={"primary_title": "Top Movie 2", "avg_rating": 9.0}
        )
        cls.movie3, _ = Movie.objects.get_or_create(
            tconst="tt0002003",
            defaults={"primary_title": "Top Movie 3", "avg_rating": 7.0}
        )
        
        now = timezone.now()
        
        # Create watchlist entries (recent)
        UserMovie.objects.create(
            user_id=cls.user1.id,
            tconst=cls.movie1,
            watchlisted_at=now - timedelta(days=2),
        )
        UserMovie.objects.create(
            user_id=cls.user2.id,
            tconst=cls.movie1,
            watchlisted_at=now - timedelta(days=3),
        )
        UserMovie.objects.create(
            user_id=cls.user1.id,
            tconst=cls.movie2,
            watchlisted_at=now - timedelta(days=5),
        )
        
        # Create watched entries (recent)
        UserMovie.objects.create(
            user_id=cls.user1.id,
            tconst=cls.movie3,
            watchlisted_at=now - timedelta(days=10),
            watched_at=now - timedelta(days=1),
        )
        UserMovie.objects.create(
            user_id=cls.user2.id,
            tconst=cls.movie3,
            watchlisted_at=now - timedelta(days=15),
            watched_at=now - timedelta(days=2),
        )

    def setUp(self):
        """Set up for each test."""
        self.client.force_authenticate(user=self.staff_user)
        # Set Accept header to ensure JSON response (not HTML redirect)
        self.client.credentials(HTTP_ACCEPT='application/json')

    def test_get_top_movies_requires_staff(self):
        """Test that endpoint requires staff permissions."""
        url = '/admin/analytics/api/top-movies/'
        
        # Test without authentication - should return 401 (Unauthorized)
        self.client.force_authenticate(user=None)
        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_top_movies_watchlist_7d(self):
        """Test getting top movies from watchlist for last 7 days."""
        url = '/admin/analytics/api/top-movies/'
        response = self.client.get(url, {'type': 'watchlist', 'range': '7d'}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        
        self.assertEqual(data['type'], 'watchlist')
        self.assertEqual(data['range'], '7d')
        self.assertIn('items', data)
        self.assertIsInstance(data['items'], list)
        self.assertLessEqual(len(data['items']), 10)
        
        # Check item structure
        if len(data['items']) > 0:
            item = data['items'][0]
            self.assertIn('tconst', item)
            self.assertIn('primary_title', item)
            self.assertIn('start_year', item)
            self.assertIn('count', item)
            self.assertIsInstance(item['count'], int)

    def test_get_top_movies_watchlist_all(self):
        """Test getting top movies from watchlist for all time."""
        url = '/admin/analytics/api/top-movies/'
        response = self.client.get(url, {'type': 'watchlist', 'range': 'all'}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        
        self.assertEqual(data['type'], 'watchlist')
        self.assertEqual(data['range'], 'all')

    def test_get_top_movies_watched(self):
        """Test getting top watched movies."""
        url = '/admin/analytics/api/top-movies/'
        response = self.client.get(url, {'type': 'watched', 'range': '7d'}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        
        self.assertEqual(data['type'], 'watched')
        self.assertEqual(data['range'], '7d')

    def test_get_top_movies_invalid_type(self):
        """Test that invalid type parameter returns 400."""
        url = '/admin/analytics/api/top-movies/'
        response = self.client.get(url, {'type': 'invalid', 'range': '7d'}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_top_movies_invalid_range(self):
        """Test that invalid range parameter returns 400."""
        url = '/admin/analytics/api/top-movies/'
        response = self.client.get(url, {'type': 'watchlist', 'range': 'invalid'}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ErrorLogsAPITests(APITestCase):
    """
    Tests for GET /admin/analytics/api/error-logs/ endpoint.
    
    Tests cover:
    - Staff authentication required
    - Filtering by api_type, date_from, date_to, user_id
    - Pagination
    - Sorting
    - Response structure validation
    """

    @classmethod
    def setUpTestData(cls):
        """Create test data once for all tests."""
        # Create staff user
        cls.staff_user = User.objects.create_user(
            username='admin_errorlogs',
            email='admin_errorlogs@test.com',
            password='testpass123',
            is_staff=True,
            is_active=True,
        )
        
        # Create test users
        cls.user1 = User.objects.create_user(
            username='user1_errorlogs',
            email='user1_errorlogs@test.com',
            password='testpass123',
            is_active=True,
        )
        
        cls.user2 = User.objects.create_user(
            username='user2_errorlogs',
            email='user2_errorlogs@test.com',
            password='testpass123',
            is_active=True,
        )
        
        # Use dates from 2024 to match partition structure (IntegrationErrorLog is partitioned by month)
        # Table is partitioned by RANGE(occurred_at) monthly, so we need dates that match existing partitions
        from datetime import datetime
        base_date = datetime(2024, 1, 15, 12, 0, 0, tzinfo=dt_timezone.utc)
        
        # Create error logs with dates from 2024 (to match partition structure)
        cls.error1 = IntegrationErrorLog.objects.create(
            occurred_at=base_date + timedelta(days=1),
            api_type='tmdb',
            error_message='Test error 1',
            user_id=cls.user1.id,
        )
        
        cls.error2 = IntegrationErrorLog.objects.create(
            occurred_at=base_date + timedelta(days=2),
            api_type='watchmode',
            error_message='Test error 2',
            user_id=cls.user1.id,
        )
        
        cls.error3 = IntegrationErrorLog.objects.create(
            occurred_at=base_date + timedelta(days=3),
            api_type='tmdb',
            error_message='Test error 3',
            user_id=cls.user2.id,
        )
        
        cls.error4 = IntegrationErrorLog.objects.create(
            occurred_at=base_date + timedelta(days=10),
            api_type='gemini',
            error_message='Test error 4',
            user_id=None,
        )

    def setUp(self):
        """Set up for each test."""
        self.client.force_authenticate(user=self.staff_user)
        # Set Accept header to ensure JSON response (not HTML redirect)
        self.client.credentials(HTTP_ACCEPT='application/json')

    def test_get_error_logs_requires_staff(self):
        """Test that endpoint requires staff permissions."""
        url = '/admin/analytics/api/error-logs/'
        
        # Test without authentication - should return 401 (Unauthorized)
        self.client.force_authenticate(user=None)
        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_error_logs_response_structure(self):
        """Test that response has correct structure."""
        url = '/admin/analytics/api/error-logs/'
        response = self.client.get(url, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        
        # Check required fields
        required_fields = ['items', 'page', 'page_size', 'total', 'total_pages']
        for field in required_fields:
            self.assertIn(field, data, f"Missing field: {field}")
        
        # Check items structure
        self.assertIsInstance(data['items'], list)
        if len(data['items']) > 0:
            item = data['items'][0]
            self.assertIn('id', item)
            self.assertIn('occurred_at', item)
            self.assertIn('api_type', item)
            self.assertIn('error_message', item)
            self.assertIn('user_id', item)

    def test_get_error_logs_filter_by_api_type(self):
        """Test filtering by api_type."""
        url = '/admin/analytics/api/error-logs/'
        response = self.client.get(url, {'api_type': ['tmdb']}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        
        # All items should be tmdb
        for item in data['items']:
            self.assertEqual(item['api_type'], 'tmdb')

    def test_get_error_logs_filter_by_user_id(self):
        """Test filtering by user_id."""
        url = '/admin/analytics/api/error-logs/'
        response = self.client.get(url, {'user_id': str(self.user1.id)}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        
        # All items should belong to user1
        # Backend returns user_id as string
        expected_user_id = str(self.user1.id)
        for item in data['items']:
            self.assertEqual(str(item['user_id']), expected_user_id)

    def test_get_error_logs_pagination(self):
        """Test pagination."""
        url = '/admin/analytics/api/error-logs/'
        response = self.client.get(url, {'page': 1, 'page_size': 2}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        
        self.assertEqual(data['page'], 1)
        self.assertEqual(data['page_size'], 2)
        self.assertLessEqual(len(data['items']), 2)

    def test_get_error_logs_sorting(self):
        """Test sorting."""
        url = '/admin/analytics/api/error-logs/'
        
        # Test ascending sort
        response = self.client.get(url, {'sort': 'occurred_at'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Test descending sort (default)
        response = self.client.get(url, {'sort': '-occurred_at'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Test invalid sort
        response = self.client.get(url, {'sort': 'invalid'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

