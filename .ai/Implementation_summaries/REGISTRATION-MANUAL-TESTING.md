# Manual Testing Guide for POST /api/register/

This document provides curl commands for manually testing the user registration endpoint.

## Prerequisites

- Backend server running on `http://localhost:8000`
- Database properly configured and accessible
- Django migrations applied

## Test Scenarios

### 1. Successful Registration

Test successful user registration with valid email and strong password.

```bash
curl -X POST http://localhost:8000/api/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "strongPassword123"
  }'
```

**Expected Response (201 Created):**
```json
{
  "email": "testuser@example.com"
}
```

### 2. Duplicate Email

Attempt to register with an email that already exists.

```bash
# First registration
curl -X POST http://localhost:8000/api/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "duplicate@example.com",
    "password": "strongPassword123"
  }'

# Second registration with same email (should fail)
curl -X POST http://localhost:8000/api/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "duplicate@example.com",
    "password": "differentPassword456"
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "email": ["A user with this email already exists"]
}
```

### 3. Case-Insensitive Email Uniqueness

Test that email uniqueness check is case-insensitive.

```bash
# First registration
curl -X POST http://localhost:8000/api/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "strongPassword123"
  }'

# Second registration with same email in uppercase (should fail)
curl -X POST http://localhost:8000/api/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "USER@EXAMPLE.COM",
    "password": "differentPassword456"
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "email": ["A user with this email already exists"]
}
```

### 4. Invalid Email Format

Test with various invalid email formats.

```bash
# Missing domain
curl -X POST http://localhost:8000/api/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "notanemail",
    "password": "strongPassword123"
  }'

# Missing username
curl -X POST http://localhost:8000/api/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "@nodomain.com",
    "password": "strongPassword123"
  }'

# Spaces in email
curl -X POST http://localhost:8000/api/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "spaces in@email.com",
    "password": "strongPassword123"
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "email": ["Enter a valid email address."]
}
```

### 5. Weak Password - Too Short

Test password shorter than 8 characters.

```bash
curl -X POST http://localhost:8000/api/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "shortpass@example.com",
    "password": "short1"
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "password": ["This password is too short. It must contain at least 8 characters."]
}
```

### 6. Weak Password - Only Numbers

Test password with only numbers (no letters).

```bash
curl -X POST http://localhost:8000/api/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "numbersonly@example.com",
    "password": "12345678"
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "password": ["This password is entirely numeric."]
}
```

### 7. Weak Password - No Numbers

Test password with only letters (no numbers).

```bash
curl -X POST http://localhost:8000/api/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "lettersonly@example.com",
    "password": "onlyletters"
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "password": ["This password must contain both letters and numbers."]
}
```

### 8. Common Password

Test with a commonly used password.

```bash
curl -X POST http://localhost:8000/api/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "commonpass@example.com",
    "password": "password123"
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "password": ["This password is too common."]
}
```

### 9. Missing Email Field

Test request without email field.

```bash
curl -X POST http://localhost:8000/api/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "password": "strongPassword123"
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "email": ["This field is required."]
}
```

### 10. Missing Password Field

Test request without password field.

```bash
curl -X POST http://localhost:8000/api/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nopassword@example.com"
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "password": ["This field is required."]
}
```

### 11. Empty Email

Test with empty email string.

```bash
curl -X POST http://localhost:8000/api/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "",
    "password": "strongPassword123"
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "email": ["This field may not be blank."]
}
```

### 12. Empty Password

Test with empty password string.

```bash
curl -X POST http://localhost:8000/api/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "emptypass@example.com",
    "password": ""
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "password": ["This field may not be blank."]
}
```

### 13. Email Normalization

Test that email is normalized to lowercase.

```bash
curl -X POST http://localhost:8000/api/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "TestUser@EXAMPLE.COM",
    "password": "strongPassword123"
  }'
```

**Expected Response (201 Created):**
```json
{
  "email": "testuser@example.com"
}
```

### 14. Special Characters in Email

Test registration with special characters in email (valid emails).

```bash
curl -X POST http://localhost:8000/api/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user+tag@example.co.uk",
    "password": "strongPassword123"
  }'
```

**Expected Response (201 Created):**
```json
{
  "email": "user+tag@example.co.uk"
}
```

### 15. Valid Strong Passwords

Test various valid strong passwords.

```bash
# Password with uppercase, lowercase, and numbers
curl -X POST http://localhost:8000/api/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "strongpass1@example.com",
    "password": "UniquePass123"
  }'

# Password with special characters
curl -X POST http://localhost:8000/api/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "strongpass2@example.com",
    "password": "MySecur3P@ssw0rd"
  }'

# Long password
curl -X POST http://localhost:8000/api/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "strongpass3@example.com",
    "password": "VeryLongUniquePasswordWith456Numbers"
  }'
```

**Expected Response (201 Created):**
```json
{
  "email": "strongpass1@example.com"
}
```

## Post-Registration Verification

### Test Authentication After Registration

After successfully registering, verify that the user can log in using the `/api/token/` endpoint.

```bash
# Register user
curl -X POST http://localhost:8000/api/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "logintest@example.com",
    "password": "strongPassword123"
  }'

# Obtain JWT token
curl -X POST http://localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "logintest@example.com",
    "password": "strongPassword123"
  }'
```

**Expected Token Response (200 OK):**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### Verify User Profile

Test that the registered user can access their profile.

```bash
# First, get the access token (from previous step)
ACCESS_TOKEN="your_access_token_here"

# Access user profile
curl -X GET http://localhost:8000/api/me/ \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Expected Response (200 OK):**
```json
{
  "email": "logintest@example.com",
  "platforms": []
}
```

## Database Verification

After registration, you can verify the user was created in the database:

```sql
-- Connect to PostgreSQL
psql -U postgres -h your_host -d your_database

-- Check if user exists
SELECT id, email, username, is_active, date_joined 
FROM auth_user 
WHERE email = 'testuser@example.com';

-- Verify password is hashed (should start with 'bcrypt' identifier)
SELECT password 
FROM auth_user 
WHERE email = 'testuser@example.com';
```

## Cleanup

To clean up test users from the database:

```sql
-- Be careful with this command - it deletes users!
DELETE FROM auth_user 
WHERE email LIKE '%@example.com';
```

Or use Django shell:

```python
python manage.py shell

from django.contrib.auth import get_user_model
User = get_user_model()

# Delete specific test user
User.objects.filter(email='testuser@example.com').delete()

# Delete all test users
User.objects.filter(email__contains='@example.com').delete()
```

## Notes

- All registration requests are public (no authentication required)
- Passwords are automatically hashed using Django's authentication system
- Email addresses are normalized to lowercase
- Response only contains email (no sensitive data like password or user ID)
- Users must call `/api/token/` after registration to obtain JWT tokens

