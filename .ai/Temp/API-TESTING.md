# API Testing Guide - MyVOD

Ten dokument zawiera praktyczne przykłady testowania API MyVOD.

## 🚀 Quick Start

### Opcja 1: Helper Script (Zalecane dla szybkiego testowania)

```bash
# Nadaj uprawnienia wykonania
chmod +x test-api.sh

# Zaloguj się
./test-api.sh login test@example.com testpass123

# Sprawdź profil
./test-api.sh profile

# Pobierz watchlistę
./test-api.sh watchlist

# Dodaj film
./test-api.sh add tt0816692

# Oznacz jako obejrzany
./test-api.sh watch 1

# Wyszukaj film
./test-api.sh search interstellar
```

### Opcja 2: Manualne curl (Pełna kontrola)

Użyj promptu z `AI_prompts/13. Generator zapytań curl.md` aby wygenerować dowolne zapytanie.

---

## 📚 Przykładowe scenariusze testowe

### Scenariusz 1: Podstawowy workflow użytkownika

```bash
# 1. Zaloguj się
./test-api.sh login test@example.com testpass123

# 2. Sprawdź czy watchlista jest pusta
./test-api.sh watchlist

# 3. Dodaj 3 filmy
./test-api.sh add tt0816692  # Interstellar
./test-api.sh add tt0111161  # The Shawshank Redemption
./test-api.sh add tt0468569  # The Dark Knight

# 4. Sprawdź watchlistę ponownie
./test-api.sh watchlist

# 5. Oznacz jeden film jako obejrzany (użyj ID z poprzedniego response)
./test-api.sh watch 1

# 6. Sprawdź watched history
./test-api.sh watchlist watched

# 7. Usuń film z watchlisty
./test-api.sh delete 2
```

### Scenariusz 2: Testowanie filtrów i sortowania

```bash
# Zaloguj się
./test-api.sh login

# Dodaj kilka filmów
./test-api.sh add tt0816692
./test-api.sh add tt0111161
./test-api.sh add tt0468569

# Pobierz watchlistę posortowaną po ocenie (malejąco)
curl -s -X GET "http://localhost:8000/api/user-movies/?status=watchlist&ordering=-tconst__avg_rating" \
  -H "Authorization: Bearer $(cat .api-token)" | jq '.'

# Pobierz tylko dostępne filmy
curl -s -X GET "http://localhost:8000/api/user-movies/?status=watchlist&is_available=true" \
  -H "Authorization: Bearer $(cat .api-token)" | jq '.'
```

### Scenariusz 3: Testowanie edge cases

```bash
# Dodaj film który już jest na watchliście (oczekiwane: 409 Conflict)
./test-api.sh add tt0816692
./test-api.sh add tt0816692  # Drugi raz

# Spróbuj dodać nieistniejący film (oczekiwane: 400 Bad Request)
curl -s -X POST http://localhost:8000/api/user-movies/ \
  -H "Authorization: Bearer $(cat .api-token)" \
  -H "Content-Type: application/json" \
  -d '{"tconst":"tt9999999"}' | jq '.'

# Spróbuj usunąć film który nie należy do użytkownika (oczekiwane: 404)
curl -s -X DELETE http://localhost:8000/api/user-movies/99999/ \
  -H "Authorization: Bearer $(cat .api-token)"
```

---

## 🔐 Testowanie autentykacji

### Uzyskanie tokena JWT

```bash
curl -X POST http://localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123"
  }' | jq '.'
```

**Response:**
```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Zapisanie tokena do zmiennej

```bash
# Zapisz access token
export ACCESS_TOKEN=$(curl -s -X POST http://localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}' \
  | jq -r '.access')

echo "Token saved: $ACCESS_TOKEN"
```

### Odświeżenie tokena

```bash
# Zapisz refresh token
export REFRESH_TOKEN=$(curl -s -X POST http://localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}' \
  | jq -r '.refresh')

# Uzyskaj nowy access token
curl -X POST http://localhost:8000/api/token/refresh/ \
  -H "Content-Type: application/json" \
  -d "{\"refresh\":\"$REFRESH_TOKEN\"}" | jq '.'
```

### Weryfikacja tokena

```bash
curl -X POST http://localhost:8000/api/token/verify/ \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$ACCESS_TOKEN\"}" | jq '.'
```

---

## 📋 Wszystkie endpointy z przykładami curl

### GET /api/user-movies/

**Pobierz watchlistę:**
```bash
curl -X GET "http://localhost:8000/api/user-movies/?status=watchlist" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.'
```

**Pobierz watched history:**
```bash
curl -X GET "http://localhost:8000/api/user-movies/?status=watched" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.'
```

**Z sortowaniem:**
```bash
curl -X GET "http://localhost:8000/api/user-movies/?status=watchlist&ordering=-tconst__avg_rating" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.'
```

**Z filtrem dostępności:**
```bash
curl -X GET "http://localhost:8000/api/user-movies/?status=watchlist&is_available=true" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.'
```

### POST /api/user-movies/

```bash
curl -X POST http://localhost:8000/api/user-movies/ \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tconst": "tt0816692"
  }' | jq '.'
```

### PATCH /api/user-movies/<id>/

**Oznacz jako obejrzany:**
```bash
curl -X PATCH http://localhost:8000/api/user-movies/1/ \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "mark_as_watched"
  }' | jq '.'
```

**Przywróć do watchlisty:**
```bash
curl -X PATCH http://localhost:8000/api/user-movies/1/ \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "restore_to_watchlist"
  }' | jq '.'
```

### DELETE /api/user-movies/<id>/

```bash
curl -X DELETE http://localhost:8000/api/user-movies/1/ \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -i
```

### GET /api/me/

```bash
curl -X GET http://localhost:8000/api/me/ \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.'
```

### PATCH /api/me/

```bash
curl -X PATCH http://localhost:8000/api/me/ \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platforms": [1, 2, 3]
  }' | jq '.'
```

### GET /api/platforms/

```bash
curl -X GET http://localhost:8000/api/platforms/ \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.'
```

### GET /api/movies/

```bash
curl -X GET "http://localhost:8000/api/movies/?search=interstellar" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.'
```

---

## 🐛 Debugging tips

### Zobacz response headers

```bash
curl -i -X GET http://localhost:8000/api/user-movies/?status=watchlist \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Verbose mode (pełny request/response)

```bash
curl -v -X GET http://localhost:8000/api/user-movies/?status=watchlist \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Sprawdź czy token jest ważny

```bash
# Decode JWT (bez weryfikacji) - wymaga jq
echo $ACCESS_TOKEN | cut -d. -f2 | base64 -d 2>/dev/null | jq '.'
```

### Test bez jq (raw JSON)

```bash
curl -s -X GET http://localhost:8000/api/user-movies/?status=watchlist \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

---

## 🔧 Konfiguracja środowiska

### Ustawienia stałe (dodaj do ~/.bashrc lub ~/.zshrc)

```bash
# MyVOD API Config
export MYVOD_BASE_URL="http://localhost:8000/api"
export MYVOD_EMAIL="test@example.com"
export MYVOD_PASSWORD="testpass123"

# Helper function do szybkiego logowania
myvod-login() {
    export MYVOD_TOKEN=$(curl -s -X POST "$MYVOD_BASE_URL/token/" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$MYVOD_EMAIL\",\"password\":\"$MYVOD_PASSWORD\"}" \
        | jq -r '.access')
    echo "Logged in! Token: ${MYVOD_TOKEN:0:20}..."
}

# Aliasy
alias myvod-watchlist='curl -s -X GET "$MYVOD_BASE_URL/user-movies/?status=watchlist" -H "Authorization: Bearer $MYVOD_TOKEN" | jq "."'
alias myvod-profile='curl -s -X GET "$MYVOD_BASE_URL/me/" -H "Authorization: Bearer $MYVOD_TOKEN" | jq "."'
```

**Użycie:**
```bash
source ~/.bashrc  # lub ~/.zshrc
myvod-login
myvod-watchlist
myvod-profile
```

---

## 📊 Expected HTTP Status Codes

| Endpoint | Method | Success | Error Scenarios |
|----------|--------|---------|-----------------|
| `/api/token/` | POST | 200 | 401 (invalid credentials), 400 (missing fields) |
| `/api/user-movies/` | GET | 200 | 401 (no auth), 400 (invalid params) |
| `/api/user-movies/` | POST | 201 | 401 (no auth), 400 (invalid data), 409 (duplicate) |
| `/api/user-movies/<id>/` | PATCH | 200 | 401 (no auth), 404 (not found), 400 (invalid action) |
| `/api/user-movies/<id>/` | DELETE | 204 | 401 (no auth), 404 (not found) |

---

## 🎓 Pro Tips

1. **Zawsze używaj jq dla czytelności JSON:**
   ```bash
   brew install jq  # macOS
   apt-get install jq  # Linux
   ```

2. **Zapisuj często używane requesty do plików:**
   ```bash
   # login.sh
   #!/bin/bash
   curl -X POST http://localhost:8000/api/token/ \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"testpass123"}' | jq '.'
   ```

3. **Używaj Postman/Insomnia dla complex scenarios**
   - Importuj curl command przez "Import from cURL"
   - Zapisuj requesty w kolekcjach
   - Używaj environment variables

4. **Monitoruj Django dev server logs**
   - Otwórz drugi terminal
   - Uruchom `python manage.py runserver`
   - Zobacz real-time logi zapytań

---

**Potrzebujesz więcej przykładów?**
Użyj promptu `AI_prompts/13. Generator zapytań curl.md` aby wygenerować dowolne zapytanie curl!

