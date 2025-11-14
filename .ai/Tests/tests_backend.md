# Backend Testing Guide

This document provides a comprehensive guide to testing the backend of the MyVOD application.

## 1. Database Management

### Populating Movie Availability

To import the movie availability database from the Watchmode API for specific platforms:

```bash
cd myVOD/backend/
python manage.py populate_availability [platform_slug_1] [platform_slug_2]
# Example:
# python manage.py populate_availability netflix primevideo
```

### Updating Availability Changes

To get only the latest changes from the Watchmode API:

```bash
cd myVOD/backend/
python manage.py update_availability_changes
```

## 2. Running Automated Tests

All tests are run from the `myVOD/backend/` directory.

### Running All Tests

To run the entire test suite with verbosity:

```bash
cd myVOD/backend/
python manage.py test --verbosity 2
```

### Running Specific Test Modules

You can run tests for specific applications or modules:

```bash
# General tests
python manage.py test myVOD.tests.test_platforms
python manage.py test myVOD.tests.test_user_profile
python manage.py test myVOD.tests.test_registration
python manage.py test movies.tests
python manage.py test analytics.tests

# Service tests
python manage.py test services.tests.test_movie_search_service
python manage.py test services.tests.test_user_registration_service
python manage.py test services.tests.test_watchmode_service -v 2
```

### AI Suggestions Tests

To run all unit and integration tests for the AI suggestions feature:

```bash
cd myVOD/backend/
python manage.py test services.tests.test_ai_suggestions_service myVOD.tests.test_ai_suggestions --verbosity 2
```

You can also run them separately:

```bash
# Unit tests (16 tests)
python manage.py test services.tests.test_ai_suggestions_service --verbosity 2

# Specific unit test classes
python manage.py test services.tests.test_ai_suggestions_service.GetOrGenerateSuggestionsTests
python manage.py test services.tests.test_ai_suggestions_service.FormatCachedSuggestionsTests
python manage.py test services.tests.test_ai_suggestions_service.GetMovieAvailabilityTests
python manage.py test services.tests.test_ai_suggestions_service.LogIntegrationErrorTests

# Integration tests (14 tests)
python manage.py test myVOD.tests.test_ai_suggestions --verbosity 2

# Specific integration test class
python manage.py test myVOD.tests.test_ai_suggestions.AISuggestionsGetAPITests
```

## 3. Manual API Testing

### Test User & Authentication

-   **Username:** `testuser`
-   **Email:** `test@example.com`
-   **Password:** `testpass123`
-   **Postgres `auth.users.id`:** `2489b2a0-9037-44c6-ad71-5a0820fc2280`

#### Generating a JWT Token

You can generate a JWT token for the test user using the Django shell or via the API.

**Option 1: Django Shell**

```bash
cd myVOD/backend/
python manage.py shell
```

Then run the following Python script:

```python
from rest_framework_simplejwt.tokens import AccessToken
import uuid

# Mock user object with the test user's UUID
class MockUser:
    id = uuid.UUID("2489b2a0-9037-44c6-ad71-5a0820fc2280")
    is_active = True

user = MockUser()

# Generate token
token = AccessToken()
token['user_id'] = str(user.id)
token['email'] = 'testuser@example.com' # Optional

access_token = str(token)
print("\\n" + "="*60)
print("ACCESS TOKEN (with UUID):")
print("="*60)
print(access_token)
print("="*60 + "\\n")
```

**Option 2: API Endpoint**

Ensure the test user exists in the database first (see "Preparing Test Data" sections).

```bash
curl -X POST http://localhost:8000/api/token/ \
  -H 'Content-Type: application/json' \
  -d '{"email": "test@example.com", "password": "Test1234"}'
```

### Endpoint: `GET /api/platforms/`

This endpoint retrieves a list of all VOD platforms. No authentication is required.

**Test Request:**

```bash
curl -X GET http://localhost:8000/api/platforms/ \
  -H "Content-Type: application/json"
```

**Expected Response (200 OK):**

```json
[
  {"id": 1, "platform_slug": "netflix", "platform_name": "Netflix"},
  {"id": 2, "platform_slug": "hbo-max", "platform_name": "HBO Max"}
]
```

**Database Verification:**

To check or add platforms, use the Django shell:

```bash
cd myVOD/backend/
python manage.py shell
```

```python
from movies.models import Platform

# Check existing platforms
platforms = Platform.objects.all()
print(f"Total platforms: {platforms.count()}")
for p in platforms:
    print(f"ID: {p.id}, Slug: {p.platform_slug}, Name: {p.platform_name}")

# Add sample platforms if they don't exist
Platform.objects.get_or_create(
    platform_slug='netflix',
    defaults={'platform_name': 'Netflix'}
)
Platform.objects.get_or_create(
    platform_slug='hbo-max',
    defaults={'platform_name': 'HBO Max'}
)
```

### Endpoint: `GET /api/suggestions/`

This endpoint generates personalized movie suggestions. Authentication is required.

**Test Cases:**

1.  **Without Authentication (401 Unauthorized)**

    ```bash
    curl -X GET http://localhost:8000/api/suggestions/ \
      -H "Content-Type: application/json"
    ```

2.  **Authenticated, Empty Watchlist (404 Not Found)**

    ```bash
    curl -X GET http://localhost:8000/api/suggestions/ \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer <ACCESS_TOKEN>"
    ```

3.  **Successful Generation (200 OK)**
    This will trigger a call to the AI service if no suggestions are cached for the day.

    ```bash
    curl -X GET http://localhost:8000/api/suggestions/ \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer <ACCESS_TOKEN>"
    ```

4.  **Cached Suggestions (200 OK)**
    A second request on the same day should return the cached response instantly.

    ```bash
    curl -X GET http://localhost:8000/api/suggestions/ \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer <ACCESS_TOKEN>"
    ```

5.  **Bypassing Daily Limit (Debug Mode)**
    To bypass the daily rate limit for testing, add the `debug=true` query parameter. This will force the generation of new suggestions with every request.

    ```bash
    curl -X GET http://localhost:8000/api/suggestions/?debug=true \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer <ACCESS_TOKEN>"
    ```

## 4. Database Verification & Preparation

All scripts are run via the Django shell from `myVOD/backend/`.

### Preparing Test Data for Suggestions

This script creates a test user, a movie, adds the movie to the user's watchlist, and sets up platform availability.

```bash
cd myVOD/backend/
python manage.py shell
```

```python
from django.contrib.auth import get_user_model
from movies.models import Movie, UserMovie, Platform, UserPlatform, MovieAvailability
from django.utils import timezone
import uuid

User = get_user_model()

# Get or create test user
user, _ = User.objects.get_or_create(
    email='test@example.com',
    defaults={'username': 'test@example.com'}
)
if not user.has_usable_password():
    user.set_password('Test1234')
    user.save()

# Add test movie
movie, _ = Movie.objects.get_or_create(
    tconst='tt0111161',
    defaults={
        'primary_title': 'The Shawshank Redemption',
        'start_year': 1994,
        'genres': ['Drama'],
        'avg_rating': 9.3
    }
)

# Add movie to user's watchlist
UserMovie.objects.get_or_create(
    user_id=user.id,
    tconst=movie,
    defaults={'watchlisted_at': timezone.now()}
)

# Add platform and link to user
platform, _ = Platform.objects.get_or_create(
    platform_slug='netflix',
    defaults={'platform_name': 'Netflix'}
)
UserPlatform.objects.get_or_create(
    user_id=user.id,
    platform=platform
)

# Add movie availability
MovieAvailability.objects.get_or_create(
    tconst=movie,
    platform=platform,
    defaults={
        'is_available': True,
        'last_checked': timezone.now(),
        'source': 'manual'
    }
)

print("Test data prepared for user 'test@example.com'")
```

### Checking AI Suggestion Batches

Verify if suggestions have been generated and cached for the test user.

```bash
cd myVOD/backend/
python manage.py shell
```

```python
from movies.models import AiSuggestionBatch
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()
user = User.objects.filter(email='test@example.com').first()

if user:
    batches = AiSuggestionBatch.objects.filter(user_id=user.id).order_by('-generated_at')
    print(f"Total batches for {user.email}: {batches.count()}")
    
    # Check for a valid batch for today
    today_batch = batches.filter(expires_at__gt=timezone.now()).first()
    
    if today_batch:
        print(f"\\nUser has valid suggestions for today (batch_id={today_batch.id})")
    else:
        print("\\nNo valid suggestions for today - API will generate new ones.")
else:
    print("Test user not found.")
```

### Clearing Cached Suggestions

To force regeneration of suggestions, delete the user's existing batches.

```bash
cd myVOD/backend/
python manage.py shell
```

```python
from movies.models import AiSuggestionBatch
from django.contrib.auth import get_user_model

User = get_user_model()
user = User.objects.filter(email='test@example.com').first()

if user:
    deleted_count, _ = AiSuggestionBatch.objects.filter(user_id=user.id).delete()
    print(f"Deleted {deleted_count} suggestion batches for {user.email}")
```

### Checking GIN Index for Movie Search

Verify that the `pg_trgm` GIN index is correctly configured on the `movie` table for efficient text searches.

```bash
cd myVOD/backend/
python manage.py shell
```

```python
from django.db import connection

# Verify GIN index exists
with connection.cursor() as cursor:
    cursor.execute("""
        SELECT indexname, indexdef 
        FROM pg_indexes 
        WHERE tablename = 'movie' AND indexdef LIKE '%gin%';
    """)
    print("GIN Indexes on 'movie' table:")
    for row in cursor.fetchall():
        print(row)

# Verify required extensions are enabled
with connection.cursor() as cursor:
    cursor.execute("""
        SELECT extname, extversion 
        FROM pg_extension 
        WHERE extname IN ('pg_trgm', 'unaccent');
    """)
    print("\\nEnabled Extensions:")
    for row in cursor.fetchall():
        print(row)

# Analyze a sample query
with connection.cursor() as cursor:
    cursor.execute("""
        EXPLAIN ANALYZE
        SELECT tconst, primary_title
        FROM movie
        WHERE similarity(lower(primary_title), lower('interstellar')) > 0.1
        ORDER BY similarity(lower(primary_title), lower('interstellar')) DESC
        LIMIT 20;
    """)
    print("\\nQuery Plan for similarity search:")
    for row in cursor.fetchall():
        print(row[0])
```

### Checking Integration Error Logs

Review recent errors from external API integrations (like Gemini).

```bash
cd myVOD/backend/
python manage.py shell
```

```python
from movies.models import IntegrationErrorLog

errors = IntegrationErrorLog.objects.filter(api_type='gemini').order_by('-occurred_at')[:10]

print(f"Recent Gemini API errors: {errors.count()}")
for error in errors:
    print(f"\\nError ID: {error.id} at {error.occurred_at}")
    print(f"Message: {error.error_message}")
    print(f"User ID: {error.user_id}")
```
