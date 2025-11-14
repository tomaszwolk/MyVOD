# Refactoring Plan: AI Suggestions Module

This document provides a detailed overview of the AI Suggestions feature in the MyVod backend, covering its state before and after the refactoring process.

## I. Section: Before refactoring

This section describes the initial implementation of the feature.

### 1. How It Works: High-Level Flow

The AI Suggestions feature generates personalized movie recommendations for users. The process is initiated when a user makes a `GET` request to the `/api/suggestions/` endpoint.

The backend logic follows these steps:
1.  **Check for Cached Suggestions**: The system first checks if there is a valid, non-expired cache of suggestions generated for the user on the current calendar day.
2.  **Return Cache if Available**: If a valid cache exists, the system formats and returns the cached suggestions, enriching them with current movie data (like posters and genres) and availability on the user's selected platforms.
3.  **Validate User Data**: If no cache is found, the system verifies if the user has enough data to generate suggestions (i.e., movies on their watchlist/watched history and at least one selected VOD platform). If not, it returns an error.
4.  **Generate New Suggestions**: If the user has sufficient data, a new set of suggestions is generated.
    *   It gathers the user's movie history (watchlist and watched movies).
    *   It identifies movies available on the user's VOD platforms from the local database, excluding movies the user has already watched.
    *   It constructs a detailed prompt for the Google Gemini AI model, including the user's movie lists, available movies, and diversity requirements.
    *   It calls the Gemini API to get a list of suggested movie `tconst` IDs and justifications.
    *   The response from the AI is parsed, validated (ensuring movies exist in the DB and are available), and enriched with details.
5.  **Cache and Return New Suggestions**: The newly generated suggestions are saved to the `AiSuggestionBatch` table in the database with an expiration time set to the end of the current day. The formatted suggestions are then returned to the user.

### 2. Core Functions and Files

The entire logic is primarily encapsulated within a single service file, with the API endpoint defined in the views file.

#### Files

-   **Service Logic**: `myVOD/backend/myVOD/services/ai_suggestions_service.py` - Contains all business logic for fetching, generating, caching, and formatting suggestions.
-   **API Endpoint**: `myVOD/backend/myVOD/myVOD/views.py` - Defines the `AISuggestionsView` which handles the incoming `GET /api/suggestions/` request and calls the service layer.

#### Key Functions (`ai_suggestions_service.py`)

##### `get_or_generate_suggestions(user, debug=False)`
-   **Description**: This is the main entry point function for the service. It orchestrates the entire process of checking the cache or triggering a new generation.
-   **Arguments**:
    -   `user`: The authenticated Django `User` object.
    -   `debug` (bool): A flag (defaults to `False`) that, when `True`, bypasses the daily rate limit and cache, forcing the generation of new suggestions.
-   **Returns**: A `dict` containing the suggestions in the format expected by the API serializer.
    
    {
        'expires_at': datetime,
        'suggestions': [
            {
                'tconst': str,
                'primary_title': str,
                'start_year': int,
                'poster_path': str,
                'genres': list[str],
                'justification': str,
                'availability': [...]
            },
            ...
        ]
    }
-   **Raises**: `InsufficientDataError`, `RateLimitError`.

##### `_generate_ai_suggestions(user, user_movies, user_platform_ids, user_platform_names)`
-   **Description**: This function is responsible for the core AI logic: preparing data, building the prompt, calling the Gemini API, and parsing the response.
-   **Arguments**:
    -   `user`: The authenticated Django `User` object.
    -   `user_movies`: A list of dictionaries representing the user's watchlist and watched movies.
    -   `user_platform_ids`: A list of integer IDs for the user's subscribed platforms.
    -   `user_platform_names`: A list of string names for the user's subscribed platforms.
-   **Returns**: A `list` of validated suggestion dictionaries, each containing `tconst` and `justification`. Returns an empty list if the AI call fails.

##### `_build_gemini_prompt(...)`
-   **Description**: Constructs the detailed text prompt that will be sent to the Gemini model.
-   **Arguments**:
    -   `watchlist`: List of user's watchlist movies.
    -   `watched`: List of user's watched movies.
    -   `available_movies`: List of movies available on the user's platforms.
    -   `user_platform_names`: List of user's platform names.
    -   `top_genres`: List of the user's top 3 genres.
    -   `platform_dist`: A dictionary suggesting how to distribute suggestions across platforms.
-   **Returns**: A `str` containing the complete prompt.

### 3. AI Model and Prompt

#### AI Model

-   **Model Used**: `gemini-2.5-flash-lite` as specified in the `_generate_ai_suggestions` function:
    `model = genai.GenerativeModel('gemini-2.5-flash-lite')`

#### Prompt Location and Content

The prompt is constructed dynamically in the `_build_gemini_prompt` function within `myVOD/backend/myVOD/services/ai_suggestions_service.py`.

The prompt is extensive and provides the AI with strong context and constraints. Here is a summary of its structure:

```text
You are an expert movie recommendation system. Your task is to suggest movies that are CURRENTLY AVAILABLE on the user's VOD streaming platforms with DIVERSITY.

## User's Subscribed VOD Platforms:
User has access to: {platform_names}.
Distribute suggestions proportionally: {platform_distribution}.
Ensure at least one from each if possible. No more than 2 from same platform.

## User's Current Watchlist (movies they plan to watch):
- {Title} ({Year}) - Genres: {Genres}
...

## Movies User Has Watched:
- {Title} ({Year}) - Genres: {Genres} - IMDb Rating: X/10, Your Rating: Y/10
...

## Available Movies on User's Platforms:
Here are {count} movies currently available...
CRITICAL: You MUST choose suggestions ONLY from this exact list below.
- [{tconst}] {Title} ({Year}) - Genres: {Genres} - Rating: X/10 - Platforms: {Platforms}
...

## User's Top Genres (from watchlist + watched):
Top 3: {top_genres}.
Structure suggestions: 3 from top genres (one per genre) + 1 popular outside top genres + 1 diverse surprise.
No more than 2 from same genre overall. Offer variety...

## Your Task:
Suggest 5 diverse movies from available list based on preferences.

## CRITICAL DIVERSITY REQUIREMENTS:
1. ONLY from available list...
2. 3 from top genres...
3. 1 popular movie outside top genres...
4. 1 surprise...
5. <=2 same genre/platform...
6. Variety: Mix recent/classic...
7. EXACT tconst from list
8. Mention genre/platform in justification...

## Response Format:
Return ONLY a valid JSON array... with this exact structure:
[
  {
    "tconst": "tt...",  // MUST be from available list
    "justification": "Brief reason..."
  }
]

## Important Rules:
- Verify diversity before suggesting
- ...
- ONLY JSON array

Generate diverse suggestions now:
```

### 4. Testing and Bypassing Limits

As documented in `tests_backend.md` and visible in the code, the daily rate limit can be bypassed for testing purposes.

-   **Method**: Make a `GET` request to the suggestions endpoint and include the query parameter `debug=true`.
-   **Endpoint**: `GET /api/suggestions/?debug=true`
-   **Behavior**: When the `debug` parameter is set to `true`, the `get_or_generate_suggestions` function skips the cache check and proceeds directly to generating new suggestions from the AI model on every request.

This allows developers and testers to repeatedly invoke the AI generation logic without having to wait for the daily limit to reset or manually clear the database cache.

---

## II. Section: After refactoring.

This section documents the changes made to the AI Suggestions module to improve the diversity and quality of recommendations.

### 1. Refactoring Goals and Implemented Changes

The primary goal of the refactoring was to address the issue of "monothematic" suggestions and provide the user with a wider, more interesting variety of movie recommendations.

The following changes were implemented in `myVOD/backend/myVOD/services/ai_suggestions_service.py`:

-   **Per-Platform Suggestions**: The core logic was shifted from generating 5 overall suggestions to generating **5 distinct suggestions for each of the user's subscribed VOD platforms**. This fundamentally increases the number and potential variety of recommendations.

-   **New Diversity Principles**: The old, rigid formula for diversity ("3 from top genres + 1 popular + 1 surprise") was replaced with a more nuanced set of guiding principles that the AI must apply to each platform's suggestion list:
    -   **Thematic Variety**: Avoid movies from the same franchise as those in the user's history.
    -   **Genre Exploration**: Ensure suggestions for each platform cover at least 3 different genres and actively seek genres outside the user's comfort zone.
    -   **Popularity Variety**: Include at least one "Hidden Gem" – a highly-rated but less popular movie.
    -   **Temporal Variety**: Recommend a mix of modern films and classics (pre-2000).

-   **Enhanced AI Prompt**: The prompt sent to the Gemini model was completely overhauled to reflect the new goals. It now explicitly requests a JSON object with platform names as keys and instructs the AI to follow the new diversity principles for each platform's list.

-   **Inclusion of Popularity Data**: To enable the "Hidden Gem" feature, the prompt was updated to include the number of votes (`num_votes`) for each movie in the `Available Movies` list. This gives the AI the necessary data to distinguish between widely popular hits and lesser-known, highly-rated films.

-   **Backend-Only Logic**: The new, complex JSON structure (a dictionary of lists) is handled entirely within the backend. The final step before sending the response to the frontend is to flatten all suggestions into a single list, ensuring **no changes are required on the frontend**. The API contract remains the same.

### 2. Initial Test Findings & Next Steps

Based on initial testing with a large user library (1200+ movies), the following issues were identified:

-   **Missing Platform Suggestions**: The AI model did not return any suggestions for certain platforms (e.g., Apple TV+, Prime Video), even when movies were known to be available for them in the database.
-   **Monothematic Suggestions**: Despite the new diversity rules, suggestions still felt too similar to the user's direct history, indicating that the context provided to the AI might still be too narrow.

To address these findings, the following next steps were planned:

1.  **Diagnose and Fix Platform Issue**: Investigate the data pipeline feeding the `Available Movies` list to the AI to ensure all subscribed platforms are correctly represented.
2.  **Increase User Context**: Remove the hard limits on the number of watchlist/watched movies passed to the AI. The system will be modified to send the user's entire movie history to provide a much richer context for generating diverse suggestions.

### 3. Second Test Cycle: Findings & Final Adjustments

After implementing the above changes, a second round of testing revealed new critical issues stemming from the massively increased prompt size (~1.4M characters / ~350k tokens).

-   **AI Rule-Breaking**: The AI model began to consistently break the core rules of the prompt.
    -   **Duplicated Suggestions**: It suggested the same movie multiple times across different platforms.
    -   **"Hallucinated" Suggestions**: It suggested movies that were not present in the provided `Available Movies` list.
-   **Root Cause Analysis**: The extreme length of the prompt was identified as the root cause. The model was losing track of critical instructions (like "no duplicates" and "only from this list"), which were defined at the end of the very long prompt.

To resolve this, a final set of adjustments were made:

1.  **Reintroduction of Smart Limits**: To keep the prompt within a reasonable size, intelligent limits were reintroduced:
    -   The user's movie history was limited to the **200 most recent** items (ordered by watched/watchlisted date).
    -   The list of `Available Movies` provided to the AI was limited to the **top 1000** most popular/highest-rated films.
2.  **Prompt Reinforcement**: The prompt instructions were strengthened to improve the model's adherence to rules:
    -   A new, explicit rule was added: **"Do NOT suggest the same movie (`tconst`) more than once across ALL platforms in your entire response."**
    -   The most critical rules were moved to a new `Final CRITICAL Rules` section at the very end of the prompt to ensure they are the last thing the model processes.

### 4. Third Test Cycle: Final Diagnosis and Solution

Further testing revealed that even with a 1000-movie limit, the model continued to occasionally duplicate suggestions and "hallucinate" movies not on the provided list. This confirmed that the prompt size was still the primary issue.

-   **Final Diagnosis**: The prompt, even when limited, remained too large for the model to handle with perfect accuracy. The sheer volume of data was causing the model to lose track of the critical final instructions.

To definitively solve this, a final, more aggressive optimization was implemented:

1.  **Drastic Reduction of `Available Movies`**: The limit for the list of available movies sent to the AI was significantly reduced from 1000 to **250**. This provides a much more focused and manageable context for the model, drastically reducing the prompt size while still offering a rich selection of high-quality films.
2.  **Reinforcement of Anti-Duplication Rules**: The prompt was further refined with even stronger and more explicit instructions to prevent both inter-platform and intra-platform duplication, and to forbid suggesting movies already watched by the user.

### 5. Fourth Test Cycle: Final Plan for Precision & Quality

After a thorough review of the latest test results, a final, multi-point plan was created to address the remaining nuanced issues and achieve the desired quality of recommendations.

-   **Diagnosis Summary**:
    -   **"Empty Platform" Issue**: The root cause was identified in the `_get_available_movies_for_platforms` function. Sorting all available movies by global popularity (`num_votes`) and then taking the top 250 resulted in a list dominated by major platforms (like Netflix), leaving few or no movies for smaller platforms (like Apple TV+).
    -   **"Watched Movie" Suggestions**: The logic for excluding watched movies was flawed. It only excluded movies from the user's most recent 200 items, not their entire watched history.
    -   **"Monothematic" Suggestions**: Despite improvements, the suggestions still lacked the desired "out-of-the-box" feeling.

-   **Final Action Plan**: The following comprehensive changes were agreed upon:

    1.  **Platform-Balanced Movie Pool**: The logic in `_get_available_movies_for_platforms` will be completely overhauled. Instead of fetching a single "top 250" list, it will now fetch a dynamically calculated number of top-rated movies **for each platform individually**, ensuring every subscribed platform is well-represented in the pool of available movies for the AI.
        -   1 platform: 250 movies total
        -   2 platforms: 125 movies per platform
        -   3 platforms: 80 movies per platform
        -   4 platforms: 62 movies per platform
        -   5+ platforms: 50 movies per platform
    2.  **Complete Watched History Exclusion**: The function will be modified to fetch the user's **entire** watched history to ensure no previously watched movie is ever included in the `Available Movies` list sent to the AI.
    3.  **"Negative" Genre Prompting**: A new mechanism will be added to identify genres the user **rarely** watches. This list of "unexplored" genres will be passed to the AI with an instruction to try and include suggestions from these categories, actively pushing for more diverse recommendations. The identified genres and their counts will also be logged for easier debugging.
    4.  **Post-Generation Deduplication**: As a final safeguard, a deduplication step will be added to the `_format_cached_suggestions` function. This will iterate through the AI's final response and remove any duplicate movies before sending the list to the frontend, guaranteeing a unique set of recommendations.
    5.  **Dynamic Suggestion Count**: The number of suggestions requested per platform will no longer be a fixed number. It will be calculated dynamically based on the number of platforms the user has, encouraging more suggestions when the user's focus is on fewer services.
        -   1-2 platforms: 6 suggestions per platform
        -   3 platforms: 5 suggestions per platform
        -   4+ platforms: 4 suggestions per platform

### 6. Upgrading the Prompt: "Anti-Bubble" & "Time Traveler"

To further enhance the diversity and personalization of suggestions, two advanced analytical features were implemented directly into the prompt-building process.

1.  **"Anti-Bubble" (Genre Gap Analysis)**:
    -   **Problem**: The previous system could only identify genres the user rarely watched, but couldn't recognize genres they had *never* watched, leading to a potential "filter bubble."
    -   **Solution**: A hardcoded, comprehensive `set` of all 28 available genres in the database was added to the service. The system now compares the user's watched genres against this master list to identify "unexplored genres."
    -   **Prompt Impact**: A new instruction was added to the prompt, explicitly asking the AI to find a highly-rated, accessible film from one of the user's unexplored genres to encourage discovery.

2.  **"Time Traveler" (Decade Analysis)**:
    -   **Problem**: Recommendations lacked a temporal dimension, ignoring a user's potential affinity for films from specific eras.
    -   **Solution**: The user's movie history is now analyzed to identify their most-watched decades ("golden eras") and decades they have largely ignored ("unexplored eras").
    -   **Prompt Impact**: The prompt was enhanced with two new instructions: one that acknowledges the user's favorite decades (e.g., "The user seems to love films from the 1990s") and another that encourages suggesting a film from an unexplored era as a potential pleasant surprise.

A helper script, `Helper_code/check_genres.py`, was also created to allow developers to easily compare the hardcoded genre set with the database to check for discrepancies as new movies are added.

### 7. Future Improvements

During the brainstorming phase, several advanced ideas for future iterations were proposed. These were postponed to keep the current implementation focused but offer exciting paths for further development.

1.  **"The Film Professor" (Creator-Based Analysis)**:
    -   **Concept**: Analyze the user's history for favorite directors and lead actors.
    -   **Implementation**: The prompt could ask the AI to find other works by a favorite director, films by creators with a similar style, or movies featuring actors known for similar roles. This would mimic how cinephiles recommend films to each other.
    -   **Prerequisite**: This would require adding actor and director data to the `Movie` model.

2.  **"The Mood Ring" (Sentiment & Thematic Analysis)**:
    -   **Concept**: Move beyond rigid genres and focus on the *feel* and *themes* of movies.
    -   **Implementation**: Use an LLM in a preliminary step to analyze plot summaries of the user's favorite films and generate "mood tags" (e.g., `'dark psychological thriller'`, `'witty black comedy'`). These tags would then be used in the main prompt to find films with a similar vibe, regardless of their official genre.
    -   **Prerequisite**: This would require adding plot summaries to the `Movie` model.

