# Plan implementacji widoku Widoki błędów i fallbacki

## 1. Przegląd
Widoki błędów i fallbacki dostarczają spójne, bezpieczne i dostępne komunikaty o problemach oraz akcje naprawcze (CTA), bez przerywania pracy użytkownika. Obejmują:
- Strony routingu: 404 (`*`), nieautoryzowany (`/error/unauthorized`), offline (`/error/offline`).
- Fallbacki kontekstowe w komponentach: błędy integracji (Watchmode, Gemini, TMDB), puste wyniki wyszukiwania, utrata sesji JWT.
- Zasady UX: czytelne opisy, brak wrażliwych szczegółów, wyraźne CTA: „Zaloguj ponownie”, „Odśwież”, „Spróbuj ponownie”, „Wróć do strony głównej”.

## 2. Routing widoku
- `*` → strona 404 (NotFoundPage)
- `/error/unauthorized` → UnauthorizedErrorPage (używane gdy auto-odświeżenie tokena nie powiedzie się)
- `/error/offline` → OfflineErrorPage (opcjonalny redirect w trybie całkowitego offline)
- Dodatkowo: fallbacki kontekstowe w istniejących widokach (watchlista, sugestie AI, wyszukiwarka) – nie są osobnymi ścieżkami.

## 3. Struktura komponentów
- `AppRoutes`
  - `Route path="*" element={<NotFoundPage/>}`
  - `Route path="/error/unauthorized" element={<UnauthorizedErrorPage/>}`
  - `Route path="/error/offline" element={<OfflineErrorPage/>}`
- `ErrorView` (komponent bazowy stron błędów)
  - `ErrorIllustration`
  - `ErrorTitle`
  - `ErrorDescription`
  - `ErrorActions` (zawiera przyciski CTA)
- Fallbacki kontekstowe:
  - `FallbackBanner` (np. błąd Watchmode, komunikat „Stan z: [data]”) – nienachalny, nad listami
  - `SuggestionsErrorInline` (sekcja sugestii AI)
  - `SearchNoResultsItem` (pozycja w dropdown wyszukiwarki)
  - `TMDBPoster` (renderuje placeholder przy błędzie obrazu / braku plakatu)
- Infrastruktura UI/stan:
  - `OfflineGuard` (wykrywa `navigator.onLine`, subskrybuje zdarzenia `online`/`offline`)
  - Konfiguracja HTTP (Axios) + interceptory 401/429/itp.
  - Integracja z TanStack Query (retry, `QueryErrorResetBoundary`)

## 4. Szczegóły komponentów
### ErrorView
- Opis: Bazowy, dostępny (ARIA), bezpieczny komponent do prezentacji błędu/komunikatu i CTA.
- Główne elementy: ilustracja/ikona, tytuł, opis, lista akcji (przyciski), opcjonalny link powrotu.
- Obsługiwane interakcje: kliknięcia CTA (`onPrimary`, `onSecondary`, `onLink`).
- Obsługiwana walidacja: brak – wejście tylko przez propsy; brak ujawniania szczegółów systemu.
- Typy: `ErrorKind`, `ErrorAction`, `ErrorViewModel` (sekcja 5).
- Propsy:
  - `variant: ErrorKind`
  - `model: ErrorViewModel`

### NotFoundPage
- Opis: Strona 404 dla nieistniejących tras.
- Główne elementy: `ErrorView` z wariantem `not_found`, CTA: „Wróć do strony głównej”, „Przejdź do watchlisty”.
- Obsługiwane interakcje: nawigacja do `/` lub np. `/watchlist`.
- Obsługiwana walidacja: zawsze bezpieczne treści.
- Propsy: brak (statyczny wariant + lokalne akcje nawigacji).

### UnauthorizedErrorPage
- Opis: Strona prezentowana, gdy odświeżenie tokena nie powiedzie się lub brak uprawnień.
- Główne elementy: `ErrorView` z wariantem `unauthorized`, CTA: „Zaloguj ponownie”, link do rejestracji.
- Obsługiwane interakcje: nawigacja do `/login` z `returnTo` w stanie/URL.
- Obsługiwana walidacja: brak, CTA aktywne zawsze; nie zdradza przyczyn (np. „refresh expired”).
- Propsy: brak.

### OfflineErrorPage
- Opis: Strona informująca o braku połączenia.
- Główne elementy: `ErrorView` z wariantem `offline`, CTA: „Spróbuj ponownie” (odświeża dane/stronę), „Wróć do strony głównej”.
- Obsługiwane interakcje: sprawdzenie `navigator.onLine`, `invalidateQueries()` lub `window.location.reload()`.
- Obsługiwana walidacja: CTA „Spróbuj ponownie” aktywny tylko, gdy odzyskano online (opcjonalnie).
- Propsy: brak.

### FallbackBanner
- Opis: Baner informacyjny nad listą/sekcją przy błędach zewnętrznych API (np. Watchmode) – aplikacja działa dalej.
- Główne elementy: ikona statusu, treść, meta (np. „Stan z: 3 października 2025”), opcjonalny przycisk „Szczegóły”/„Ukryj”.
- Obsługiwane interakcje: zamknięcie, link do profilu (jeśli dotyczy), ewentualny `Retry`.
- Obsługiwana walidacja: wymaga poprawnego formatu daty; brak wrażliwych szczegółów.
- Typy: `AvailabilityMeta` (sekcja 5).
- Propsy:
  - `message: string`
  - `meta?: { lastCheckedAt?: string }`
  - `onRetry?: () => void`
  - `variant?: 'info' | 'warning'` (domyślnie `info`)

### SuggestionsErrorInline
- Opis: Kompaktowy blok błędu w sekcji sugestii AI (US-032), w miejscu wyników.
- Główne elementy: krótki komunikat + `RetryButton` „Spróbuj ponownie”.
- Obsługiwane interakcje: ponowne wywołanie mutacji (nie nalicza limitu dziennego – zgodnie z logiką frontu).
- Obsługiwana walidacja: brak; CTA aktywny zawsze; błąd logowany do konsoli/monitoringu.
- Propsy:
  - `message: string`
  - `onRetry: () => void`

### SearchNoResultsItem
- Opis: Pozycja w dropdown autocomplete przy braku wyników (US-010).
- Główne elementy: ikonka info, „Nie znaleziono filmów”, podpowiedź „Spróbuj wpisać tytuł oryginalny filmu”.
- Obsługiwane interakcje: brak akcji; dropdown pozostaje otwarty.
- Obsługiwana walidacja: renderowane tylko dla `query.length >= 2 && results.length === 0`.
- Propsy: `query: string`.

### TMDBPoster
- Opis: Renderuje plakat z TMDB, z kontrolowanym fallbackiem na placeholder (US-039).
- Główne elementy: `<img>` z `onError` → placeholder (ten sam rozmiar), opcjonalny `alt`.
- Obsługiwane interakcje: brak.
- Obsługiwana walidacja: nigdy nie pokazuje komunikatu błędu użytkownikowi; błąd logowany dla admina.
- Propsy:
  - `src?: string | null`
  - `alt: string`
  - `width: number`
  - `height: number`

### OfflineGuard
- Opis: HOC/komponent otaczający sekcje wymagające online. Reaguje na `online`/`offline`.
- Główne elementy: stan `isOffline`, render warunkowy dzieci vs. redirect/baner.
- Obsługiwane interakcje: nasłuch zdarzeń, opcjonalny redirect do `/error/offline`.
- Obsługiwana walidacja: brak.
- Propsy: `mode?: 'banner' | 'redirect'` (domyślnie `banner`).

## 5. Typy
Nowe typy UI/ViewModel (frontend):

```ts
// Rodzaj błędu do ujednoliconej prezentacji
export type ErrorKind =
  | 'not_found'
  | 'unauthorized'
  | 'offline'
  | 'api_generic'
  | 'suggestions_error';

export type ErrorAction = {
  id: 'login' | 'retry' | 'home' | 'watchlist' | 'refresh';
  label: string;
  variant?: 'primary' | 'secondary' | 'link';
};

export type ErrorViewModel = {
  title: string;
  description: string;
  actions: ErrorAction[];
};

// Meta do komunikatów o dostępności (Watchmode)
export type AvailabilityMeta = {
  lastCheckedAt?: string; // ISO string, prezentowane jako „Stan z: [data]”
  source?: 'cache' | 'live' | 'unknown';
};

// Model dla banera fallbackowego
export type FallbackBannerModel = {
  message: string;
  meta?: AvailabilityMeta;
  variant?: 'info' | 'warning';
};
```

Uwaga dot. istniejących typów API:
- `MovieAvailabilityDto` (z `src/types/api.types.ts`) nie zawiera daty `last_checked`. Na poziomie ViewModel dodajemy pole `lastCheckedAt?` (opcjonalne). Backend może zwrócić tę informację w osobnym polu lub poprzez rozszerzenie dto – UI obsługuje oba przypadki.
- Dla błędów sugestii korzystamy z własnego komunikatu i retry – bez zmian w `AISuggestionsDto`.

## 6. Zarządzanie stanem
- Globalne:
  - TanStack Query: retry dla zapytań (domyślnie 3), `QueryErrorResetBoundary` dla resetu błędu po „Spróbuj ponownie”.
  - Axios interceptors: mapowanie błędów HTTP do `ErrorKind`; automatyczny refresh tokena na 401; publikacja zdarzeń do warstwy UI.
  - `OfflineGuard`: lokalny stan `isOffline`, aktualizowany eventami przeglądarki.
- Lokalnie w komponentach:
  - `SuggestionsErrorInline`: przechowuje stan `isRetrying` (dla spinnera w przycisku).
  - `TMDBPoster`: stan `hasError` po `onError` obrazka.
  - `SearchNoResultsItem`: bez stanu, render warunkowy przez rodzica.

## 7. Integracja API
- Brak dedykowanych endpointów stron błędów. Reagujemy na kody HTTP z istniejących endpointów.
- 401 Unauthorized (US-043):
  - Interceptor odpowiedzi: jedna próba `POST /api/token/refresh/` z `refresh_token` (bez interakcji użytkownika).
  - Sukces: ustaw nowy access token, powtórz oryginalne żądanie, kontynuuj.
  - Porażka: wyczyść tokeny, pokaż komunikat „Twoja sesja wygasła. Zaloguj się ponownie.” i przekieruj do `/login` z `returnTo`. Alternatywnie wyświetl `/error/unauthorized`.
- 404 Not Found (np. `GET /api/suggestions/` przy braku danych wejściowych):
  - Nie pokazujemy strony 404 – renderujemy `EmptyState`/komunikat w obrębie widoku sugestii.
- 429 Too Many Requests (limit AI):
  - Pokazujemy komunikat o limicie; CTA: informacja o czasie do odblokowania (jeśli dostępny w nagłówkach) lub neutralny komunikat.
- Błędy integracji:
  - Watchmode (US-021): UI wyświetla baner z „Stan z: [data]”, ikony platform odzwierciedlają ostatni znany stan; działa dalej.
  - Gemini (US-032): w sekcji sugestii `SuggestionsErrorInline` z CTA „Spróbuj ponownie” (front nie zalicza tego do limitu; retry lokalne/odświeżenie cache).
  - TMDB (US-039): tylko placeholder grafiki; brak komunikatu.

## 8. Interakcje użytkownika
- Strony błędów:
  - 404: „Wróć do strony głównej” → `/`; „Przejdź do watchlisty” → `/watchlist`.
  - Unauthorized: „Zaloguj ponownie” → `/login?returnTo=<poprzednia_ścieżka>`.
  - Offline: „Spróbuj ponownie” → invalidacja zapytań lub reload; „Wróć do strony głównej”.
- Fallbacki kontekstowe:
  - Watchmode: baner informacyjny, brak destrukcyjnych CTA; opcjonalnie „Odśwież” (ponów zapytanie dostępności).
  - Sugestie AI: „Spróbuj ponownie” rewywołuje mutację; błąd logowany.
  - Wyszukiwarka: wyświetla `SearchNoResultsItem` przy braku wyników, dropdown pozostaje otwarty.
- TMDBPoster: brak interakcji, tylko wizualny fallback.

## 9. Warunki i walidacja
- Nigdy nie pokazujemy surowych szczegółów błędu (stack, endpointy, treści serwera).
- 401: próbujemy automatycznego odświeżenia tokena dokładnie raz per żądanie; zapobiegamy pętli odświeżania.
- Offline: sprawdzamy `navigator.onLine`; przy powrocie online można aktywować CTA „Spróbuj ponownie”.
- Watchmode: jeżeli brak `lastCheckedAt` → pokazujemy tylko „Ostatni znany stan” bez daty.
- Wyszukiwarka: komunikat „Nie znaleziono filmów” renderuje się tylko dla `query.length >= 2`.
- TMDB: placeholder musi mieć dokładnie rozmiar oryginalnego obrazka; `alt` dostępny.

## 10. Obsługa błędów
- Centralny transformer błędów (warstwa kliencka):
  - Mapuje kody HTTP i błędy sieci do kategorii UI (`ErrorKind`).
  - Rejestruje błędy integracji (Watchmode, TMDB, Gemini) w logach.
- TanStack Query: skonfigurowany `retry` i `onError` w miejscach krytycznych.
- Zapobieganie regresji UX:
  - Watchlist/suggestions nie przerywają renderu – prezentują stan częściowy/placeholdery.
  - Brak blokujących modalów błędu (poza explicite wywołanymi akcjami, jak logowanie).

## 11. Kroki implementacji
1) Routing
- Dodaj trasy: `*`, `/error/unauthorized`, `/error/offline` do `AppRoutes`.

2) Komponent bazowy i strony błędów
- Zaimplementuj `ErrorView` + ilustracje, nagłówki, opisy, CTA.
- Utwórz `NotFoundPage`, `UnauthorizedErrorPage`, `OfflineErrorPage` oparte o `ErrorView`.

3) Infrastruktura sieciowa i sesja
- Skonfiguruj interceptory Axios: `response` 401 → `POST /api/token/refresh/` → retry; fallback do `/login` z komunikatem.
- Zaimplementuj zapobieganie pętli odświeżania i współdzielenie odświeżenia między równoległymi żądaniami.

4) OfflineGuard
- Zaimplementuj wykrywanie `online/offline`, zapewnij wariant `banner` (preferowany) i opcjonalny redirect do `/error/offline`.

5) Fallbacki kontekstowe
- Watchmode: dodaj `FallbackBanner` nad listami z dostępnością; pokaż „Stan z: [data]” gdy dostępne; ukryj szczegóły systemowe.
- TMDB: zamień użycia obrazka na `TMDBPoster` z placeholderem na błąd.
- Sugestie AI: w komponencie sugestii dodaj `SuggestionsErrorInline` z CTA retry.
- Wyszukiwarka: w dropdown dodaj `SearchNoResultsItem` wg warunków walidacji.

6) Integracja z TanStack Query
- Owiń w `QueryErrorResetBoundary` krytyczne sekcje; podłącz „Spróbuj ponownie” do `reset` lub `invalidateQueries`.

7) Formatowanie czasu
- Dodaj util do formatowania daty `lastCheckedAt` na „[dzień] [miesiąc słownie] [rok]” w języku polskim.

8) Telemetria/logowanie
- Loguj błędy integracji (Watchmode, TMDB, Gemini) do konsoli/monitoringu (future: panel admina – zgodnie z PRD US-035).

9) Testy
- Testy komponentów: `ErrorView`, `FallbackBanner`, `TMDBPoster` (onError → placeholder), `SuggestionsErrorInline` (retry), `SearchNoResultsItem`.
- Testy integracyjne: interceptor 401 (refresh → retry; brak refresh → redirect), `OfflineGuard` (symulacja offline/online), render 404.

10) Dostępność i i18n
- Zapewnij role ARIA i odpowiednie `alt`/teksty przycisków.
- Wszystkie treści w PL; przygotowanie pod i18n (klucze tekstów) – nice-to-have.

---

Wytyczne UX (skrót):
- Zwięzłe, przyjazne komunikaty, wyraźne CTA.
- Bez ujawniania szczegółów technicznych.
- Fallbacki nie blokują przepływu – użytkownik może dalej używać aplikacji.
