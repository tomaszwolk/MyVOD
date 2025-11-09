# Konfiguracja funkcjonalności resetowania hasła

## Przegląd

Funkcjonalność resetowania hasła jest już zaimplementowana, ale domyślnie wysyła emaile do konsoli Django. Aby wysyłać prawdziwe emaile, należy skonfigurować ustawienia email w `settings.py`.

## Aktualna konfiguracja (development)

Obecnie w `settings.py` jest skonfigurowany console backend:

```python
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
```

To oznacza, że wszystkie emaile są wyświetlane w terminalu/konsoli Django zamiast wysyłane na prawdziwe adresy email.

## Konfiguracja wysyłania prawdziwych emaili

### 1. Zmiana EMAIL_BACKEND

W `myVOD/backend/myVOD/myVOD/settings.py` zmień:

```python
# Z console backend na SMTP backend
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
```

### 2. Konfiguracja SMTP

Dodaj konfigurację SMTP dla wybranego providera:

#### Gmail (zalecane dla testów i produkcji)
```python
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'twoj-email@gmail.com'
EMAIL_HOST_PASSWORD = 'twoj-app-password'  # NIE hasło do konta!
DEFAULT_FROM_EMAIL = 'twoj-email@gmail.com'
FRONTEND_URL = 'https://twoj-frontend.com'  # dla produkcyjnych linków resetowania
```

#### Outlook/Hotmail
```python
EMAIL_HOST = 'smtp-mail.outlook.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'twoj-email@outlook.com'
EMAIL_HOST_PASSWORD = 'twoje-haslo'
DEFAULT_FROM_EMAIL = 'twoj-email@outlook.com'
```

#### Yahoo
```python
EMAIL_HOST = 'smtp.mail.yahoo.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'twoj-email@yahoo.com'
EMAIL_HOST_PASSWORD = 'twoje-haslo'
DEFAULT_FROM_EMAIL = 'twoj-email@yahoo.com'
```

#### Inny SMTP serwer
```python
EMAIL_HOST = 'your-smtp-server.com'
EMAIL_PORT = 587  # lub 465 dla SSL
EMAIL_USE_TLS = True  # lub EMAIL_USE_SSL = True
EMAIL_HOST_USER = 'your-username'
EMAIL_HOST_PASSWORD = 'your-password'
DEFAULT_FROM_EMAIL = 'noreply@yourdomain.com'
```

## Ważne uwagi bezpieczeństwa

### Dla Gmail:
1. **NIE używaj hasła do konta Google!**
2. Włącz 2-weryfikację (2FA) na koncie Google
3. Wygeneruj **App Password**:
   - Przejdź do: https://myaccount.google.com/apppasswords
   - Wygeneruj hasło dla aplikacji "MyVOD"
   - Użyj tego hasła w `EMAIL_HOST_PASSWORD`

### Dla innych providerów:
- Użyj dedykowanych haseł SMTP jeśli dostępne
- Włącz mniej bezpieczne aplikacje jeśli wymagane przez providera

## Kompletny przykład konfiguracji Gmail

```python
# Email Configuration
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'

# Gmail SMTP settings
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'twoja-aplikacja@gmail.com'
EMAIL_HOST_PASSWORD = 'abcd-efgh-ijkl-mnop'  # 16-znakowe App Password
DEFAULT_FROM_EMAIL = 'twoja-aplikacja@gmail.com'

# Frontend URL for password reset links
FRONTEND_URL = 'https://myvod-frontend.onrender.com'
```

## Testowanie

1. Zmień ustawienia w `settings.py`
2. Uruchom serwer: `python manage.py runserver`
3. Przejdź do aplikacji frontend
4. Przetestuj funkcjonalność "Zapomniałeś hasła?"
5. Sprawdź czy email dotarł na podany adres

## Dla środowiska produkcyjnego

Ustaw zmienne środowiskowe zamiast hardkodować w settings.py:

```bash
export EMAIL_BACKEND='django.core.mail.backends.smtp.EmailBackend'
export EMAIL_HOST='smtp.gmail.com'
export EMAIL_PORT='587'
export EMAIL_USE_TLS='True'
export EMAIL_HOST_USER='your-email@gmail.com'
export EMAIL_HOST_PASSWORD='your-app-password'
export DEFAULT_FROM_EMAIL='your-email@gmail.com'
export FRONTEND_URL='https://your-production-domain.com'
```

## Endpointy API

Funkcjonalność resetowania hasła używa następujących endpointów:

- `POST /api/password-reset/` - wysyła email z linkiem
- `POST /api/password-reset/validate_token/` - sprawdza ważność tokenu
- `POST /api/password-reset/confirm/` - ustawia nowe hasło

Wszystkie endpointy są publiczne (nie wymagają autentyfikacji) i mają wyłączony CSRF.

## Troubleshooting

### Email nie dociera:
- Sprawdź ustawienia SMTP
- Sprawdź czy App Password jest prawidłowe (dla Gmail)
- Sprawdź logi Django na błędy wysyłania

### Błąd CSRF:
- Endpointy mają wyłączony CSRF na poziomie URL
- Frontend nie wysyła CSRF tokenów dla tych endpointów

### Błąd szablonu:
- Szablon email znajduje się w `myVOD/backend/myVOD/templates/password_reset_email.html`
- Django szuka szablonów w katalogu zdefiniowanym w `TEMPLATES['DIRS']`

## Podsumowanie

Funkcjonalność resetowania hasła jest w pełni zaimplementowana. Wystarczy skonfigurować ustawienia email, aby emaile były wysyłane na prawdziwe adresy zamiast do konsoli.
