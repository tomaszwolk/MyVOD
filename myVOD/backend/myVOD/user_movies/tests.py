import uuid
from unittest.mock import patch

from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status

from movies.models import Movie, Platform, UserMovie, MovieAvailability, UserPlatform  # type: ignore
from dotenv import load_dotenv
import os
from django.utils import timezone

load_dotenv()


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


class UserMovieAPITests(APITestCase):
    def setUp(self):
        # Create unique test data for each test run to avoid interference
        self.test_user_id = uuid.uuid4()
        from django.contrib.auth import get_user_model

        User = get_user_model()
        self.user1, _ = User.objects.get_or_create(
            id=self.test_user_id,
            defaults={
                'email': f'testuser_{self.test_user_id}@example.com',
                'username': f'testuser_{self.test_user_id}',
                'is_active': True,
            },
        )

        self.user2, _ = User.objects.get_or_create(
            id=uuid.uuid4(),
            defaults={
                'email': f'testuser2_{uuid.uuid4()}@example.com',
                'username': f'testuser2_{uuid.uuid4()}',
                'is_active': True,
            },
        )

        # Create unique movies for this test run
        test_suffix = str(uuid.uuid4())[:8]
        self.movie1, _ = Movie.objects.get_or_create(
            tconst=f"tt0000001_{test_suffix}", defaults={"primary_title": "Movie 1", "avg_rating": 8.5}
        )
        self.movie2, _ = Movie.objects.get_or_create(
            tconst=f"tt0000002_{test_suffix}", defaults={"primary_title": "Movie 2", "avg_rating": 9.0}
        )
        self.movie3, _ = Movie.objects.get_or_create(
            tconst=f"tt0000003_{test_suffix}", defaults={"primary_title": "Movie 3", "avg_rating": 7.0}
        )

        self.platform1, _ = Platform.objects.get_or_create(
            id=1, defaults={"platform_slug": "netflix", "platform_name": "Netflix"}
        )
        self.platform2, _ = Platform.objects.get_or_create(
            id=2, defaults={"platform_slug": "hbo", "platform_name": "HBO"}
        )

        UserPlatform.objects.get_or_create(
            user_id=self.user1.id, platform_id=self.platform1.id
        )

        MovieAvailability.objects.get_or_create(
            tconst=self.movie1,
            platform=self.platform1,
            defaults={
                "is_available": True,
                "last_checked": "2023-10-01T10:00:00Z",
                "source": "test",
            },
        )
        MovieAvailability.objects.get_or_create(
            tconst=self.movie2,
            platform=self.platform1,
            defaults={
                "is_available": False,
                "last_checked": "2023-10-01T10:00:00Z",
                "source": "test",
            },
        )
        MovieAvailability.objects.get_or_create(
            tconst=self.movie3,
            platform=self.platform2,
            defaults={
                "is_available": True,
                "last_checked": "2023-10-01T10:00:00Z",
                "source": "test",
            },
        )

        # Create fresh UserMovie records
        UserMovie.objects.create(
            user_id=self.user1.id,
            tconst=self.movie1,
            watchlisted_at="2023-10-01T10:00:00Z",
            watchlist_deleted_at=None,
            watched_at=None,
        )
        UserMovie.objects.create(
            user_id=self.user1.id,
            tconst=self.movie2,
            watched_at="2023-10-02T10:00:00Z",
            watchlisted_at=None,
            watchlist_deleted_at=None,
        )
        UserMovie.objects.create(
            user_id=self.user1.id,
            tconst=self.movie3,
            watchlisted_at="2023-10-03T10:00:00Z",
            watchlist_deleted_at=None,
            watched_at=None,
        )

        self.url = reverse("usermovie-list")

    def tearDown(self):
        # Clean up test data to ensure test isolation
        UserMovie.objects.filter(user_id__in=[self.user1.id, self.user2.id]).delete()
        UserPlatform.objects.filter(user_id__in=[self.user1.id, self.user2.id]).delete()
        MovieAvailability.objects.filter(tconst__in=[self.movie1, self.movie2, self.movie3]).delete()

    def test_authentication_required(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_watchlist(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {"status": "watchlist"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 2)
        # Check that both expected movies are in the results
        tconsts = [item["movie"]["tconst"] for item in response.data["results"]]
        self.assertIn(self.movie1.tconst, tconsts)
        self.assertIn(self.movie3.tconst, tconsts)

    def test_get_watched_list(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {"status": "watched"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["movie"]["tconst"], self.movie2.tconst)

    def test_filter_by_is_available(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(
            self.url, {"status": "watchlist", "is_available": "true"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["movie"]["tconst"], self.movie1.tconst)

    def test_ordering_by_rating(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(
            self.url, {"status": "watchlist", "ordering": "-tconst__avg_rating"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["results"][0]["movie"]["avg_rating"], "8.5")
        self.assertEqual(response.data["results"][1]["movie"]["avg_rating"], "7.0")

    def test_invalid_status_parameter(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {"status": "invalid_status"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_other_user_cannot_see_data(self):
        self.client.force_authenticate(user=self.user2)
        response = self.client.get(self.url, {"status": "watchlist"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 0)

    def test_invalid_ordering_parameter_returns_400(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(
            self.url, {"status": "watchlist", "ordering": "primary_title"}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_is_available_parameter_returns_400(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(
            self.url, {"status": "watchlist", "is_available": "foo"}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_is_available_false_for_watched(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(
            self.url, {"status": "watched", "is_available": "false"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["movie"]["tconst"], self.movie2.tconst)

    def test_is_available_false_for_watchlist_returns_empty(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(
            self.url, {"status": "watchlist", "is_available": "false"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 0)


class UserMoviePostAPITests(APITestCase):
    """Tests for POST /api/user-movies/ endpoint"""

    def setUp(self):
        self.test_user_id = resolve_test_user_uuid()
        from django.contrib.auth import get_user_model
        User = get_user_model()

        self.user1, _ = User.objects.get_or_create(
            id=self.test_user_id,
            defaults={
                'email': 'test@example.com',
                'username': 'testuser',
                'is_active': True
            }
        )

        self.patcher = patch('services.user_movies_service._resolve_user_uuid')
        self.mock_get_uuid = self.patcher.start()
        self.mock_get_uuid.return_value = str(self.test_user_id)

        self.movie1, _ = Movie.objects.get_or_create(
            tconst="tt0111161", defaults={"primary_title": "The Shawshank Redemption", "avg_rating": 9.3}
        )
        self.movie2, _ = Movie.objects.get_or_create(
            tconst="tt0068646", defaults={"primary_title": "The Godfather", "avg_rating": 9.2}
        )
        self.movie_for_restore, _ = Movie.objects.get_or_create(
            tconst="tt0071562", defaults={"primary_title": "The Godfather Part II", "avg_rating": 9.0}
        )

        self.platform1, _ = Platform.objects.get_or_create(
            id=1, defaults={"platform_slug": "netflix", "platform_name": "Netflix"}
        )
        self.platform2, _ = Platform.objects.get_or_create(
            id=2, defaults={"platform_slug": "hbo", "platform_name": "HBO Max"}
        )

        UserPlatform.objects.get_or_create(
            user_id=self.test_user_id, platform_id=self.platform1.id
        )
        UserPlatform.objects.get_or_create(
            user_id=self.test_user_id, platform_id=self.platform2.id
        )

        MovieAvailability.objects.get_or_create(
            tconst=self.movie1,
            platform=self.platform1,
            defaults={
                "is_available": True,
                "last_checked": "2023-10-01T10:00:00Z",
                "source": "test",
            },
        )
        MovieAvailability.objects.get_or_create(
            tconst=self.movie1,
            platform=self.platform2,
            defaults={
                "is_available": False,
                "last_checked": "2023-10-01T10:00:00Z",
                "source": "test",
            },
        )

        UserMovie.objects.update_or_create(
            user_id=self.test_user_id,
            tconst=self.movie_for_restore,
            defaults={
                "watchlisted_at": "2023-10-01T10:00:00Z",
                "watchlist_deleted_at": "2023-10-05T10:00:00Z",
                "watched_at": None,
            },
        )

        self.existing_movie, _ = Movie.objects.get_or_create(
            tconst="tt0468569", defaults={"primary_title": "The Dark Knight", "avg_rating": 9.0}
        )
        UserMovie.objects.update_or_create(
            user_id=self.test_user_id,
            tconst=self.existing_movie,
            defaults={
                "watchlisted_at": "2023-10-01T10:00:00Z",
                "watchlist_deleted_at": None,
                "watched_at": None,
            },
        )

        self.url = reverse("usermovie-list")

    def tearDown(self):
        self.patcher.stop()

    def test_post_authentication_required(self):
        response = self.client.post(self.url, {"tconst": "tt0111161"})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_post_add_movie_successfully(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.post(self.url, {"tconst": "tt0111161"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("id", response.data)
        self.assertIn("movie", response.data)
        self.assertIn("availability", response.data)
        self.assertIn("watchlisted_at", response.data)
        self.assertIn("watched_at", response.data)

        self.assertEqual(response.data["movie"]["tconst"], "tt0111161")
        self.assertEqual(response.data["movie"]["primary_title"], "The Shawshank Redemption")
        self.assertEqual(response.data["movie"]["avg_rating"], "9.3")

        self.assertIsInstance(response.data["availability"], list)
        self.assertIsNotNone(response.data["watchlisted_at"])
        self.assertIsNone(response.data["watched_at"])

        user_movie = UserMovie.objects.get(user_id=self.test_user_id, tconst="tt0111161")
        self.assertIsNotNone(user_movie.watchlisted_at)
        self.assertIsNone(user_movie.watchlist_deleted_at)
        self.assertIsNone(user_movie.watched_at)

    def test_post_missing_tconst(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.post(self.url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("tconst", response.data)

    def test_post_invalid_tconst_format(self):
        self.client.force_authenticate(user=self.user1)

        invalid_tconsts = [
            "invalid",
            "tt123",
            "tt123456789",
            "123456789",
            "tt12345a7",
        ]

        for invalid_tconst in invalid_tconsts:
            response = self.client.post(self.url, {"tconst": invalid_tconst}, format="json")
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn("tconst", response.data)

    def test_post_movie_not_found(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.post(self.url, {"tconst": "tt9999999"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("tconst", response.data)
        self.assertIn("does not exist", str(response.data["tconst"]))

    def test_post_duplicate_movie_conflict(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.post(self.url, {"tconst": "tt0468569"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertIn("detail", response.data)
        self.assertIn("already on the watchlist", str(response.data["detail"]))

    def test_post_restore_soft_deleted_movie(self):
        self.client.force_authenticate(user=self.user1)

        user_movie_before = UserMovie.objects.get(
            user_id=self.test_user_id, tconst="tt0071562"
        )
        self.assertIsNotNone(user_movie_before.watchlist_deleted_at)

        response = self.client.post(self.url, {"tconst": "tt0071562"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.assertEqual(response.data["movie"]["tconst"], "tt0071562")
        self.assertIsNotNone(response.data["watchlisted_at"])
        self.assertIsNone(response.data["watched_at"])

        user_movie_after = UserMovie.objects.get(
            user_id=self.test_user_id, tconst="tt0071562"
        )
        self.assertIsNotNone(user_movie_after.watchlisted_at)
        self.assertIsNone(user_movie_after.watchlist_deleted_at)

    def test_post_user_isolation(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.post(self.url, {"tconst": "tt0068646"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        user1_movie = UserMovie.objects.filter(user_id=self.test_user_id, tconst="tt0068646").first()
        self.assertIsNotNone(user1_movie)

    def test_post_with_no_availability_data(self):
        movie_no_avail, _ = Movie.objects.get_or_create(
            tconst="tt9999998",
            defaults={"primary_title": "Test Movie No Availability", "avg_rating": 8.0}
        )

        self.client.force_authenticate(user=self.user1)
        response = self.client.post(self.url, {"tconst": "tt9999998"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["movie"]["tconst"], "tt9999998")
        self.assertIn("availability", response.data)
        self.assertEqual(response.data["availability"], [])


class UserMoviePatchAPITests(APITestCase):
    """Tests for PATCH /api/user-movies/<id>/ endpoint"""

    def setUp(self):
        self.test_user_id = resolve_test_user_uuid()

        from django.contrib.auth import get_user_model
        User = get_user_model()

        self.user1, _ = User.objects.get_or_create(
            id=self.test_user_id,
            defaults={
                'email': 'testpatch@example.com',
                'username': 'testpatchuser',
                'is_active': True
            }
        )

        self.patcher = patch('services.user_movies_service._resolve_user_uuid')
        self.mock_get_uuid = self.patcher.start()
        self.mock_get_uuid.return_value = str(self.test_user_id)

        self.movie_on_watchlist, _ = Movie.objects.get_or_create(
            tconst="tt1111111", defaults={"primary_title": "Watchlist Movie", "avg_rating": 8.5}
        )
        self.movie_already_watched, _ = Movie.objects.get_or_create(
            tconst="tt2222222", defaults={"primary_title": "Already Watched Movie", "avg_rating": 9.0}
        )

        self.platform1, _ = Platform.objects.get_or_create(
            id=1, defaults={"platform_slug": "netflix", "platform_name": "Netflix"}
        )
        self.platform2, _ = Platform.objects.get_or_create(
            id=2, defaults={"platform_slug": "hbo", "platform_name": "HBO Max"}
        )

        UserPlatform.objects.get_or_create(
            user_id=self.test_user_id, platform_id=self.platform1.id
        )
        UserPlatform.objects.get_or_create(
            user_id=self.test_user_id, platform_id=self.platform2.id
        )

        MovieAvailability.objects.get_or_create(
            tconst=self.movie_on_watchlist,
            platform=self.platform1,
            defaults={
                "is_available": True,
                "last_checked": "2023-10-01T10:00:00Z",
                "source": "test",
            },
        )
        MovieAvailability.objects.get_or_create(
            tconst=self.movie_already_watched,
            platform=self.platform1,
            defaults={
                "is_available": False,
                "last_checked": "2023-10-01T10:00:00Z",
                "source": "test",
            },
        )

        # FIX: Use timezone.now() for datetime objects instead of strings
        self.user_movie_watchlist = UserMovie.objects.create(
            user_id=self.test_user_id,
            tconst=self.movie_on_watchlist,
            watchlisted_at=timezone.now(),
            watchlist_deleted_at=None,
            watched_at=None,
        )

        # FIX: Use timezone.now() for datetime objects instead of strings
        self.user_movie_watched = UserMovie.objects.create(
            user_id=self.test_user_id,
            tconst=self.movie_already_watched,
            watchlisted_at=timezone.now(),
            watchlist_deleted_at=None,
            watched_at=timezone.now(),
        )

        self.url = reverse("usermovie-list")

    def tearDown(self):
        self.patcher.stop()

    def test_patch_authentication_required(self):
        patch_url = f"{self.url}{self.user_movie_watchlist.id}/"
        response = self.client.patch(
            patch_url,
            {"action": "mark_as_watched"},
            format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_patch_idor_protection_not_own_entry(self):
        self.client.force_authenticate(user=self.user1)
        non_existent_id = 99999999

        patch_url = f"{self.url}{non_existent_id}/"

        response = self.client.patch(
            patch_url,
            {"action": "mark_as_watched"},
            format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("detail", response.data)

    def test_patch_non_existent_entry(self):
        self.client.force_authenticate(user=self.user1)
        patch_url = f"{self.url}9999999/"

        response = self.client.patch(
            patch_url,
            {"action": "mark_as_watched"},
            format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("detail", response.data)

    def test_patch_mark_as_watched_success(self):
        self.client.force_authenticate(user=self.user1)
        patch_url = f"{self.url}{self.user_movie_watchlist.id}/"

        response = self.client.patch(
            patch_url,
            {"action": "mark_as_watched"},
            format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("id", response.data)
        self.assertIn("movie", response.data)
        self.assertIn("availability", response.data)
        self.assertIn("watchlisted_at", response.data)
        self.assertIn("watched_at", response.data)

        self.assertEqual(response.data["movie"]["tconst"], self.movie_on_watchlist.tconst)
        self.assertIsNotNone(response.data["watched_at"])

        updated_movie = UserMovie.objects.get(id=self.user_movie_watchlist.id)
        self.assertIsNotNone(updated_movie.watched_at)

    def test_patch_mark_as_watched_already_watched(self):
        self.client.force_authenticate(user=self.user1)
        patch_url = f"{self.url}{self.user_movie_watched.id}/"

        response = self.client.patch(
            patch_url,
            {"action": "mark_as_watched"},
            format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)
        self.assertIn("already marked as watched", str(response.data["detail"]))

    def test_patch_mark_as_watched_soft_deleted_movie(self):
        soft_deleted_movie, _ = Movie.objects.get_or_create(
            tconst="tt4444444", defaults={"primary_title": "Soft Deleted Movie", "avg_rating": 8.0}
        )
        MovieAvailability.objects.get_or_create(
            tconst=soft_deleted_movie,
            platform=self.platform1,
            defaults={
                "is_available": True,
                "last_checked": "2023-10-01T10:00:00Z",
                "source": "test",
            },
        )
        user_movie_deleted = UserMovie.objects.create(
            user_id=self.test_user_id,
            tconst=soft_deleted_movie,
            watchlisted_at=timezone.now(),
            watchlist_deleted_at=timezone.now(),
            watched_at=None,
        )

        self.client.force_authenticate(user=self.user1)
        patch_url = f"{self.url}{user_movie_deleted.id}/"

        response = self.client.patch(
            patch_url,
            {"action": "mark_as_watched"},
            format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)
        self.assertIn("must be on watchlist", str(response.data["detail"]))

    def test_patch_restore_to_watchlist_success(self):
        self.client.force_authenticate(user=self.user1)
        patch_url = f"{self.url}{self.user_movie_watched.id}/"

        response = self.client.patch(
            patch_url,
            {"action": "restore_to_watchlist"},
            format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["watched_at"])
        self.assertIsNotNone(response.data["watchlisted_at"])

        self.assertEqual(response.data["movie"]["tconst"], self.movie_already_watched.tconst)

        updated_movie = UserMovie.objects.get(id=self.user_movie_watched.id)
        self.assertIsNone(updated_movie.watched_at)
        self.assertIsNotNone(updated_movie.watchlisted_at)

    def test_patch_restore_to_watchlist_not_watched(self):
        self.client.force_authenticate(user=self.user1)
        patch_url = f"{self.url}{self.user_movie_watchlist.id}/"

        response = self.client.patch(
            patch_url,
            {"action": "restore_to_watchlist"},
            format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)
        self.assertIn("not marked as watched", str(response.data["detail"]))

    def test_patch_missing_action_field(self):
        self.client.force_authenticate(user=self.user1)
        patch_url = f"{self.url}{self.user_movie_watchlist.id}/"

        response = self.client.patch(patch_url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("action", response.data)

    def test_patch_invalid_action_value(self):
        self.client.force_authenticate(user=self.user1)
        patch_url = f"{self.url}{self.user_movie_watchlist.id}/"

        invalid_actions = [
            "invalid_action",
            "mark_watched",
            "restore",
            "Mark_As_Watched",
            "",
        ]

        for invalid_action in invalid_actions:
            response = self.client.patch(
                patch_url,
                {"action": invalid_action},
                format="json"
            )
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn("action", response.data)

    def test_patch_empty_request_body(self):
        self.client.force_authenticate(user=self.user1)
        patch_url = f"{self.url}{self.user_movie_watchlist.id}/"

        response = self.client.patch(patch_url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patch_response_structure_mark_as_watched(self):
        self.client.force_authenticate(user=self.user1)
        patch_url = f"{self.url}{self.user_movie_watchlist.id}/"

        response = self.client.patch(
            patch_url,
            {"action": "mark_as_watched"},
            format="json"
        )

        data = response.data
        self.assertIn("id", data)
        self.assertIn("movie", data)
        self.assertIn("availability", data)
        self.assertIn("watchlisted_at", data)
        self.assertIn("watched_at", data)

        movie = data["movie"]
        self.assertIn("tconst", movie)
        self.assertIn("primary_title", movie)
        self.assertIn("start_year", movie)
        self.assertIn("genres", movie)
        self.assertIn("avg_rating", movie)
        self.assertIn("poster_path", movie)

        self.assertIsInstance(data["availability"], list)
        if data["availability"]:
            avail = data["availability"][0]
            self.assertIn("platform_id", avail)
            self.assertIn("platform_name", avail)
            self.assertIn("is_available", avail)

    def test_patch_response_structure_restore_to_watchlist(self):
        self.client.force_authenticate(user=self.user1)
        patch_url = f"{self.url}{self.user_movie_watched.id}/"

        response = self.client.patch(
            patch_url,
            {"action": "restore_to_watchlist"},
            format="json"
        )

        self.assertIsNone(response.data["watched_at"])
        self.assertIsNotNone(response.data["watchlisted_at"])

    def test_patch_mark_as_watched_timestamp_is_recent(self):
        before_patch = timezone.now()

        self.client.force_authenticate(user=self.user1)
        patch_url = f"{self.url}{self.user_movie_watchlist.id}/"

        response = self.client.patch(
            patch_url,
            {"action": "mark_as_watched"},
            format="json"
        )

        after_patch = timezone.now()
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        watched_at_str = response.data["watched_at"]
        from dateutil import parser
        watched_at = parser.isoparse(watched_at_str.replace("Z", "+00:00"))

        self.assertGreaterEqual(watched_at, before_patch)
        self.assertLessEqual(watched_at, after_patch)

    def test_patch_preserves_other_fields(self):
        original_movie = UserMovie.objects.get(id=self.user_movie_watchlist.id)
        original_added_from_ai = original_movie.added_from_ai_suggestion
        original_watchlisted_at = original_movie.watchlisted_at

        self.client.force_authenticate(user=self.user1)
        patch_url = f"{self.url}{self.user_movie_watchlist.id}/"

        response = self.client.patch(
            patch_url,
            {"action": "mark_as_watched"},
            format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        updated_movie = UserMovie.objects.get(id=self.user_movie_watchlist.id)
        self.assertIsNotNone(updated_movie.watchlist_deleted_at)  # Should be soft-deleted from watchlist
        self.assertIsNotNone(updated_movie.watched_at)  # Should be marked as watched
        self.assertEqual(updated_movie.watchlisted_at, original_watchlisted_at)  # Should preserve original watchlist date
        self.assertEqual(updated_movie.added_from_ai_suggestion, original_added_from_ai)

    def test_patch_availability_filtered_by_user_platforms(self):
        self.client.force_authenticate(user=self.user1)
        patch_url = f"{self.url}{self.user_movie_watchlist.id}/"

        response = self.client.patch(
            patch_url,
            {"action": "mark_as_watched"},
            format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        availability = response.data["availability"]
        platform_ids = [a["platform_id"] for a in availability]

        for platform_id in platform_ids:
            self.assertIn(platform_id, [self.platform1.id, self.platform2.id])

    def test_patch_sequence_mark_and_restore(self):
        self.client.force_authenticate(user=self.user1)
        patch_url = f"{self.url}{self.user_movie_watchlist.id}/"

        response1 = self.client.patch(
            patch_url,
            {"action": "mark_as_watched"},
            format="json"
        )
        self.assertEqual(response1.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(response1.data["watched_at"])

        movie_after_mark = UserMovie.objects.get(id=self.user_movie_watchlist.id)
        self.assertIsNotNone(movie_after_mark.watched_at)
        self.assertIsNotNone(movie_after_mark.watchlist_deleted_at)  # Should be soft-deleted from watchlist

        response2 = self.client.patch(
            patch_url,
            {"action": "restore_to_watchlist"},
            format="json"
        )
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        self.assertIsNone(response2.data["watched_at"])

        movie_after_restore = UserMovie.objects.get(id=self.user_movie_watchlist.id)
        self.assertIsNone(movie_after_restore.watched_at)
        self.assertIsNone(movie_after_restore.watchlist_deleted_at)  # Should be restored to watchlist

    def test_patch_idempotent_sequence(self):
        self.client.force_authenticate(user=self.user1)
        patch_url = f"{self.url}{self.user_movie_watched.id}/"

        response1 = self.client.patch(
            patch_url,
            {"action": "restore_to_watchlist"},
            format="json"
        )
        self.assertEqual(response1.status_code, status.HTTP_200_OK)

        response2 = self.client.patch(
            patch_url,
            {"action": "restore_to_watchlist"},
            format="json"
        )
        self.assertEqual(response2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("not marked as watched", str(response2.data["detail"]))

    # ============================================================================
    # DELETE Endpoint Tests - Soft Delete Tests
    # ============================================================================

    def test_delete_success_returns_204_no_content(self):
        """Test that DELETE /api/user-movies/<id>/ returns 204 No Content on success."""
        self.client.force_authenticate(user=self.user1)
        delete_url = f"{self.url}{self.user_movie_watchlist.id}/"

        # Verify movie exists before deletion
        user_movie_before = UserMovie.objects.get(id=self.user_movie_watchlist.id)
        self.assertIsNone(user_movie_before.watchlist_deleted_at)
        self.assertIsNotNone(user_movie_before.watchlisted_at)

        # Delete the movie
        response = self.client.delete(delete_url)

        # Verify 204 No Content response (no body)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertIsNone(response.data)

        # Verify soft-delete in database
        user_movie_after = UserMovie.objects.get(id=self.user_movie_watchlist.id)
        self.assertIsNotNone(user_movie_after.watchlist_deleted_at)
        self.assertIsNotNone(user_movie_after.watchlisted_at)

    def test_delete_nonexistent_returns_404(self):
        """Test that DELETE nonexistent ID returns 404 Not Found."""
        self.client.force_authenticate(user=self.user1)
        delete_url = f"{self.url}99999/"

        response = self.client.delete(delete_url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("not found", str(response.data["detail"]).lower())

    def test_delete_already_deleted_returns_404(self):
        """Test that second DELETE returns 404 (pseudo-idempotency)."""
        self.client.force_authenticate(user=self.user1)
        delete_url = f"{self.url}{self.user_movie_watchlist.id}/"

        # First DELETE
        response1 = self.client.delete(delete_url)
        self.assertEqual(response1.status_code, status.HTTP_204_NO_CONTENT)

        # Second DELETE
        response2 = self.client.delete(delete_url)
        self.assertEqual(response2.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_without_authentication_returns_401(self):
        """Test that DELETE without authentication returns 401 Unauthorized."""
        delete_url = f"{self.url}{self.user_movie_watchlist.id}/"

        response = self.client.delete(delete_url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_delete_other_user_movie_returns_404(self):
        """Test IDOR protection: user cannot delete another user's movie."""
        # Create a second user in Django auth
        from django.contrib.auth import get_user_model

        User = get_user_model()
        user2_uuid = uuid.uuid4()
        User.objects.get_or_create(
            id=user2_uuid,
            defaults={
                'email': 'testuser2@example.com',
                'username': 'testuser2',
                'is_active': True,
            }
        )

        # Create movie for different user
        user2_movie = UserMovie.objects.create(
            user_id=user2_uuid,
            tconst=self.movie_on_watchlist,
            watchlisted_at=timezone.now()
        )

        # Try to delete as user1
        self.client.force_authenticate(user=self.user1)
        delete_url = f"{self.url}{user2_movie.id}/"

        response = self.client.delete(delete_url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # Verify NOT deleted
        user2_movie_after = UserMovie.objects.get(id=user2_movie.id)
        self.assertIsNone(user2_movie_after.watchlist_deleted_at)
