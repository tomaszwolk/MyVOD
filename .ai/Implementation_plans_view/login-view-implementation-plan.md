# Plan implementacji widoku Logowanie

## 1. Przegląd
Widok logowania umożliwia zarejestrowanym użytkownikom uwierzytelnienie się w aplikacji za pomocą adresu e-mail i hasła. Po pomyślnym zalogowaniu użytkownik otrzymuje parę tokenów JWT (access i refresh), które są zapisywane w `localStorage`, a następnie zostaje przekierowany do głównego widoku aplikacji (np. watchlisty). Widok obsługuje również walidację formularza oraz błędy po stronie serwera.

## 2. Routing widoku
Widok będzie dostępny pod następującą ścieżką:
- **Ścieżka**: `/auth/login`

## 3. Struktura komponentów
Struktura komponentów zostanie zorganizowana w sposób hierarchiczny, aby oddzielić logikę od prezentacji.

```
- AuthLayout (Wrapper dla widoków /auth/*)
  - LoginPage (Komponent-strona)
    - LoginForm (Komponent-kontener z logiką)
      - EmailInput (Komponent UI z shadcn/ui)
      - PasswordInput (Komponent UI z shadcn/ui)
      - SubmitButton (Komponent UI z shadcn/ui)
      - ErrorAlert (Komponent UI z shadcn/ui)
    - Link do Rejestracji (React Router Link)
    - Link do Resetowania Hasła (React Router Link)

- AuthLayout
  - ForgotPasswordPage
    - ForgotPasswordForm
      - EmailInput
      - SubmitButton
      - SuccessMessage / ErrorAlert

- AuthLayout
  - ResetPasswordPage
    - ResetPasswordForm
      - PasswordInput (Nowe hasło)
      - PasswordInput (Potwierdź hasło)
      - SubmitButton
      - ErrorAlert
```

## 4. Szczegóły komponentów

### `LoginPage`
- **Opis komponentu**: Główny komponent strony, odpowiedzialny za renderowanie układu widoku logowania, w tym tytułu, formularza logowania i linku do strony rejestracji.
- **Główne elementy**: Tytuł `<h1>`, komponent `LoginForm`, akapit z `Link` do `/auth/register` oraz `Link` do `/auth/forgot-password`.
- **Obsługiwane interakcje**: Nawigacja do strony rejestracji i resetowania hasła.
- **Obsługiwana walidacja**: Brak.
- **Typy**: Brak.
- **Propsy**: Brak.

### `LoginForm`
- **Opis komponentu**: Sercem widoku jest komponent kontenerowy, który zarządza stanem formularza, jego walidacją (za pomocą `react-hook-form` i `zod`) oraz procesem wysyłania danych do API (za pomocą `TanStack Query`). Odpowiada za wyświetlanie stanu ładowania oraz błędów API.
- **Główne elementy**: Formularz (`<form>`), który owija komponenty `EmailInput`, `PasswordInput`, `SubmitButton` oraz `ErrorAlert`.
- **Obsługiwane interakcje**: Przesłanie formularza (submit).
- **Obsługiwana walidacja**: Walidacja schematem `zod` przed wysłaniem.
- **Typy**: `LoginUserCommand`, `AuthTokensDto`, `AuthErrorDto`.
- **Propsy**: Brak.

### `EmailInput`, `PasswordInput`
- **Opis komponentu**: Komponenty UI oparte na bibliotece `shadcn/ui` (`Input`, `Label`), zintegrowane z `react-hook-form` do wyświetlania wartości, etykiet i komunikatów o błędach walidacji. `PasswordInput` będzie używał `type="password"`.
- **Główne elementy**: `<div>`, `<Label>`, `<Input>`, `<p>` (dla błędu).
- **Obsługiwane interakcje**: `onChange`, `onBlur` (obsługiwane przez `react-hook-form`).
- **Obsługiwana walidacja**: Definiowana przez schemat `zod` w `LoginForm`.
- **Typy**: `UseFormRegisterReturn`, `FieldError`.
- **Propsy**: `register`, `errors` (przekazane z `react-hook-form`).

### `SubmitButton`
- **Opis komponentu**: Przycisk z `shadcn/ui` do przesyłania formularza. Jego stan (aktywny/nieaktywny) oraz treść (np. wyświetlanie loadera) będą zależne od stanu przesyłania formularza (`isLoading` z `useMutation`).
- **Główne elementy**: `<Button>`.
- **Obsługiwane interakcje**: `onClick` (uruchamia `handleSubmit`).
- **Obsługiwana walidacja**: Brak.
- **Typy**: `boolean` (dla propsa `disabled`).
- **Propsy**: `isLoading: boolean`.

### `ErrorAlert`
- **Opis komponentu**: Komponent `Alert` z `shadcn/ui` do wyświetlania ogólnego błędu logowania zwróconego przez API.
- **Główne elementy**: `<Alert>`, `<AlertTitle>`, `<AlertDescription>`.
- **Obsługiwane interakcje**: Brak.
- **Obsługiwana walidacja**: Brak.
- **Typy**: `string | null` (treść błędu).
- **Propsy**: `errorMessage: string | null`.

## 5. Typy
Należy dodać następujące typy do pliku `src/types/api.types.ts`, ponieważ nie istnieją one obecnie:

```typescript
/**
 * Command model for authenticating a user.
 * Corresponds to the request body of `POST /api/token/`.
 */
export type LoginUserCommand = {
  email: string;
  password: string;
};

/**
 * DTO for the JWT token pair returned upon successful authentication.
 * Corresponds to the response of `POST /api/token/`.
 */
export type AuthTokensDto = {
  access: string;
  refresh: string;
};

/**
 * DTO for a generic authentication error response.
 * Standard error from djangorestframework-simplejwt on 401.
 */
export type AuthErrorDto = {
  detail: string;
};

export type ForgotPasswordCommand = {
  email: string;
};

export type ValidateResetTokenCommand = {
  uid: string;
  token: string;
};

export type ResetPasswordConfirmCommand = ValidateResetTokenCommand & {
  new_password: string;
};
```

## 6. Zarządzanie stanem
- **Stan formularza**: Zarządzany w całości przez `react-hook-form` w komponencie `LoginForm`. Obejmuje to wartości pól, błędy walidacji i stan przesyłania.
- **Stan API**: Zarządzany przez `TanStack Query` i jego hook `useMutation`. Obejmuje on stany `isLoading`, `isError`, `isSuccess`, a także zwrócone dane lub błąd.
- **Stan globalny (uwierzytelnienie)**: Po pomyślnym zalogowaniu, tokeny JWT zostaną zapisane w `localStorage` i zarządzane globalnie przez `AuthContext`. Ten kontekst będzie dostarczał informacji o stanie uwierzytelnienia oraz funkcje `login` i `logout` dla całej aplikacji. Hook `useLogin` będzie wywoływał `login` z kontekstu w `onSuccess`.

## 7. Integracja API
Integracja z API zostanie zrealizowana za pomocą niestandardowego hooka `useLogin`, który będzie wykorzystywał `useMutation` z `TanStack Query` oraz `axios` do komunikacji z serwerem.

- **Endpoint**: `POST /api/token/`
- **Hook**: `useLogin`
  - Będzie on zawierał funkcję `mutationFn`, która wysyła żądanie `POST` z danymi logowania.
  - W komponencie `LoginForm`, hook zostanie użyty do wywołania mutacji w momencie przesyłania formularza.
  - `onSuccess`: Zostaną wywołane funkcje zapisania tokenów (przez `AuthContext`) i przekierowania użytkownika.
  - `onError`: Zostanie ustawiony stan błędu, który wyświetli `ErrorAlert`.

- **Typy żądania**: `LoginUserCommand`
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

- **Typy odpowiedzi (Success)**: `AuthTokensDto`
```json
{
  "access": "...",
  "refresh": "..."
}
```

- **Typy odpowiedzi (Error)**: `AuthErrorDto` (dla 401)
```json
{
  "detail": "No active account found with the given credentials"
}
```

- **Endpointy resetowania hasła**:
  - `POST /api/password-reset/`: Inicjuje proces, wysyłając e-mail.
  - `POST /api/password-reset/validate_token/`: Sprawdza poprawność tokenu.
  - `POST /api/password-reset/confirm/`: Ustawia nowe hasło.

## 8. Interakcje użytkownika
- **Wpisywanie danych**: Użytkownik wprowadza e-mail i hasło. `react-hook-form` na bieżąco aktualizuje stan i uruchamia walidację (np. przy `onBlur`).
- **Przesłanie formularza**: Użytkownik klika przycisk "Zaloguj" lub naciska Enter.
  - Jeśli walidacja klienta nie przejdzie, wyświetlane są błędy przy odpowiednich polach.
  - Jeśli walidacja przejdzie, przycisk jest blokowany, pojawia się loader, a żądanie API jest wysyłane.
- **Pomyślne logowanie**: Aplikacja zapisuje tokeny i przekierowuje użytkownika do `/watchlist`.
- **Nieudane logowanie**: Loader znika, przycisk staje się ponownie aktywny, a pod formularzem pojawia się alert z komunikatem błędu.

- **Resetowanie hasła**:
  - Użytkownik klika link "Zapomniałeś hasła?".
  - Zostaje przekierowany do `/auth/forgot-password`.
  - Wpisuje swój adres e-mail i wysyła formularz. Otrzymuje komunikat o wysłaniu linku.
  - Otwiera link z e-maila, który prowadzi do `/auth/reset-password?uid=...&token=...`.
  - Aplikacja weryfikuje token. Jeśli jest poprawny, wyświetla formularz do ustawienia nowego hasła.
  - Użytkownik wpisuje i potwierdza nowe hasło. Po pomyślnym ustawieniu zostaje przekierowany na stronę logowania z komunikatem o sukcesie.

## 9. Warunki i walidacja
Walidacja formularza zostanie zaimplementowana przy użyciu biblioteki `zod`.

- **Schemat walidacji**:
  ```typescript
  import { z } from 'zod';

  export const loginSchema = z.object({
    email: z.string().min(1, 'Email jest wymagany.').email('Proszę podać poprawny adres email.'),
    password: z.string().min(1, 'Hasło jest wymagane.'),
  });
  ```
- **Email**:
  - Warunek: Musi być niepuste i mieć format poprawnego adresu e-mail.
  - Komponent: `EmailInput`.
  - Wpływ na UI: Wyświetlenie komunikatu błędu pod polem.
- **Hasło**:
  - Warunek: Musi być niepuste.
  - Komponent: `PasswordInput`.
  - Wpływ na UI: Wyświetlenie komunikatu błędu pod polem.

- **Walidacja dla resetowania hasła**:
  - Schemat `forgotPasswordSchema` będzie walidował pole e-mail.
  - Schemat `resetPasswordSchema` będzie walidował nowe hasło i jego potwierdzenie, sprawdzając siłę i zgodność.

## 10. Obsługa błędów
- **Błędy walidacji klienta**: Obsługiwane przez `react-hook-form` i `zod`. Komunikaty są wyświetlane przy konkretnych polach.
- **Błąd poświadczeń (401 Unauthorized)**: API zwraca błąd. `useMutation` przechodzi w stan `isError`. W UI wyświetlany jest ogólny komunikat w komponencie `ErrorAlert`: "Nieprawidłowy email lub hasło".
- **Błąd serwera (5xx)**: Podobnie jak w przypadku błędu 401, zostanie wyświetlony ten sam ogólny komunikat, aby nie ujawniać szczegółów implementacyjnych. W konsoli deweloperskiej błąd będzie widoczny w celu debugowania.
- **Błąd sieci**: `axios` rzuci wyjątek, który zostanie przechwycony przez `TanStack Query`. Scenariusz jest obsługiwany jak błąd serwera – wyświetlany jest ogólny komunikat.

## 11. Kroki implementacji
1.  **Aktualizacja typów**: Dodać `LoginUserCommand`, `AuthTokensDto` i `AuthErrorDto` do pliku `src/types/api.types.ts`.
2.  **Stworzenie schematu walidacji**: Zdefiniować `loginSchema` przy użyciu `zod` w osobnym pliku (np. `src/lib/validators.ts`).
3.  **Implementacja `AuthContext`**: Stworzyć podstawowy kontekst i dostawcę (`AuthProvider`) do zarządzania tokenami (zapis/odczyt z `localStorage`) i stanem `isAuthenticated`.
4.  **Implementacja hooka `useLogin`**: Stworzyć hook, który używa `useMutation` do wysyłania żądania `POST /api/token/`.
5.  **Budowa komponentów UI**: Stworzyć komponenty `LoginPage` i `LoginForm` zgodnie z opisaną strukturą. Użyć gotowych komponentów z `shadcn/ui` dla pól formularza, przycisku i alertu.
6.  **Integracja logiki formularza**: Podłączyć `react-hook-form` z resolverem `zod` do `LoginForm`, aby zarządzać stanem i walidacją.
7.  **Integracja z API**: W `onSubmit` formularza wywołać mutację z hooka `useLogin`. Dodać obsługę stanów `isLoading`, `isError`, `isSuccess`.
8.  **Obsługa logowania i przekierowania**: W `onSuccess` mutacji wywołać funkcję `login` z `AuthContext` i użyć `useNavigate` z `react-router-dom` do przekierowania użytkownika.
9.  **Dodanie routingu**: Dodać nową ścieżkę `/auth/login` w głównym pliku routingu aplikacji, która będzie renderować `LoginPage`.
10. **Stylowanie i UX**: Dopracować wygląd widoku zgodnie z resztą aplikacji, upewnić się, że obsługa fokusu i przesyłania formularza klawiszem Enter działają poprawnie.
11. **Implementacja resetowania hasła**:
    - Dodać link "Zapomniałeś hasła?" na stronie logowania.
    - Stworzyć nowe trasy `/auth/forgot-password` i `/auth/reset-password`.
    - Zaimplementować komponenty `ForgotPasswordPage` i `ResetPasswordPage` wraz z formularzami.
    - Stworzyć hooki `useForgotPasswordMutation`, `useValidateResetTokenQuery` i `useResetPasswordMutation` do obsługi API.
    - Zintegrować logikę w komponentach, włączając obsługę stanów ładowania i błędów.
