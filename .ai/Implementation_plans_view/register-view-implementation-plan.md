## Plan implementacji widoku Rejestracja

### 1. Przegląd
Widok rejestracji umożliwia utworzenie nowego konta użytkownika zgodnie z polityką haseł. Użytkownik podaje adres email, hasło oraz powtórzenie hasła. Po pomyślnej rejestracji użytkownik nie jest automatycznie logowany; powinien przejść do logowania i następnie do onboardingu (zgodnie z PRD).

Cele UX i bezpieczeństwa:
- Jasna, inline walidacja pól (format email, minimalna długość, litery i cyfry, zgodność hasła i powtórzenia).
- Bezpieczne komunikaty błędów (bez niepotrzebnego ujawniania istnienia konta).
- Dostępność (focus management, role/aria-live dla błędów, prawidłowe atrybuty autocomplete).
- Brak autologowania po 201 (zgodne z PRD) i czytelny komunikat o dalszych krokach.

### 2. Routing widoku
- Ścieżka: `/auth/register`
- Dostęp: publiczny (dla niezalogowanych). Jeśli użytkownik jest zalogowany, przekierowanie do głównego widoku (np. `/` albo `/watchlist`).
- Po sukcesie: przekierowanie do logowania z parametrem `next=/onboarding` (np. `/auth/login?next=/onboarding`) oraz toast z informacją o utworzeniu konta.

### 3. Struktura komponentów
- `RegisterPage`
  - `RegisterForm`
    - `FormFieldEmail`
    - `FormFieldPassword`
      - `PasswordRules`
      - (opcjonalnie) `PasswordStrengthBar`
    - `FormFieldConfirmPassword`
    - `ErrorAlert` (globalny błąd z API)
    - `SubmitButton`
    - `LoginLink`

### 4. Szczegóły komponentów
#### RegisterPage
- Opis: Kontener strony (layout), ustawia tytuł dokumentu, wyśrodkowuje formularz, zawiera nagłówek i krótki opis.
- Główne elementy: wrapper, nagłówek h1, `RegisterForm`.
- Zdarzenia: brak (prezentacyjny, logika w `RegisterForm`).
- Walidacja: brak (delegowana do `RegisterForm`).
- Typy: brak własnych, korzysta z typów formularza.
- Propsy: brak.

#### RegisterForm
- Opis: Rdzeń widoku z logiką formularza. Używa React Hook Form + Zod do walidacji, wywołuje API POST `/api/register/` przez `useRegister`.
- Główne elementy: 
  - `Form` (shadcn/ui) + `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`
  - `Input` (email, password, confirm)
  - `PasswordRules`, `ErrorAlert`, `Button`, `LoginLink`
- Zdarzenia: `onSubmit`, `onChange`, `onBlur`, togglowanie show/hide dla pól haseł.
- Walidacja: 
  - Email: RFC-ish format (Zod `z.string().email()`), wymagane.
  - Hasło: min 8 znaków, co najmniej 1 litera i 1 cyfra (Zod `.refine`).
  - Powtórz hasło: musi być identyczne jak hasło (Zod `.refine` na obiekcie).
- Typy: `RegisterFormValues`, `RegisterUserCommand`, `RegisteredUserDto`, `RegisterApiError`.
- Propsy: brak (samodzielny komponent formularza).

#### FormFieldEmail
- Opis: Pole email z labelką, komunikatem błędu i atrybutami dostępności.
- Główne elementy: `Label`, `Input type="email"` z `autoComplete="email"`.
- Zdarzenia: `onChange`, `onBlur` (trigger walidacji).
- Walidacja: format email.
- Typy: korzysta z `RegisterFormValues` (pole `email`).
- Propsy: kontekst RHF (przez `FormField`).

#### FormFieldPassword
- Opis: Pole hasła z przełączaniem widoczności i listą zasad (`PasswordRules`).
- Główne elementy: `Label`, `Input type="password"` z `autoComplete="new-password"`, toggle „Pokaż/Ukryj”.
- Zdarzenia: `onChange` (aktualizuje wskaźniki w `PasswordRules`).
- Walidacja: min 8, litery + cyfry.
- Typy: korzysta z `RegisterFormValues` (pole `password`).
- Propsy: kontekst RHF (przez `FormField`).

#### PasswordRules
- Opis: Lista zasad siły hasła pokazująca, które warunki są spełnione (checkboxy/ikony). Czysto prezentacyjny, otrzymuje aktualne hasło jako prop.
- Główne elementy: lista z ikonami (np. lucide), kolory dla spełnionych/nie.
- Zdarzenia: brak.
- Walidacja: nie waliduje, tylko prezentuje stan na podstawie stringa hasła.
- Typy: `PasswordRulesProps = { password: string }`.
- Propsy: `password`.

#### FormFieldConfirmPassword
- Opis: Drugie pole hasła do potwierdzenia.
- Główne elementy: `Label`, `Input type="password"` z `autoComplete="new-password"`.
- Zdarzenia: `onChange`, `onBlur`.
- Walidacja: identyczność z `password`.
- Typy: korzysta z `RegisterFormValues` (pole `confirmPassword`).
- Propsy: kontekst RHF.

#### ErrorAlert
- Opis: Pasek błędu globalnego z API (np. 400 bez przypisania do pola lub 500/Network). `role="alert"`, `aria-live="assertive"` i fokus po nieudanym submit.
- Główne elementy: `Alert` (shadcn/ui) + treść błędu.
- Zdarzenia: zamknięcie (opcjonalnie) lub automatyczne ukrycie po poprawkach.
- Walidacja: brak.
- Typy: `ApiErrorMessage: string`.
- Propsy: `message?: string`.

#### SubmitButton
- Opis: Przycisk wysyłający formularz. Disabled, gdy formularz jest niepoprawny lub trwa submit.
- Główne elementy: `Button` (variant default), spinner (opcjonalnie).
- Zdarzenia: `onClick` => submit.
- Walidacja: brak.
- Typy: brak szczególnych.
- Propsy: `isLoading: boolean`, `disabled: boolean`.

#### LoginLink
- Opis: Link do logowania.
- Główne elementy: `Link` → `/auth/login`.
- Zdarzenia: klik.
- Walidacja: brak.
- Typy: brak.
- Propsy: brak.

### 5. Typy
Wykorzystujemy istniejące typy z `src/types/api.types.ts` oraz wprowadzamy lekkie typy widoku.

- Z istniejących:
  - `RegisterUserCommand = { email: string; password: string }`
  - `RegisteredUserDto = { email: string }`

- Nowe typy (ViewModel + błędy):
```ts
// ViewModel formularza (nie wysyłamy confirmPassword do API)
export type RegisterFormValues = {
  email: string;
  password: string;
  confirmPassword: string;
};

// Surowy błąd z API (400) – kształt może być różny; mapujemy bezpiecznie
export type RegisterApiError =
  | { email?: string[]; password?: string[] }
  | { error?: string }
  | Record<string, unknown>;

// Zmapowany błąd do UI
export type RegisterErrorUI = {
  email?: string;
  password?: string;
  global?: string;
};
```

- Schemat Zod (walidacja UI):
```ts
import { z } from "zod";

export const registerSchema = z
  .object({
    email: z.string().email("Podaj poprawny adres email"),
    password: z
      .string()
      .min(8, "Hasło musi mieć co najmniej 8 znaków")
      .refine((v) => /[A-Za-z]/.test(v), {
        message: "Hasło musi zawierać literę",
      })
      .refine((v) => /\d/.test(v), {
        message: "Hasło musi zawierać cyfrę",
      }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła muszą być identyczne",
    path: ["confirmPassword"],
  });
```

### 6. Zarządzanie stanem
- Formularz: `react-hook-form` + `@hookform/resolvers/zod` (`zodResolver(registerSchema)`).
- TanStack Query: `useMutation` do wywołania `POST /api/register/` (hook `useRegister`).
- Lokalne stany UI: `showPassword`, `showConfirmPassword`, `serverError` (string | null), fokus na alert po błędzie.
- Derived state: `isSubmitting`, `isValid`, `errors`, spełnienie zasad w `PasswordRules`.
- Po sukcesie: toast „Konto utworzone. Zaloguj się, aby kontynuować.” + `navigate('/auth/login?next=/onboarding')`.

Custom hook:
```ts
// src/hooks/useRegister.ts
import { useMutation } from "@tanstack/react-query";
import { registerUser } from "@/lib/api/auth";
import type { RegisterUserCommand, RegisteredUserDto } from "@/types/api.types";

export function useRegister() {
  return useMutation<RegisteredUserDto, unknown, RegisterUserCommand>({
    mutationFn: registerUser,
  });
}
```

### 7. Integracja API
- Endpoint: `POST /api/register/`
- Body: `RegisterUserCommand`
- Sukces 201: `RegisteredUserDto`
- Błąd 400: 
  - niepoprawny email,
  - słabe hasło,
  - email już istnieje.

Warstwa klienta (propozycja):
```ts
// src/lib/http.ts (instancja Axios)
import axios from "axios";

export const http = axios.create({
  baseURL: "/",
  headers: { "Content-Type": "application/json" },
  withCredentials: false,
});

// src/lib/api/auth.ts
import { http } from "@/lib/http";
import type { RegisterUserCommand, RegisteredUserDto } from "@/types/api.types";

export async function registerUser(payload: RegisterUserCommand): Promise<RegisteredUserDto> {
  const { data } = await http.post<RegisteredUserDto>("/api/register/", payload);
  return data;
}
```

Mapowanie błędów 400 na UI:
- Jeśli `{ email: ["..."] }` → pokaż błąd przy polu email (np. „Email jest już zajęty”).
- Jeśli `{ password: ["..."] }` → pokaż błąd przy polu hasła.
- Jeśli `{ error: "..." }` lub inny kształt → pokaż `ErrorAlert` na górze.
- Dbałość o treść: nie ujawniać wprost istnienia konta („Email w użyciu” zamiast „Użytkownik istnieje”).

### 8. Interakcje użytkownika
- Wpisanie email: natychmiastowa walidacja; komunikat pod polem.
- Wpisanie hasła: aktualizacja `PasswordRules` i (opcjonalnie) `PasswordStrengthBar`.
- Wpisanie potwierdzenia hasła: walidacja zgodności.
- Klik „Zarejestruj”: 
  - jeśli formularz niepoprawny → fokus na pierwsze błędne pole,
  - jeśli poprawny → wywołanie mutacji, przycisk disabled + spinner,
  - po sukcesie → toast + redirect do logowania z `next=/onboarding`.
- Klik „Masz konto? Zaloguj się” → przejście do `/auth/login`.

### 9. Warunki i walidacja
- Email: wymagany, poprawny format, `type="email"`, `autoComplete="email"`, `aria-invalid` gdy błąd.
- Hasło: wymagane; min 8 znaków; co najmniej 1 litera i 1 cyfra; `type="password"`, `autoComplete="new-password"`.
- Potwierdzenie hasła: wymagane; identyczne jak `password`.
- Submit: dostępny tylko gdy `isValid` oraz nie `isSubmitting`.
- A11y: `aria-describedby` do komunikatów błędów, `role="alert"` dla globalnych błędów, focus trap do pierwszego błędu po submit.

### 10. Obsługa błędów
- 400 z pola `email` → „Email jest w użyciu” (bez potwierdzania istnienia konta w systemie), fokus na email.
- 400 z pola `password` → wyświetl komunikat pod polem hasła.
- 400 globalne/nieznane → `ErrorAlert` z ogólnym komunikatem „Nie udało się utworzyć konta. Spróbuj ponownie później.”
- 500/Network → `ErrorAlert` + możliwość ponownego wysłania.
- Blokada podwójnego wysłania: disabled `SubmitButton` w trakcie mutacji.

### 11. Kroki implementacji
1. Routing
   - Dodaj trasę `/auth/register` w routerze (lazy-load strony).
   - Zaimplementuj guard: jeśli użytkownik zalogowany → redirect do `/`.
2. Typy i schema
   - Dodaj `RegisterFormValues` i `registerSchema` (Zod).
3. API client
   - Dodaj `src/lib/http.ts` (Axios instance) jeśli brak.
   - Dodaj `src/lib/api/auth.ts` z funkcją `registerUser`.
4. Hook
   - Dodaj `src/hooks/useRegister.ts` z `useMutation`.
5. UI i logika
   - Zbuduj `RegisterPage` z kontenerem i nagłówkiem.
   - Zbuduj `RegisterForm` z polami: email, password, confirmPassword.
   - Dodaj `PasswordRules`, `ErrorAlert`, `SubmitButton`, `LoginLink`.
   - Obsłuż focus management (po błędzie: fokus na alert; po niepoprawnym submit: fokus na pierwsze błędne pole).
6. Stany i walidacja
   - Skonfiguruj RHF + zodResolver; pokazuj `FormMessage` pod polami.
   - Dodaj togglowanie widoczności hasła.
7. Integracja z API
   - Podłącz `useRegister` w `onSubmit`.
   - Mapuj błędy 400 na pola/globalny alert.
8. Nawigacja po sukcesie
   - Pokaż toast „Konto utworzone. Zaloguj się, aby kontynuować.”
   - `navigate('/auth/login?next=/onboarding')`.
9. Dostępność i bezpieczeństwo
   - Upewnij się, że komunikaty błędów są zwięzłe i nie ujawniają stanu kont w systemie.
   - Ustaw odpowiednie `aria-*`, `role`, `autocomplete`.
10. Testy
   - Testy jednostkowe Zod: przypadki poprawne/niepoprawne.
   - Test komponentu (RTL + Vitest): render, walidacja inline, mapowanie błędów 400, disable podczas submit, redirect po sukcesie.
11. QA checklist
   - Klawiatura: TAB porusza się logicznie; ENTER wysyła formularz.
   - Ekran czytników: komunikaty błędów czytane po submit.
   - Mobile: klawiatura email/password, brak layout shift.
