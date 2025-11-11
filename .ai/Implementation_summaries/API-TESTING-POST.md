# Testing POST /api/user-movies/ Endpoint

This document provides comprehensive testing instructions for the POST endpoint that adds movies to a user's watchlist.

## Endpoint Overview

**URL**: `POST /api/user-movies/`
**Authentication**: Required (JWT Bearer Token)
**Purpose**: Add a movie to the authenticated user's watchlist

## Request Format

```json
{
  "tconst": "tt0816692"
}
```

## Response Format (201 Created)

```json
{
  "id": 102,
  "movie": {
    "tconst": "tt0816692",
    "primary_title": "Interstellar",
    "start_year": 2014,
    "genres": ["Adventure", "Drama", "Sci-Fi"],
    "avg_rating": "8.6",
    "poster_path": "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg"
  },
  "availability": [
    {"platform_id": 1, "platform_name": "Netflix", "is_available": true},
    {"platform_id": 2, "platform_name": "HBO Max", "is_available": false}
  ],
  "watchlisted_at": "2025-10-15T14:30:00Z",
  "watched_at": null
}
```

## Automated Testing

### Run Unit Tests

```bash
cd myVOD/backend/myVOD
python manage.py test user_movies.UserMoviePostAPITests
```

### Run All Tests

```bash
python manage.py test user_movies
```

### Test Coverage

The test suite includes:
- ✅ Authentication requirement
- ✅ Successful movie addition
- ✅ Missing tconst field (400)
- ✅ Invalid tconst format (400)
- ✅ Movie not found (400)
- ✅ Duplicate movie (409 Conflict)
- ✅ Soft-delete restoration
- ✅ User data isolation
- ✅ Empty availability list handling

## Manual Testing with curl

### 1. Setup Environment

```bash
export BASE_URL="http://localhost:8000/api"
export EMAIL="your-email@example.com"
export PASSWORD="your-password"
```

### 2. Get Authentication Token

```bash
TOKEN=$(curl -s -X POST "$BASE_URL/token/" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  | jq -r '.access')

echo "Token: $TOKEN"
```

### 3. Test Successful Movie Addition

```bash
curl -X POST "$BASE_URL/user-movies/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tconst": "tt0111161"}' \
  | jq
```

**Expected**: 201 Created with full movie details

### 4. Test Duplicate Prevention (409 Conflict)

```bash
# Try adding the same movie again
curl -X POST "$BASE_URL/user-movies/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tconst": "tt0111161"}' \
  | jq
```

**Expected**: 409 Conflict with error message

### 5. Test Invalid tconst Format (400 Bad Request)

```bash
# Missing tconst
curl -X POST "$BASE_URL/user-movies/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' \
  | jq

# Invalid format
curl -X POST "$BASE_URL/user-movies/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tconst": "invalid"}' \
  | jq
```

**Expected**: 400 Bad Request with validation error

### 6. Test Movie Not Found (400 Bad Request)

```bash
curl -X POST "$BASE_URL/user-movies/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tconst": "tt9999999"}' \
  | jq
```

**Expected**: 400 Bad Request with "does not exist" message

### 7. Test Authentication Required (401 Unauthorized)

```bash
curl -X POST "$BASE_URL/user-movies/" \
  -H "Content-Type: application/json" \
  -d '{"tconst": "tt0111161"}' \
  | jq
```

**Expected**: 401 Unauthorized

## Using the Test Helper Script

### Quick Add

```bash
cd myVOD/backend
./test-api.sh login
./test-api.sh add tt0111161
```

### View Watchlist After Adding

```bash
./test-api.sh watchlist
```

## Test Movie IDs

Here are some valid IMDb tconst values for testing:

- `tt0111161` - The Shawshank Redemption
- `tt0068646` - The Godfather
- `tt0071562` - The Godfather Part II
- `tt0468569` - The Dark Knight
- `tt0050083` - 12 Angry Men
- `tt0108052` - Schindler's List
- `tt0167260` - The Lord of the Rings: The Return of the King
- `tt0110912` - Pulp Fiction
- `tt0060196` - The Good, the Bad and the Ugly
- `tt0120737` - The Lord of the Rings: The Fellowship of the Ring

## Error Response Reference

### 400 Bad Request - Missing Field
```json
{
  "tconst": ["tconst field is required"]
}
```

### 400 Bad Request - Invalid Format
```json
{
  "tconst": ["Invalid tconst format. Expected format: tt followed by 7-8 digits (e.g., tt0816692)"]
}
```

### 400 Bad Request - Movie Not Found
```json
{
  "tconst": ["Movie with tconst 'tt9999999' does not exist in database"]
}
```

### 401 Unauthorized
```json
{
  "detail": "Authentication credentials were not provided."
}
```

### 409 Conflict - Duplicate
```json
{
  "detail": "Movie is already on the watchlist"
}
```

### 500 Internal Server Error
```json
{
  "detail": "An unexpected error occurred. Please try again later."
}
```

## Business Logic Verification

### Soft-Delete Restoration Test

1. Add a movie to watchlist
2. Delete it (soft delete)
3. Add it again - should restore the same record

```bash
# Add movie
./test-api.sh add tt0111161

# Get the movie ID from watchlist
./test-api.sh watchlist | jq '.[0].id'

# Delete it (assuming ID is 123)
./test-api.sh delete 123

# Add it again - should restore
./test-api.sh add tt0111161

# Verify it's the same ID
./test-api.sh watchlist | jq '.[0].id'
```

### User Isolation Test

1. Login as User A, add a movie
2. Login as User B, add the same movie
3. Both should succeed without conflict

## Database Verification

### Check Created Entry

```sql
SELECT id, user_id, tconst, watchlisted_at, watchlist_deleted_at, watched_at
FROM user_movie
WHERE user_id = '<your-user-uuid>'
  AND tconst = 'tt0111161';
```

### Verify Soft-Delete Restoration

```sql
-- Check that watchlist_deleted_at is NULL after restoration
SELECT watchlisted_at, watchlist_deleted_at
FROM user_movie
WHERE user_id = '<your-user-uuid>'
  AND tconst = 'tt0111161';
```

## Performance Considerations

The endpoint is optimized with:
- `select_related('tconst')` - Single JOIN for movie data
- `prefetch_related` - Efficient availability fetching
- `@transaction.atomic` - Database transaction safety
- Early validation - Format check before database queries

## Known Limitations (MVP)

1. No pagination on response (returns full movie object)
2. No bulk add operation
3. No AI suggestion tracking in this endpoint
4. Platform availability is computed synchronously

## Next Steps

After POST is verified:
- Implement PATCH endpoint (mark as watched)
- Implement DELETE endpoint (soft delete)
- Add integration with AI suggestions
- Consider background job for availability updates

