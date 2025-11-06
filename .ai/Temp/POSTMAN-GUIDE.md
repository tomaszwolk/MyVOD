# Postman Testing Guide for MyVOD API

## Prerequisites

1. **Postman** installed ([Download here](https://www.postman.com/downloads/))
2. **Django server** running: `python manage.py runserver`
3. **Test user** created: `test@example.com`

## 🔐 Step 1: Get Authentication Token

### 1.1 Create New Request

1. Open Postman
2. Click **"New"** → **"HTTP Request"**
3. Name it: `Login - Get Token`

### 1.2 Configure Request

**Method**: `POST`

**URL**: `http://localhost:8000/api/token/`

**Headers**:
```
Content-Type: application/json
```

**Body** (select "raw" → "JSON"):
```json
{
  "email": "test@example.com",
  "password": "your-password-here"
}
```

### 1.3 Send Request

Click **"Send"**

**Expected Response (200 OK)**:
```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 1.4 Save Access Token

1. Copy the `access` token value (the long string)
2. We'll use this in the next requests

---

## 🎬 Step 2: Test POST - Add Movie to Watchlist

### 2.1 Create New Request

1. Click **"New"** → **"HTTP Request"**
2. Name it: `Add Movie to Watchlist`

### 2.2 Configure Request

**Method**: `POST`

**URL**: `http://localhost:8000/api/user-movies/`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer <paste-your-access-token-here>
```

**Body** (select "raw" → "JSON"):
```json
{
  "tconst": "tt0123456"
}
```

### 2.3 Send Request

Click **"Send"**

**Expected Response (201 Created)**:
```json
{
  "id": 1,
  "movie": {
    "tconst": "tt0111161",
    "primary_title": "The Shawshank Redemption",
    "start_year": 1994,
    "genres": ["Drama"],
    "avg_rating": "9.3",
    "poster_path": null
  },
  "availability": [
    {
      "platform_id": 1,
      "platform_name": "Netflix",
      "is_available": true
    }
  ],
  "watchlisted_at": "2025-10-15T16:00:00Z",
  "watched_at": null
}
```

---

## 📋 Step 3: Test GET - View Watchlist

### 3.1 Create New Request

1. Click **"New"** → **"HTTP Request"**
2. Name it: `Get Watchlist`

### 3.2 Configure Request

**Method**: `GET`

**URL**: `http://localhost:8000/api/user-movies/?status=watchlist`

**Headers**:
```
Authorization: Bearer <paste-your-access-token-here>
```

**No Body needed for GET**

### 3.3 Send Request

Click **"Send"**

**Expected Response (200 OK)**:
```json
[
  {
    "id": 1,
    "movie": {
      "tconst": "tt0111161",
      "primary_title": "The Shawshank Redemption",
      "start_year": 1994,
      "genres": ["Drama"],
      "avg_rating": "9.3",
      "poster_path": null
    },
    "availability": [...],
    "watchlisted_at": "2025-10-15T16:00:00Z",
    "watched_at": null
  }
]
```

---

## 💡 Postman Tips & Tricks

### Tip #1: Save Token as Variable

Instead of copying the token manually each time:

1. After login request succeeds, go to **Tests** tab
2. Add this script:
```javascript
pm.environment.set("access_token", pm.response.json().access);
```
3. In other requests, use: `Authorization: Bearer {{access_token}}`

### Tip #2: Create a Collection

1. Click **Collections** → **"+"** (New Collection)
2. Name it: `MyVOD API`
3. Drag all your requests into this collection
4. Set collection-level authorization

### Tip #3: Use Environment Variables

1. Click the **Environment** icon (top right)
2. Create new environment: `MyVOD Local`
3. Add variables:
   - `base_url`: `http://localhost:8000/api`
   - `access_token`: (leave empty, will be set by script)
4. Use in requests: `{{base_url}}/user-movies/`

---

## 🧪 Testing All Error Scenarios

### Test 1: Missing Authentication (401)

**URL**: `POST http://localhost:8000/api/user-movies/`

**Headers**: (Remove Authorization header)

**Body**:
```json
{
  "tconst": "tt0111161"
}
```

**Expected**: `401 Unauthorized`

---

### Test 2: Invalid tconst Format (400)

**URL**: `POST http://localhost:8000/api/user-movies/`

**Headers**: 
```
Authorization: Bearer {{access_token}}
```

**Body**:
```json
{
  "tconst": "invalid"
}
```

**Expected**: `400 Bad Request`
```json
{
  "tconst": [
    "Invalid tconst format. Expected format: tt followed by 7-8 digits (e.g., tt0816692)"
  ]
}
```

---

### Test 3: Missing tconst Field (400)

**URL**: `POST http://localhost:8000/api/user-movies/`

**Headers**: 
```
Authorization: Bearer {{access_token}}
```

**Body**:
```json
{}
```

**Expected**: `400 Bad Request`
```json
{
  "tconst": ["tconst field is required"]
}
```

---

### Test 4: Movie Not Found (400)

**URL**: `POST http://localhost:8000/api/user-movies/`

**Headers**: 
```
Authorization: Bearer {{access_token}}
```

**Body**:
```json
{
  "tconst": "tt9999999"
}
```

**Expected**: `400 Bad Request`
```json
{
  "tconst": ["Movie with tconst 'tt9999999' does not exist in database"]
}
```

---

### Test 5: Duplicate Movie (409)

**URL**: `POST http://localhost:8000/api/user-movies/`

**Headers**: 
```
Authorization: Bearer {{access_token}}
```

**Body** (send same movie twice):
```json
{
  "tconst": "tt0111161"
}
```

**First request**: `201 Created` ✅

**Second request**: `409 Conflict` ⚠️
```json
{
  "detail": "Movie is already on the watchlist"
}
```

---

## 🎯 Sample Movies for Testing

Here are some valid IMDb tconst values to test with:

| tconst | Movie Title | Year |
|--------|-------------|------|
| `tt0111161` | The Shawshank Redemption | 1994 |
| `tt0068646` | The Godfather | 1972 |
| `tt0071562` | The Godfather Part II | 1974 |
| `tt0468569` | The Dark Knight | 2008 |
| `tt0050083` | 12 Angry Men | 1957 |
| `tt0108052` | Schindler's List | 1993 |
| `tt0167260` | The Lord of the Rings: Return of the King | 2003 |
| `tt0110912` | Pulp Fiction | 1994 |

**Note**: These movies must exist in your database for the requests to work.

---

## 🔄 Token Expiration & Refresh

### When Access Token Expires

JWT tokens expire after a set time (default: 5 minutes in Django).

**Symptoms**:
- Requests return `401 Unauthorized`
- Error: `"token_not_valid"` or `"token is invalid or expired"`

### Solution 1: Get New Access Token

**URL**: `POST http://localhost:8000/api/token/refresh/`

**Body**:
```json
{
  "refresh": "<your-refresh-token>"
}
```

**Response**:
```json
{
  "access": "new-access-token-here"
}
```

### Solution 2: Login Again

Just repeat Step 1 to get both new access and refresh tokens.

---

## 📦 Import Postman Collection

I've created a ready-to-use Postman collection. Save this as `MyVOD-API.postman_collection.json`:

```json
{
  "info": {
    "name": "MyVOD API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "Login - Get Token",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "if (pm.response.code === 200) {",
                  "    pm.environment.set('access_token', pm.response.json().access);",
                  "    pm.environment.set('refresh_token', pm.response.json().refresh);",
                  "}"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"test@example.com\",\n  \"password\": \"your-password\"\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            },
            "url": {
              "raw": "{{base_url}}/token/",
              "host": ["{{base_url}}"],
              "path": ["token", ""]
            }
          }
        }
      ]
    },
    {
      "name": "User Movies",
      "item": [
        {
          "name": "Add Movie to Watchlist",
          "request": {
            "method": "POST",
            "header": [],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"tconst\": \"tt0111161\"\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            },
            "url": {
              "raw": "{{base_url}}/user-movies/",
              "host": ["{{base_url}}"],
              "path": ["user-movies", ""]
            }
          }
        },
        {
          "name": "Get Watchlist",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url}}/user-movies/?status=watchlist",
              "host": ["{{base_url}}"],
              "path": ["user-movies", ""],
              "query": [
                {
                  "key": "status",
                  "value": "watchlist"
                }
              ]
            }
          }
        }
      ]
    }
  ],
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{access_token}}",
        "type": "string"
      }
    ]
  }
}
```

### To Import:

1. Open Postman
2. Click **Import** (top left)
3. Drop the JSON file or paste the content
4. Collection will appear in your sidebar

---

## 🚨 Troubleshooting

### Error: "Connection refused"

**Problem**: Django server not running

**Solution**: 
```bash
cd myVOD/backend/myVOD
python manage.py runserver
```

---

### Error: "CSRF token missing"

**Problem**: Missing CSRF token (shouldn't happen with JWT)

**Solution**: Make sure you're using `Authorization: Bearer` header, not session auth

---

### Error: "Invalid token"

**Problem**: Token expired or malformed

**Solution**: Login again to get a fresh token

---

### Error: "Movie does not exist"

**Problem**: Movie with that tconst is not in your database

**Solution**: Use a tconst that exists in your database or import more movies

---

## 📚 Next Steps

After testing POST, you can test the other endpoints:

1. **GET /api/user-movies/?status=watched** - View watched movies
2. **PATCH /api/user-movies/<id>/** - Mark as watched (coming soon)
3. **DELETE /api/user-movies/<id>/** - Remove from watchlist (coming soon)

---

## 💬 Need Help?

If you get stuck:
1. Check Django server logs for error details
2. Verify your token in [jwt.io](https://jwt.io)
3. Make sure database has the movie you're trying to add
4. Check that user has permission to access the endpoint

