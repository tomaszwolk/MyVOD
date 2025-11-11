"""Unit tests for movie_search_service."""

from django.core.cache import cache
from django.test import TestCase
from unittest.mock import patch

from movies.models import Movie  # type: ignore
from movies.serializers import MovieSearchResultSerializer
from services.movie_search_service import (  # type: ignore
    _calculate_similarity_threshold,
    _normalize_search_query,
    search_movies,
)


class MovieSearchServiceTests(TestCase):
    """
    Test suite for search_movies service function.

    Tests cover:
    - Successful search with results
    - Search with no results
    - Edge cases (empty query, whitespace)
    - Ordering of results
    """

    @classmethod
    def setUpTestData(cls):
        """
        Create test data once for all tests in this class.

        Creates a set of movies with different titles, ratings, and years
        to test various search scenarios.
        """
        # Create test movies with unique titles and tconst to avoid collisions with real IMDB data
        cls.movie1 = Movie.objects.create(
            tconst="tt9990001",
            primary_title="TestMovie Stellar Journey",
            start_year=2014,
            avg_rating=8.6,
            num_votes=250000,
        )
        cls.movie2 = Movie.objects.create(
            tconst="tt9990002",
            primary_title="TestMovie Stellar Friendship",
            start_year=2011,
            avg_rating=8.5,
            num_votes=180000,
        )
        cls.movie3 = Movie.objects.create(
            tconst="tt9990003",
            primary_title="TestMovie Dream Within",
            start_year=2010,
            avg_rating=8.8,
            num_votes=220000,
        )
        cls.movie4 = Movie.objects.create(
            tconst="tt9990004",
            primary_title="TestMovie Digital World",
            start_year=1999,
            avg_rating=8.7,
            num_votes=150000,
        )
        cls.movie5 = Movie.objects.create(
            tconst="tt9990005",
            primary_title="TestMovie Digital World Reloaded",
            start_year=2003,
            avg_rating=7.2,
            num_votes=120000,
        )

    def setUp(self):
        cache.clear()

    def test_search_with_exact_match(self):
        """Test searching for a movie with exact title match."""
        results = search_movies("TestMovie Stellar Journey")

        self.assertGreater(len(results), 0)
        self.assertEqual(results[0]["tconst"], "tt9990001")
        self.assertEqual(results[0]["primary_title"], "TestMovie Stellar Journey")

    def test_search_with_partial_match(self):
        """Test searching for movies with partial title match."""
        results = search_movies("TestMovie Digital World")

        # Should find both Digital World movies
        result_titles = [movie["primary_title"] for movie in results]
        self.assertIn("TestMovie Digital World", result_titles)
        self.assertIn("TestMovie Digital World Reloaded", result_titles)

    def test_search_case_insensitive(self):
        """Test that search is case-insensitive."""
        results_lower = search_movies("testmovie stellar journey")
        results_upper = search_movies("TESTMOVIE STELLAR JOURNEY")
        results_mixed = search_movies("TeStMoViE StElLaR JoUrNeY")

        # All should return the same movie
        self.assertGreater(len(results_lower), 0)
        self.assertGreater(len(results_upper), 0)
        self.assertGreater(len(results_mixed), 0)

        self.assertEqual(results_lower[0]["tconst"], "tt9990001")
        self.assertEqual(results_upper[0]["tconst"], "tt9990001")
        self.assertEqual(results_mixed[0]["tconst"], "tt9990001")

    def test_search_with_fuzzy_match(self):
        """Test fuzzy matching with slight misspellings."""
        # TrigramSimilarity should handle small variations
        results = search_movies("TestMovie Dream Withn")  # Missing 'i'

        # Should still find "TestMovie Dream Within"
        self.assertGreater(len(results), 0)
        result_titles = [movie["primary_title"] for movie in results]
        self.assertIn("TestMovie Dream Within", result_titles)

    def test_search_no_results(self):
        """Test search with query that returns no results."""
        # Use a string that is extremely unlikely to match any movie title
        # Using only special characters and numbers without common letter patterns
        results = search_movies("###$$$%%%^^^&&&***|||~~~```")

        # Should return empty queryset or very few results with low similarity
        # Note: Trigram similarity with threshold 0.1 might return some low-quality matches
        self.assertLessEqual(len(results), 5, "Expected 0-5 results for nonsensical query")

    def test_search_empty_string(self):
        """Test that empty string returns no results."""
        results = search_movies("")

        self.assertEqual(len(results), 0)

    def test_search_whitespace_only(self):
        """Test that whitespace-only string returns no results."""
        results = search_movies("   ")

        self.assertEqual(len(results), 0)

    def test_search_with_leading_trailing_whitespace(self):
        """Test that search strips whitespace correctly."""
        results = search_movies("  TestMovie Stellar Journey  ")

        self.assertGreater(len(results), 0)
        self.assertEqual(results[0]["primary_title"], "TestMovie Stellar Journey")

    def test_search_ordering_by_similarity(self):
        """Test that results are ordered by similarity score."""
        results = search_movies("TestMovie Stellar")

        # Should return movies with "TestMovie Stellar" first
        self.assertGreater(len(results), 0)

        # The most similar results should come first
        top_titles = [movie["primary_title"] for movie in results[:3]]
        # At least one should start with "TestMovie Stellar"
        self.assertTrue(
            any(title.startswith("TestMovie Stellar") for title in top_titles)
        )

    def test_search_prefers_higher_num_votes_on_tie(self):
        """When similarity ties, the movie with higher num_votes should rank higher."""

        high_votes_movie = Movie.objects.create(
            tconst="tt9995001",
            primary_title="Popularity Tie Movie",
            start_year=2012,
            avg_rating=7.5,
            num_votes=300000,
        )
        low_votes_movie = Movie.objects.create(
            tconst="tt9995002",
            primary_title="Popularity Tie Movie",
            start_year=2011,
            avg_rating=7.6,
            num_votes=10000,
        )
        null_votes_movie = Movie.objects.create(
            tconst="tt9995003",
            primary_title="Popularity Tie Movie",
            start_year=2010,
            avg_rating=7.7,
            num_votes=None,
        )

        results = search_movies("Popularity Tie Movie")

        self.assertGreaterEqual(len(results), 3)
        returned_tconsts = [result["tconst"] for result in results[:3]]
        self.assertEqual(returned_tconsts[0], high_votes_movie.tconst)
        self.assertEqual(returned_tconsts[1], low_votes_movie.tconst)
        self.assertEqual(returned_tconsts[2], null_votes_movie.tconst)

    def test_search_limit_results(self):
        """Test that search respects the limit parameter."""
        # Create more movies to test limit (using unique tconst values)
        for i in range(25):
            Movie.objects.create(
                tconst=f"tt9991{i:03d}",  # Use unique prefix to avoid collision
                primary_title=f"Test Movie {i}",
                start_year=2000 + i,
                avg_rating=7.0,
                num_votes=50000,
            )

        results = search_movies("Test", limit=10)

        # Should return at most 10 results
        self.assertLessEqual(len(results), 10)

    def test_search_returns_list(self):
        """Search service should return serialized list payload."""

        results = search_movies("TestMovie Stellar Journey")

        self.assertIsInstance(results, list)

    def test_search_results_include_num_votes(self):
        """Search results should expose num_votes for popularity ranking."""

        results = search_movies("TestMovie Digital World")
        self.assertGreater(len(results), 0)
        self.assertIn("num_votes", results[0])

    @patch('movies.serializers.update_movie_poster.delay')
    def test_search_uses_cache_on_subsequent_calls(self, mock_update_poster_delay):
        """Second identical search should hit cache and avoid DB queries."""
        # First call: populates the cache and should trigger poster updates
        with self.assertNumQueries(1):
            search_movies("TestMovie Stellar Journey")

        # The delay method should have been called for the results in the first search
        self.assertTrue(mock_update_poster_delay.called)

        # Reset the mock to clear the call history before the second search
        mock_update_poster_delay.reset_mock()

        # Second call: should hit the cache, perform no DB queries,
        # and should NOT trigger poster updates again.
        with self.assertNumQueries(0):
            search_movies("TestMovie Stellar Journey")

        # Verify that the poster update task was NOT called during the second, cached search
        mock_update_poster_delay.assert_not_called()

    def test_similarity_threshold_selection(self):
        """Similarity threshold should scale with normalized query length."""

        normalized_short = _normalize_search_query("Ma")
        threshold_short, length_short = _calculate_similarity_threshold(normalized_short)
        self.assertEqual(threshold_short, 0.1)
        self.assertEqual(length_short, 2)

        normalized_medium = _normalize_search_query("Matr")
        threshold_medium, length_medium = _calculate_similarity_threshold(normalized_medium)
        self.assertEqual(threshold_medium, 0.2)
        self.assertEqual(length_medium, 4)

        normalized_long = _normalize_search_query("Matrix")
        threshold_long, length_long = _calculate_similarity_threshold(normalized_long)
        self.assertEqual(threshold_long, 0.4)
        self.assertEqual(length_long, 6)

        normalized_with_spaces = _normalize_search_query(" ma tr ix ")
        threshold_with_spaces, length_with_spaces = _calculate_similarity_threshold(normalized_with_spaces)
        self.assertEqual(threshold_with_spaces, 0.4)
        self.assertEqual(length_with_spaces, 6)

    def test_search_with_special_characters(self):
        """Test search with special characters in query."""
        # Create movie with special characters
        Movie.objects.create(
            tconst="tt9993001",
            primary_title="TestMovie: The Epic Quest & Adventure!",
            start_year=2001,
            avg_rating=8.8,
            num_votes=90000,
        )

        results = search_movies("TestMovie Epic Quest")

        # Should find the movie despite special characters
        self.assertGreater(len(results), 0)
        result_titles = [movie["primary_title"] for movie in results]
        self.assertTrue(
            any("TestMovie: The Epic Quest" in title for title in result_titles)
        )

    def test_search_accent_insensitive(self):
        """Search should be accent-insensitive (e.g., Amélie vs Amelie)."""
        Movie.objects.create(
            tconst="tt9992001",
            primary_title="TestMovie Café París",
            start_year=2001,
            avg_rating=8.3,
            num_votes=80000,
        )

        results = search_movies("TestMovie Cafe Paris")

        self.assertGreaterEqual(len(results), 1)
        titles = [movie["primary_title"] for movie in results]
        self.assertIn("TestMovie Café París", titles)

    def test_movie_search_result_serializer_includes_num_votes(self):
        """Serializer should expose num_votes field for API consumers."""

        movie = Movie.objects.get(tconst="tt9990001")
        serialized = MovieSearchResultSerializer(movie)
        serialized_data = dict(serialized.data)
        self.assertIn("num_votes", serialized_data)
        self.assertEqual(serialized_data["num_votes"], movie.num_votes)
