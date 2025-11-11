# Plan implementacji endpointu zmiany hasła

## Endpoint: `POST /api/me/change-password/`

### Opis
Pozwala zalogowanemu użytkownikowi zmienić swoje hasło. Wymaga podania obecnego hasła w celu weryfikacji oraz nowego hasła spełniającego wymagania bezpieczeństwa.

### Autoryzacja
Wymagana - JWT token w headerze `Authorization: Bearer <access_token>`

### Request Body
```json
{
  "current_password": "currentPassword123",
  "new_password": "newSecurePassword456"
}
```

### Pola:
- `current_password` (string, required): Obecne hasło użytkownika (do weryfikacji)
- `new_password` (string, required): Nowe hasło spełniające wymagania bezpieczeństwa

### Success Response (200 OK)
```json
{
  "message": "Password changed successfully"
}
```

### Error Responses:
- `400 Bad Request`:
  - Brak wymaganych pól (`current_password`, `new_password`)
  - Nieprawidłowe obecne hasło
  - Nowe hasło nie spełnia wymagań bezpieczeństwa (min 8 znaków, litery i cyfry)
  - Nowe hasło jest takie samo jak obecne hasło
- `401 Unauthorized`: Brak lub nieprawidłowy token JWT
- `500 Internal Server Error`: Błąd serwera podczas aktualizacji hasła

## Implementacja Backend (Django)

### 1. Serializer
**Plik:** `myVOD/myVOD/serializers.py`

```python
class ChangePasswordSerializer(serializers.Serializer):
    """
    Serializer for password change request.
    Validates current password and new password requirements.
    """
    current_password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'},
        help_text="Current password for verification"
    )
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'},
        help_text="New password (minimum 8 characters, must contain letters and numbers)"
    )

    def validate_current_password(self, value):
        """Verify that current password is correct."""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate_new_password(self, value):
        """Validate new password meets security requirements."""
        user = self.context['request'].user
        # Use Django's password validators
        try:
            validate_password(value, user=user)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        
        # Check if new password is different from current
        if user.check_password(value):
            raise serializers.ValidationError(
                "New password must be different from current password."
            )
        
        return value
```

### 2. Service Layer
**Plik:** `myVOD/services/user_profile_service.py`

```python
def change_user_password(user, new_password: str) -> None:
    """
    Change user's password.
    
    Args:
        user: Django User instance
        new_password: New password (already validated)
    
    Raises:
        ValueError: If password is empty
        Exception: If password update fails
    """
    if not new_password:
        raise ValueError("New password is required")
    
    # Set password (Django automatically hashes it)
    user.set_password(new_password)
    user.save(update_fields=['password'])
```

### 3. View
**Plik:** `myVOD/myVOD/views.py` (dodaj do klasy `UserProfileView`)

```python
@extend_schema(
    summary="Change user password",
    description=(
        "Changes the password for the currently authenticated user. "
        "Requires current password for verification and new password "
        "meeting security requirements (min 8 chars, letters and numbers). "
        "Requires JWT authentication."
    ),
    request=ChangePasswordSerializer,
    responses={
        200: OpenApiTypes.OBJECT,
        400: OpenApiTypes.OBJECT,
        401: OpenApiTypes.OBJECT,
        500: OpenApiTypes.OBJECT,
    },
    tags=['User Profile'],
)
@action(detail=False, methods=['post'], url_path='change-password')
def change_password(self, request):
    """
    Handle POST request for changing user password.
    
    Implements guard clauses:
    1. User is authenticated (permission class)
    2. Validate request data (current password, new password)
    3. Verify current password
    4. Update password via service layer
    5. Return success response
    """
    serializer = ChangePasswordSerializer(
        data=request.data,
        context={'request': request}
    )
    
    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        new_password = serializer.validated_data['new_password']
        change_user_password(request.user, new_password)
        
        return Response(
            {"message": "Password changed successfully"},
            status=status.HTTP_200_OK
        )
    
    except ValueError as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"Error changing password: {str(e)}", exc_info=True)
        return Response(
            {"error": "An error occurred while changing password. Please try again later."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
```

### 4. URL Configuration
**Plik:** `myVOD/myVOD/urls.py`

Endpoint będzie dostępny jako `POST /api/me/change-password/` jeśli używasz ViewSet z routerem, lub można dodać osobną ścieżkę.

### 5. Walidacja
- Używać tych samych walidatorów co przy rejestracji (`AUTH_PASSWORD_VALIDATORS`)
- Sprawdzać, czy nowe hasło różni się od obecnego
- Weryfikować obecne hasło przed zmianą

### 6. Bezpieczeństwo
- Wymagana autoryzacja JWT
- Obecne hasło jest wymagane do weryfikacji (zapobiega przypadkowej zmianie)
- Hasło jest hashowane przez Django (`set_password`)
- Brak zwracania jakichkolwiek danych o haśle w odpowiedzi

### 7. Testy
- Test zmiany hasła z poprawnym obecnym hasłem
- Test z nieprawidłowym obecnym hasłem (400)
- Test z nowym hasłem nie spełniającym wymagań (400)
- Test z nowym hasłem identycznym jak obecne (400)
- Test bez autoryzacji (401)
- Test hashowania nowego hasła
- Test weryfikacji nowego hasła po zmianie

## Uwagi implementacyjne

1. **Endpoint jako osobna akcja ViewSet**: Można użyć `@action` decorator w `UserProfileView` jeśli to ViewSet, lub dodać osobną metodę jeśli to APIView.

2. **Router**: Jeśli używasz DRF router, endpoint może być automatycznie dostępny jako `POST /api/me/change-password/` po dodaniu `@action`.

3. **Spójność z istniejącym kodem**: Wykorzystać te same wzorce co w `PATCH /api/me/` (guard clauses, service layer, error handling).

4. **Logging**: Dodać logowanie prób zmiany hasła (bez szczegółów) dla celów bezpieczeństwa.

