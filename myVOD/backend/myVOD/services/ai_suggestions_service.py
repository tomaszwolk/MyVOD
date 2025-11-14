"""
Service layer for AI movie suggestions.

This module contains business logic for generating and retrieving
AI-powered movie suggestions based on user's watchlist and watched history.
"""

import logging
import json
import re
from datetime import datetime, time
import os
from django.db import DatabaseError, transaction
from django.db.models import Q
from django.utils import timezone
from django.conf import settings
from movies.models import (
    AiSuggestionBatch,
    UserMovie,
    MovieAvailability,
    UserPlatform,
    IntegrationErrorLog,
    Movie,
)
from collections import Counter

try:
    import google.generativeai as genai  # type: ignore

    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    genai = None  # type: ignore
    logger = logging.getLogger(__name__)
    logger.warning(
        "google.generativeai not installed - AI suggestions will return empty results"
    )

logger = logging.getLogger(__name__)


class InsufficientDataError(Exception):
    """Raised when user doesn't have enough data for AI suggestions."""

    pass


class RateLimitError(Exception):
    """Raised when user has already received suggestions today."""

    pass


def get_or_generate_suggestions(user, debug=False):
    """
    Get cached AI suggestions or generate new ones if needed.

    This function implements business logic for GET /api/suggestions/

    Rate Limiting:
        - One suggestion batch per calendar day (based on server timezone)
        - Cached suggestions valid until end of day (23:59:59)
        - Next suggestions available at start of next day (00:00:00)
        - If debug=True, bypasses rate limiting and always generates new suggestions

    Args:
        user: Authenticated Django User instance
        debug: If True, disables daily rate limiting for testing (default: False)

    Returns:
        dict: AI suggestions data with structure:
            {
                'expires_at': datetime,
                'suggestions': [
                    {
                        'tconst': str,
                        'primary_title': str,
                        'start_year': int or None,
                        'justification': str,
                        'availability': [
                            {
                                'platform_id': int,
                                'platform_name': str,
                                'is_available': bool
                            },
                            ...
                        ]
                    },
                    ...
                ]
            }

    Raises:
        InsufficientDataError: If user has no watchlist/watched movies
        RateLimitError: If suggestions were already generated today (unless debug=True)
        DatabaseError: If database operation fails
    """
    if debug:
        logger.info(
            f"Debug mode enabled for user {user.email} - bypassing rate limiting"
        )

    try:
        # Get current date (server timezone)
        now = timezone.now()
        today_start = timezone.make_aware(datetime.combine(now.date(), time.min))
        today_end = timezone.make_aware(datetime.combine(now.date(), time.max))

        # Check for cached suggestions from today (skip if debug)
        cached_batch = None
        if not debug:
            cached_batch = (
                AiSuggestionBatch.objects.filter(
                    user_id=user.id,
                    generated_at__gte=today_start,
                    generated_at__lte=today_end,
                )
                .order_by("-generated_at")
                .first()
            )

        if cached_batch:
            logger.info(
                f"Returning cached suggestions for user {user.email} "
                f"generated at {cached_batch.generated_at}"
            )
            return _format_cached_suggestions(user, cached_batch)

        # No cached suggestions - need to generate new ones
        logger.info(
            f"No cached suggestions found for user {user.email}, "
            f"generating new suggestions"
        )

        # Validate user has watchlist/watched movies
        user_movies_count = (
            UserMovie.objects.filter(user_id=user.id)
            .filter(
                Q(watchlisted_at__isnull=False, watchlist_deleted_at__isnull=True)
                | Q(watched_at__isnull=False)
            )
            .count()
        )

        if user_movies_count == 0:
            logger.warning(
                f"User {user.email} has no movies in watchlist or watched history"
            )
            raise InsufficientDataError(
                "You need to add movies to your watchlist or mark movies as watched "
                "before we can generate personalized suggestions."
            )

        # Validate user has VOD platforms configured
        user_platforms_count = UserPlatform.objects.filter(user_id=user.id).count()
        if user_platforms_count == 0:
            logger.warning(f"User {user.email} has no VOD platforms configured")
            raise InsufficientDataError(
                "You need to configure at least one VOD platform in your profile "
                "before we can generate suggestions based on available content."
            )

        # Generate new suggestions
        return _generate_new_suggestions(user, today_end)

    except (InsufficientDataError, RateLimitError):
        # Re-raise business logic errors
        raise

    except DatabaseError as e:
        logger.error(
            f"Database error while fetching suggestions for {user.email}: {str(e)}",
            exc_info=True,
        )
        raise


def _format_cached_suggestions(user, cached_batch):
    """
    Format cached suggestion batch into response structure.
    Handles the new structure where suggestions are a dict keyed by platform.
    Flattens the suggestions into a single list for the API response.

    Args:
        user: Authenticated Django User instance
        cached_batch: AiSuggestionBatch instance

    Returns:
        dict: Formatted suggestions with availability data
    """
    suggestions_by_platform = cached_batch.response or {}
    if not isinstance(suggestions_by_platform, dict):
        logger.warning(
            f"Cached response for batch {cached_batch.id} is not a dict. Returning empty."
        )
        suggestions_by_platform = {}

    # Flatten suggestions from all platforms into a single list
    all_suggestions = []
    for platform_name, suggestions in suggestions_by_platform.items():
        if isinstance(suggestions, list):
            all_suggestions.extend(suggestions)
        else:
            logger.warning(
                f"Suggestions for platform '{platform_name}' in batch {cached_batch.id} are not a list."
            )

    # Get user's selected platform IDs
    user_platform_ids = list(
        UserPlatform.objects.filter(user_id=user.id).values_list(
            "platform_id", flat=True
        )
    )
    suggestion_tconsts = [s.get("tconst") for s in all_suggestions if s.get("tconst")]

    # Enrich suggestions with movie data and availability in single queries
    movies_data = {
        m["tconst"]: m
        for m in Movie.objects.filter(tconst__in=suggestion_tconsts).values(
            "tconst", "primary_title", "start_year", "poster_path", "genres"
        )
    }
    all_availability = _get_bulk_movie_availability(
        suggestion_tconsts, user_platform_ids
    )

    enriched_suggestions = []
    for suggestion in all_suggestions:
        tconst = suggestion.get("tconst")
        if not tconst or tconst not in movies_data:
            continue

        movie_data = movies_data[tconst]
        availability = all_availability.get(tconst, [])

        enriched_suggestions.append(
            {
                "tconst": tconst,
                "primary_title": movie_data.get("primary_title"),
                "start_year": movie_data.get("start_year"),
                "poster_path": movie_data.get("poster_path"),
                "genres": movie_data.get("genres"),
                "justification": suggestion.get("justification", ""),
                "availability": availability,
            }
        )

    return {"expires_at": cached_batch.expires_at, "suggestions": enriched_suggestions}


def _generate_new_suggestions(user, expires_at):
    """
    Generate new AI suggestions and cache them.

    Args:
        user: Authenticated Django User instance
        expires_at: Expiration datetime (end of current day)

    Returns:
        dict: Generated suggestions with availability data

    Raises:
        DatabaseError: If database operation fails
    """
    try:
        with transaction.atomic():
            # Get user's watchlist and watched movies
            user_movies = (
                UserMovie.objects.filter(user_id=user.id)
                .filter(
                    Q(watchlisted_at__isnull=False, watchlist_deleted_at__isnull=True)
                    | Q(watched_at__isnull=False)
                )
                .select_related("tconst")
                .values(
                    "tconst__tconst",
                    "tconst__primary_title",
                    "tconst__genres",
                    "tconst__start_year",
                    "watchlisted_at",
                    "watched_at",
                    "user_rating",  # Include user_rating
                )
            ).order_by('-watched_at', '-watchlisted_at')[:200]

            # Get user's platforms
            user_platform_qs = UserPlatform.objects.filter(
                user_id=user.id
            ).select_related("platform")
            user_platform_ids = list(
                user_platform_qs.values_list("platform_id", flat=True)
            )
            user_platform_names = [up.platform.platform_name for up in user_platform_qs]

            # Generate AI suggestions with error handling
            try:
                # First, allow tests to hook into a mock generator if patched.
                # If it returns None, fall back to the real AI implementation.
                mock_result = _generate_mock_suggestions(
                    user, user_movies, user_platform_ids, user_platform_names
                )

                if mock_result is not None:
                    suggestions_data = mock_result
                else:
                    # Real implementation
                    suggestions_data = _generate_ai_suggestions(
                        user, user_movies, user_platform_ids, user_platform_names
                    )

                logger.info(
                    f"Successfully generated AI suggestions for user {user.email}"
                )

            except Exception as ai_error:
                # Log integration error to database
                _log_integration_error(
                    api_type="gemini",
                    error_message=str(ai_error),
                    error_details={
                        "user_id": str(user.id),
                        "user_email": user.email,
                        "movie_count": len(user_movies),
                        "error_type": type(ai_error).__name__,
                    },
                    user_id=user.id,
                )

                logger.error(
                    f"AI generation error for user {user.email}: {str(ai_error)}",
                    exc_info=True,
                )

                # For MVP, return empty suggestions on AI failure
                # This allows the endpoint to work even without AI integration
                suggestions_data = []

            # Cache the suggestions (even if empty)
            batch = AiSuggestionBatch.objects.create(
                user_id=user.id,
                expires_at=expires_at,
                prompt=f"Generate suggestions for user based on {len(user_movies)} movies",
                response=suggestions_data,
            )

            logger.info(
                f"Cached suggestions for user {user.email} "
                f"(batch_id={batch.id}, count={len(suggestions_data)})"
            )

            # Format and return
            return _format_cached_suggestions(user, batch)

    except DatabaseError as e:
        logger.error(
            f"Database error while generating suggestions for {user.email}: {str(e)}",
            exc_info=True,
        )
        raise


def _generate_mock_suggestions(
    user, user_movies, user_platform_ids, user_platform_names
):
    """
    Test hook to allow unit/integration tests to patch and simulate AI behavior.

    By default returns None to indicate no mock behavior.
    Tests can patch this function to return a list of suggestions or raise
    an exception to exercise error handling and logging paths.
    """
    return None


def _analyze_user_preferences(user_movies, user_platforms):
    """
    Analyze user's movie preferences for diversity.

    Computes top 3 genres from watchlist + watched movies.
    Suggests proportional platform distribution (max 2 per platform).

    Args:
        user_movies: List of user movie dicts
        user_platforms: List of UserPlatform instances

    Returns:
        dict: {'top_genres': list[str], 'platform_distribution': dict[int, int]}
    """
    # Collect all genres from user's movies
    all_genres = []
    for movie in user_movies:
        genres = movie.get("tconst__genres", [])
        if genres:
            all_genres.extend(genres)

    # Top 3 genres
    genre_counts = Counter(all_genres)
    top_genres = [genre for genre, _ in genre_counts.most_common(3)]

    num_platforms = len(user_platforms)
    if num_platforms == 0:
        platform_dist = {}
    else:
        # Proportional: e.g., 2 platforms -> 3+2; 5 -> 1 each
        base = 5 // num_platforms
        extra = 5 % num_platforms
        platform_dist = {}
        for i, up in enumerate(user_platforms):
            count = base + (1 if i < extra else 0)
            platform_dist[up.platform_id] = min(count, 2)  # Max 2 per platform

    logger.info(
        f"User preferences: Top genres {top_genres}, Platform dist {platform_dist}"
    )

    return {"top_genres": top_genres, "platform_distribution": platform_dist}


def _generate_ai_suggestions(user, user_movies, user_platform_ids, user_platform_names):
    """
    Generate AI-powered movie suggestions using Google Gemini.

    This function calls the Gemini API to get personalized movie recommendations
    based on the user's watchlist, watched history, and movies available on their
    subscribed VOD platforms from our local database.
    """
    # Check if Gemini is available
    if not GEMINI_AVAILABLE:
        logger.warning(
            f"Gemini AI not available for user {user.email} - "
            f"google.generativeai not installed"
        )
        return []

    # Check if API key is configured
    if not settings.GEMINI_API_KEY:
        logger.error("GEMINI_API_KEY not configured in settings")
        _log_integration_error(
            api_type="gemini",
            error_message="GEMINI_API_KEY not configured",
            error_details={"user_email": user.email},
            user_id=user.id,
        )
        return []

    logger.info(
        f"Generating AI suggestions for user {user.email} "
        f"based on {len(user_movies)} movies and {len(user_platform_ids)} platforms"
    )

    watchlist = []
    watched = []
    try:
        # Configure Gemini API
        genai.configure(api_key=settings.GEMINI_API_KEY)  # type: ignore[attr-defined]
        model = genai.GenerativeModel("gemini-2.5-flash-lite")  # type: ignore[attr-defined]

        # Prepare user context
        watchlist = [
            m
            for m in user_movies
            if m.get("watchlisted_at") and not m.get("watched_at")
        ]
        watched = [m for m in user_movies if m.get("watched_at")]

        # Get available movies on user's platforms from our local DB
        available_movies = _get_available_movies_for_platforms(
            user_platform_ids, user_movies
        )

        if not available_movies:
            logger.warning(
                f"No movies available in local DB for user {user.email}'s platforms - "
                f"cannot generate suggestions"
            )
            return []

        # Get user's platforms for analysis
        user_platform_qs = UserPlatform.objects.filter(user_id=user.id).select_related(
            "platform"
        )
        user_platforms = list(user_platform_qs)

        # Analyze preferences for diversity
        preferences = _analyze_user_preferences(user_movies, user_platforms)

        # Build prompt with user data, available movies, and preferences
        prompt = _build_gemini_prompt(
            watchlist,
            watched,
            available_movies,
            user_platform_names,
            preferences["top_genres"],
            preferences["platform_distribution"],
        )

        logger.info(f"Prompt length: {len(prompt)} characters")
        logger.debug(
            f"Full prompt sent to Gemini:\n{prompt}"
        )  # Use debug to avoid flooding logs

        # Call Gemini API with updated config for diversity
        response = model.generate_content(
            prompt,
            generation_config={  # type: ignore[arg-type]
                "temperature": 0.5,  # Lower for more consistent diversity
                "top_k": 40,  # Limit to top 40 tokens for controlled creativity
                "max_output_tokens": 2500,
                "top_p": 0.9,
            },
            request_options={"timeout": 30},
        )

        raw_response_text = response.text
        logger.info(f"Raw Gemini response: {raw_response_text[:500]}...")

        # Save raw response to a file for debugging
        try:
            log_dir = os.path.join(settings.BASE_DIR, "suggestions_ai")
            os.makedirs(log_dir, exist_ok=True)
            timestamp = timezone.now().strftime("%Y-%m-%d_%H-%M-%S")
            filename = f"llm_response_{user.id}_{timestamp}.json"
            filepath = os.path.join(log_dir, filename)
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(raw_response_text)
            logger.info(f"Saved raw LLM response to {filepath}")
        except Exception as log_e:
            logger.error(f"Failed to save LLM response to file: {log_e}")

        # Parse and validate response
        suggestions = _parse_gemini_response(raw_response_text)

        if not suggestions:
            logger.warning(
                f"Gemini returned no valid suggestions for user {user.email}"
            )
            return []

        # Validate tconst IDs against database
        valid_suggestions = _validate_suggestions(
            suggestions, user_movies, available_movies, user_platform_ids
        )

        if not valid_suggestions:
            logger.warning(
                f"Gemini returned no valid suggestions for user {user.email} after validation"
            )
            return {}

        logger.info(
            f"Successfully generated and validated suggestions for {len(valid_suggestions)} platforms "
            f"for user {user.email}"
        )

        return valid_suggestions

    except Exception as e:
        logger.error(f"Gemini API error for user {user.email}: {str(e)}", exc_info=True)
        _log_integration_error(
            api_type="gemini",
            error_message=str(e),
            error_details={
                "user_email": user.email,
                "user_movies_count": len(user_movies),
                "error_type": type(e).__name__,
                "watchlist_count": len(watchlist),
                "watched_count": len(watched),
            },
            user_id=user.id,
        )
        return []  # Return empty list on error


def _get_available_movies_for_platforms(user_platform_ids, user_movies):
    """
    Get movies available on user's subscribed VOD platforms.
    """
    if not user_platform_ids:
        logger.warning("No user_platform_ids provided")
        return []

    # Get set of watched movie tconst IDs to exclude
    watched_tconsts = set()
    for movie in user_movies:
        if movie.get("watched_at"):  # Only exclude actually watched movies
            tconst = movie.get("tconst__tconst")
            if tconst:
                watched_tconsts.add(tconst)

    logger.info(
        f"Excluding {len(watched_tconsts)} watched movies for platforms: {user_platform_ids}"
    )

    # Query movies available on user's platforms
    available_movies = (
        MovieAvailability.objects.filter(
            platform_id__in=user_platform_ids, is_available=True
        )
        .exclude(tconst__in=watched_tconsts)
        .select_related("tconst", "platform")
        .values(
            "tconst__tconst",
            "tconst__primary_title",
            "tconst__start_year",
            "tconst__genres",
            "tconst__avg_rating",
            "tconst__num_votes",
            "platform__platform_name",
        )
        .order_by(
            '-tconst__num_votes',  # Prioritize popular movies
            '-tconst__avg_rating'
        )[:250]  # Limit to top 250 to keep prompt size reasonable
    )

    logger.info(f"Query returned {len(available_movies)} available movies")

    # Group by tconst and aggregate platform names
    movies_dict = {}
    for item in available_movies:
        tconst = item["tconst__tconst"]
        if tconst not in movies_dict:
            movies_dict[tconst] = {
                "tconst": tconst,
                "title": item["tconst__primary_title"],
                "year": item["tconst__start_year"],
                "genres": item["tconst__genres"] or [],
                "rating": item["tconst__avg_rating"],
                "num_votes": item["tconst__num_votes"],
                "platforms": [],
            }
        movies_dict[tconst]["platforms"].append(item["platform__platform_name"])

    result = list(movies_dict.values())
    if result:
        sample_tconsts = [m["tconst"] for m in result[:5]]
        logger.info(f"Sample available tconsts: {sample_tconsts}")
    logger.info(
        f"Final available movies count: {len(result)} across {len(user_platform_ids)} platforms"
    )
    return result


def _build_gemini_prompt(
    watchlist, watched, available_movies, user_platform_names, top_genres, platform_dist
):
    """
    Build a detailed prompt for Gemini AI with user's movie context, available movies, and diversity principles for per-platform suggestions.

    Args:
        watchlist: List of user's current watchlist movies
        watched: List of user's watched movies
        available_movies: List of available movies on user's platforms
        user_platform_names: List of user's subscribed platform names
        top_genres: List of top 3 user genres (used for context, not strict rules)
        platform_dist: (No longer used, kept for signature compatibility for now)
    """
    logger.info(
        f"Building per-platform diverse prompt for platforms: {user_platform_names}"
    )

    prompt_parts = [
        "You are an expert movie recommendation system. Your task is to generate 5 diverse movie suggestions "
        "FOR EACH of the user's subscribed VOD platforms, based on their taste but designed to broaden their horizons.",
        "",
        "## User's Subscribed VOD Platforms:",
        f"Generate separate suggestion lists for each of these platforms: {', '.join(user_platform_names)}.",
        "",
        "## User's Current Watchlist (movies they plan to watch):",
    ]

    if watchlist:
        for movie in watchlist:  # Remove limit
            title = movie.get("tconst__primary_title", "Unknown")
            year = movie.get("tconst__start_year", "N/A")
            genres = movie.get("tconst__genres", [])
            genres_str = ", ".join(genres) if genres else "N/A"
            prompt_parts.append(f"- {title} ({year}) - Genres: {genres_str}")
    else:
        prompt_parts.append("(No movies in watchlist)")

    prompt_parts.extend(["", "## Movies User Has Watched:"])

    if watched:
        for movie in watched:  # Remove limit
            title = movie.get("tconst__primary_title", "Unknown")
            year = movie.get("tconst__start_year", "N/A")
            genres = movie.get("tconst__genres", [])
            imdb_rating = movie.get("tconst__avg_rating", "N/A")
            user_rating = movie.get("user_rating")
            genres_str = ", ".join(genres) if genres else "N/A"

            rating_info = f"IMDb Rating: {imdb_rating}/10"
            if user_rating:
                rating_info += f", Your Rating: {user_rating}/10"

            prompt_parts.append(
                f"- {title} ({year}) - Genres: {genres_str} - {rating_info}"
            )
    else:
        prompt_parts.append("(No watched movies)")

    prompt_parts.extend(
        [
            "",
            "## Available Movies on User's Platforms:",
            f"Here are {len(available_movies)} movies currently available on the user's streaming platforms.",
            "CRITICAL: You MUST choose suggestions ONLY from this exact list below. Do NOT suggest any other movies. Do NOT hallucinate tconst IDs.",
            "Every suggested movie's tconst MUST appear in this list.",
            "",
        ]
    )

    # Add sample of available movies (limit to keep prompt reasonable)
    for movie in available_movies:  # Remove limit
        title = movie.get("title", "Unknown")
        year = movie.get("year", "N/A")
        tconst = movie.get("tconst", "")
        genres = movie.get("genres", [])
        rating = movie.get("rating", "N/A")
        num_votes = movie.get("num_votes", 0)
        platforms = ", ".join(movie.get("platforms", []))
        genres_str = ", ".join(genres) if genres else "N/A"

        prompt_parts.append(
            f"- [{tconst}] {title} ({year}) - Genres: {genres_str} - "
            f"Rating: {rating}/10 ({num_votes} votes) - Platforms: {platforms}"
        )

    prompt_parts.extend(
        [
            "",
            "## Your Task & Diversity Principles:",
            "For EACH platform, generate a list of 5 movie suggestions. Apply these principles to EACH list of 5:",
            "1. **Thematic Variety**: Avoid suggesting movies from the same franchise heavily present in the user's history.",
            "2. **Genre Exploration**: The 5 suggestions should cover at least 3 different genres. Actively look for genres outside the user's top 3.",
            "3. **Popularity Variety**: Include at least one 'Hidden Gem' (high rating > 7.5, lower popularity).",
            "4. **Temporal Variety**: Include a mix of modern films (last 10 years) and at least one classic (pre-2000).",
            "5. **Strict Selection**: You MUST choose suggestions ONLY from the 'Available Movies' list provided.",
            "",
            "## Response Format:",
            "Return ONLY a valid JSON object (no markdown, no code blocks, no explanatory text) "
            "where keys are the platform names (EXACTLY as provided: "
            + ", ".join(f'"{name}"' for name in user_platform_names)
            + ") "
            "and values are arrays of 5 suggestions.",
            "{",
            f'  "{user_platform_names[0]}": [',
            '    { "tconst": "tt0468569", "justification": "Brief reason why this movie fits their taste (max 200 characters)." }',
            "    // ... 4 more suggestions for this platform",
            "  ],",
            '  "Another Platform": [ ... ]',
            "}",
            "",
            "## Final CRITICAL Rules (MUST be followed):",
            "1. **Choose ONLY from the 'Available Movies' list provided.** Do NOT suggest any movie whose `tconst` is not on that list.",
            "2. **The user has already seen the movies in the 'Movies User Has Watched' section. Do NOT suggest these movies again.**",
            "3. **Do NOT suggest the same movie (`tconst`) more than once** across ALL platforms. If a movie is on multiple platforms, pick ONE platform for it. All suggestions in the final JSON must be unique.",
            "4. Ensure each platform has exactly 5 suggestions.",
            "5. Return ONLY a single, valid JSON object.",
            "",
            "Generate suggestions now:"
        ]
    )

    return "\n".join(prompt_parts)


def _parse_gemini_response(response_text):
    """
    Parse JSON response from Gemini API.

    Handles various response formats:
    - Pure JSON object
    - JSON wrapped in markdown code blocks
    - Text with embedded JSON

    Args:
        response_text: Raw text response from Gemini

    Returns:
        dict: Parsed suggestions as a dictionary, or empty dict on error
    """
    if not response_text:
        logger.warning("Empty response from Gemini")
        return {}

    try:
        # Try direct JSON parse first
        suggestions = json.loads(response_text)
        if isinstance(suggestions, dict):
            return suggestions

    except json.JSONDecodeError:
        # Try extracting JSON from markdown code blocks
        json_pattern = r"```(?:json)?\s*(\{.*?\})\s*```"
        matches = re.findall(json_pattern, response_text, re.DOTALL)

        if matches:
            try:
                suggestions = json.loads(matches[0])
                if isinstance(suggestions, dict):
                    return suggestions
            except json.JSONDecodeError:
                pass

        # Try finding JSON object in text
        object_pattern = r'\{\s*".*?"\s*:\s*\[.*?\]\s*\}'
        matches = re.findall(object_pattern, response_text, re.DOTALL)

        if matches:
            for match in matches:
                try:
                    suggestions = json.loads(match)
                    if isinstance(suggestions, dict):
                        return suggestions
                except json.JSONDecodeError:
                    continue

    logger.error(f"Failed to parse Gemini response as JSON: {response_text[:200]}...")
    return {}


def _validate_suggestions(
    suggestions, user_movies, available_movies, user_platform_ids
):
    """
    Validate suggestions from Gemini against database and user's movies.
    Now includes basic diversity check for each platform.
    """
    if not suggestions or not isinstance(suggestions, dict):
        return {}

    watched_tconsts = {
        movie.get("tconst__tconst") for movie in user_movies if movie.get("watched_at")
    }
    available_tconsts = {m["tconst"] for m in available_movies}
    tconst_pattern = re.compile(r"^tt\d{7,}$")

    validated_suggestions_by_platform = {}

    for platform_name, platform_suggestions in suggestions.items():
        if not isinstance(platform_suggestions, list):
            logger.warning(
                f"Suggestions for platform '{platform_name}' are not a list, skipping."
            )
            continue

        validated_for_platform = []
        for suggestion in platform_suggestions:
            if not isinstance(suggestion, dict):
                continue

            tconst = suggestion.get("tconst", "").strip()
            justification = suggestion.get("justification", "").strip()

            if not tconst or not tconst_pattern.match(tconst):
                logger.debug(f"Invalid tconst format: {tconst} for {platform_name}")
                continue
            if tconst in watched_tconsts:
                logger.debug(f"Skipping {tconst} for {platform_name} - already watched")
                continue
            if tconst not in available_tconsts:
                logger.warning(
                    f"Skipping {tconst} for {platform_name} - not in available movie list"
                )
                continue

            if not justification:
                justification = "Recommended based on your preferences"
            elif len(justification) > 200:
                justification = justification[:197] + "..."

            try:
                movie = (
                    Movie.objects.filter(tconst=tconst)
                    .values(
                        "tconst", "primary_title", "start_year", "poster_path", "genres"
                    )
                    .first()
                )

                if not movie:
                    logger.debug(
                        f"Movie {tconst} not found in database, skipping for {platform_name}"
                    )
                    continue

                validated_for_platform.append(
                    {
                        "tconst": tconst,
                        "primary_title": movie["primary_title"],
                        "start_year": movie["start_year"],
                        "poster_path": movie["poster_path"],
                        "genres": movie["genres"],
                        "justification": justification,
                    }
                )
            except Exception as e:
                logger.warning(
                    f"Error validating movie {tconst} for {platform_name}: {str(e)}"
                )
                continue

        # We store whatever valid suggestions we got for the platform
        validated_suggestions_by_platform[platform_name] = validated_for_platform
        logger.info(
            f"Validated {len(validated_for_platform)} suggestions for platform '{platform_name}'"
        )

    return validated_suggestions_by_platform


def _get_movie_availability(tconst, platform_ids):
    """
    Get movie availability on specified platforms.

    Args:
        tconst: Movie IMDb identifier
        platform_ids: List of platform IDs to check

    Returns:
        list: Availability information for each platform:
            [
                {
                    'platform_id': int,
                    'platform_name': str,
                    'is_available': bool
                },
                ...
            ]
    """
    if not platform_ids:
        return []

    # Query availability where is_available = True
    availability_data = (
        MovieAvailability.objects.filter(
            tconst=tconst, platform_id__in=platform_ids, is_available=True
        )
        .select_related("platform")
        .values("platform_id", "platform__platform_name", "is_available")
    )

    return [
        {
            "platform_id": item["platform_id"],
            "platform_name": item["platform__platform_name"],
            "is_available": item["is_available"],
        }
        for item in availability_data
    ]


def _log_integration_error(api_type, error_message, error_details=None, user_id=None):
    """
    Log integration error to database.
    """
    try:
        error_log = IntegrationErrorLog.objects.create(
            api_type=api_type,
            error_message=error_message,
            error_details=error_details or {},
            user_id=user_id,
            occurred_at=timezone.now(),
        )
        return error_log

    except Exception as e:
        # Don't let logging errors break the main flow
        logger.error(f"Failed to log integration error: {str(e)}", exc_info=True)


def _get_bulk_movie_availability(tconsts, platform_ids):
    """
    Get movie availability for multiple movies on specified platforms in a single query.
    """
    if not platform_ids or not tconsts:
        return {}

    availability_data = (
        MovieAvailability.objects.filter(
            tconst__in=tconsts, platform_id__in=platform_ids, is_available=True
        )
        .select_related("platform")
        .values("tconst", "platform_id", "platform__platform_name")
    )

    # Group results by tconst
    results = {tconst: [] for tconst in tconsts}
    for item in availability_data:
        results[item["tconst"]].append(
            {
                "platform_id": item["platform_id"],
                "platform_name": item["platform__platform_name"],
                "is_available": True,
            }
        )
    return results
