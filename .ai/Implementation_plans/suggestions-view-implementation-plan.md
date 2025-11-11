## Plan implementacji widoku Sugestie AI

## 1. Przegląd
Widok prezentuje do 5 sugestii filmów wygenerowanych przez AI wraz z krótkim uzasadnieniem i informacją o dostępności na platformach VOD użytkownika. Umożliwia dodanie wybranych sugestii do watchlisty, obsługuje limit 1 żądania na dzień. Implementuje modal przysłaniający bieżącą listę watchlisty.

Cele:
- Szybkie wyświetlenie bieżącej paczki sugestii (o ile istnieje) lub informacja o limicie/danych wejściowych.
- Dodanie filmu do watchlisty jednym kliknięciem z logicznym zablokowaniem przycisku i czytelnym statusem.
- Jasne komunikaty i czytelny odlicznik do resetu dziennego.


## 2. Routing widoku
- Modal: renderowany w kontekście strony `/app/watchlist`, sterowany stanem `open` oraz nawigacją.
- Wzorzec nawigacyjny:
  - Klik przycisku „Zasugeruj filmy” na `/app/watchlist` otwiera modal osadzony nad watchlistą.
  - Zamknięcie modala: `navigate(-1)` (powrót), a gdy brak historii – `navigate('/app/watchlist')`.
- Parametr `?debug=true` (tylko środowisko testowe/dev) może omijać limit – przekazywany do zapytania.


## 3. Struktura komponentów
- WatchlistPage
  - SuggestionsTriggerButton
  - AISuggestionsDialog (portal/modal, focus trap)
    - AISuggestionsHeader
      - Title
      - RateLimitBadge (odliczanie, stan limitu)
    - SuggestionList
      - SuggestionCard (x1..5)
        - Poster
        - Title + Year
        - Justification
        - AvailabilityIcons
        - AddToWatchlistButton
    - EmptyState (warianty: 404/limit/brak danych)
    - Footer (Zamknij)


## 4. Szczegóły komponentów
### SuggestionsTriggerButton
- Opis: Przycisk w nagłówku watchlisty do uruchomienia widoku sugestii w modalu.
- Elementy: Button z ikoną „magic/sparkles”, opcjonalny tooltip z informacją o limicie.
- Zdarzenia: onClick → otwarcie modala z sugestiami.
- Walidacja: Gdy limit obowiązuje (z kontekstu lub wcześniejszej odpowiedzi 429), button disabled i tooltip „Możesz otrzymać nowe sugestie za Xh Ym”.
- Typy: brak nowych; odbiera flagi stanu limitu.
- Propsy: `{ disabled?: boolean; nextAvailableAt?: Date | null; }`.

### AISuggestionsDialog
- Opis: Modal osadzony nad watchlistą; focus trap; obsługa klawiatury (Esc, Tab).
- Elementy: Dialog/Modal (shadcn/ui), Header, Content (lista/empty states), Footer.
- Zdarzenia: `onOpenChange`, `onEscapeKeyDown`, `onInteractOutside` → zamknięcie i powrót na watchlistę.
- Walidacja: Brak.
- Typy: korzysta z VM widoku (sekcja 5).
- Propsy: `{ open: boolean; onClose: () => void; debug?: boolean }`.


### AISuggestionsHeader
- Opis: Pasek nagłówka z tytułem i informacją o limicie/czasie do resetu.
- Elementy: H2, RateLimitBadge.
- Zdarzenia: Brak.
- Walidacja: Brak.
- Propsy: `{ expiresAt?: string | null; isRateLimited: boolean }`.

### SuggestionList
- Opis: Siatka kart 1..5; responsywna (grid 1–2 mobile, 3–4 desktop).
- Elementy: UL/OL lub div grid; wewnątrz `SuggestionCard`.
- Zdarzenia: Brak (delegowane do kart/przycisków).
- Walidacja: Gdy brak elementów → nie renderuje, wyświetlany jest `EmptyState`.
- Propsy: `{ items: AISuggestionCardVM[]; onAdd: (tconst: string) => Promise<void>; addedSet: Set<string> }`.

### SuggestionCard
- Opis: Karta pojedynczej sugestii.
- Elementy: Poster (TMDB url lub placeholder), tytuł, rok, uzasadnienie (1–2 zdania), AvailabilityIcons, AddToWatchlistButton.
- Zdarzenia: onAdd – dodanie do watchlisty z blokadą i toastem.
- Walidacja: Button disabled, gdy:
  - element w `addedSet`, lub
  -  już na watchliście (z kontekstu), lub
  - trwa request.
- Propsy: `{ item: AISuggestionCardVM; isAlreadyOnWatchlist: boolean; isAdding: boolean; onAdd: () => void }`.

### AvailabilityIcons
- Opis: Ikony platform z kolorami dla dostępnych i szarymi dla niedostępnych.
- Elementy: lista ikon (SVG) lub badge’y.
- Zdarzenia: Tooltip na hover/focus z nazwą platformy.
- Walidacja: Render tylko platform z `availability` z odpowiedzi.
- Propsy: `{ availability: MovieAvailabilityDto[] }`.

### RateLimitBadge
- Opis: Badge z odliczaniem do resetu (na podstawie `expires_at` lub północy lokalnej).
- Elementy: Badge / chip, timer odświeżany co 1s.
- Zdarzenia: Brak.
- Walidacja: Gdy brak `expires_at` i stan 429 – fallback do lokalnej północy.
- Propsy: `{ expiresAt?: string | null; isRateLimited: boolean }`.

### EmptyState
- Opis: Różne stany pustki/błędów: 404 (brak danych), 429 (limit), 200 z pustą listą, 500/Network.
- Elementy: Ikona/ilustracja, tytuł, opis, CTA (np. „Wyszukaj filmy”).
- Propsy: `{ variant: 'no-data'|'rate-limited'|'no-suggestions'|'error'; message?: string }`.

### AddToWatchlistButton
- Opis: Przycisk dodawania z obsługą requestu i stanów (idle/loading/success/disabled).
- Elementy: Button, spinner, ikona „check” po sukcesie.
- Zdarzenia: onClick → POST /api/user-movies.
- Walidacja: Disable przy 409 (już na liście) oraz po sukcesie; idempotentne kliknięcia.
- Propsy: `{ onAdd: () => Promise<void>; disabled: boolean; added: boolean; loading: boolean }`.


## 5. Typy
Wykorzystanie istniejących typów z `src/types/api.types.ts`:
- `AISuggestionsDto`: `{ expires_at: string; suggestions: SuggestionItemDto[] }`
- `SuggestionItemDto`: `{ tconst: string; primary_title: string; start_year: number; justification: string; availability: MovieAvailabilityDto[] }`
- `MovieAvailabilityDto`: `{ platform_id: number; platform_name: string; is_available: boolean | null }`
- `AddUserMovieCommand`: `{ tconst: string }`

Nowe typy (ViewModel + pomocnicze):
- `AISuggestionCardVM`:
  - `tconst: string`
  - `title: string`
  - `year: number | null`
  - `justification: string`
  - `posterUrl: string | null` (z DTO `poster_path` jeśli dostępne; fallback placeholder)
  - `availability: MovieAvailabilityDto[]`
- `AISuggestionsViewModel`:
  - `expiresAt: string | null`
  - `items: AISuggestionCardVM[]`
  - `isRateLimited: boolean`
  - `errorMessage?: string`
- `ApiError` (uproszczony kształt błędu): `{ status: number; message?: string }`


## 6. Zarządzanie stanem
- Pobieranie sugestii: `useAISuggestions({ debug?: boolean })` oparte na TanStack Query.
  - `queryKey: ['ai-suggestions', { debug }]`
  - `staleTime` i `gcTime` wyliczone do `expires_at` (jeśli 200), aby nie odświeżać przed resetem.
  - Obsługa stanów: loading, success (200), empty (0 elementów), 404 (no-data), 429 (rate-limited), 500/network (error).
- Dodawanie do watchlisty: `useAddToWatchlist()` (POST), zarządza stanem `loading` per `tconst`, optimistic disable i toast po sukcesie.
- Zestaw `addedSet: Set<string>` – trwale blokuje przycisk po sukcesie.
- Zestaw `watchlistTconstSet: Set<string>` – przekazywany z kontekstu watchlisty.
- `useCountdownTo(date)` – hook zwracający `hh:mm:ss` do `RateLimitBadge` (aktualizacja co 1s, cleanup on unmount).
- Sterowanie modalem: stan kontrolowany przez router.


## 7. Integracja API
- GET `/api/suggestions/`
  - Auth: JWT (Axios interceptor).
  - Query: opcjonalnie `?debug=true` (dev).
  - Response 200: `AISuggestionsDto` → mapowanie do `AISuggestionsViewModel`.
  - Response 404: `InsufficientData` → `EmptyState(variant='no-data')`.
  - Response 429: `RateLimit` → `EmptyState(variant='rate-limited')`, `RateLimitBadge` z odliczaniem do północy (fallback).
  - Response 500/Network: `EmptyState(variant='error')` + przycisk „Spróbuj ponownie”.
- POST `/api/user-movies/`
  - Body: `AddUserMovieCommand` `{ tconst }`.
  - 201: toast „Film dodany do watchlisty” + blokada przycisku + aktualizacja `addedSet`.
  - 409: toast „Ten film jest już na Twojej watchliście” + blokada przycisku.
  - 400/401/500: odpowiedni toast błędu; 401 → przekierowanie do logowania.


## 8. Interakcje użytkownika
- Klik „Zasugeruj filmy” na watchliście → otwiera modal i odpala zapytanie GET.
- W trakcie ładowania: spinner i tekst „Generuję sugestie…”.
- Klik „Dodaj do watchlisty” na karcie:
  - Disabled podczas requestu; po 201 – stan „Dodano” i disabled.
  - Przy 409 – toast informujący, stan disabled.
- Zamknięcie modala: Esc, kliknięcie przycisku „Zamknij”, kliknięcie tła (o ile dozwolone) → powrót do watchlisty.
- Tooltip na przycisku globalnym, gdy limit aktywny.


## 9. Warunki i walidacja
- Brak danych wejściowych do AI (404): komunikat „Dodaj filmy do watchlisty lub oznacz jako obejrzane…” + link do wyszukiwarki.
- Limit dzienny (429): brak nadmiarowych informacji; wyświetl „Dzisiejszy limit wykorzystany. Nowe sugestie jutro.” + odliczanie do północy.
- Prawidłowa paczka (200): do 5 elementów; jeśli 0 – wariant `no-suggestions` z komunikatem „Nie znaleziono sugestii. Spróbuj później.”
- Dodawanie do watchlisty: weryfikacja blokad przycisku (isAdding, addedSet, watchlistTconstSet) i obsługa 409.
- Autoryzacja: 401 → automatyczny redirect do logowania (globalny interceptor) i zachowanie intencji powrotu.


## 10. Obsługa błędów
- 404: `EmptyState('no-data')`, CTA do wyszukiwarki.
- 429: `EmptyState('rate-limited')`, RateLimitBadge z odliczaniem, ukrycie/disable głównego przycisku na watchliście.
- 500/Network: `EmptyState('error')` z przyciskiem „Spróbuj ponownie” (ponowne wywołanie zapytania nie liczy się do limitu).
- 409 (POST): toast informujący + per-karta blokada.
- Braki posterów TMDB: placeholder o stałym rozmiarze.
- A11y: focus trap, aria-attributes, oznaczenia przycisków, kolejność tabulacji.


## 11. Kroki implementacji
1) Routing i wyzwalacz
   - Dodać modal nad `/app/watchlist`.
   - Umieścić `SuggestionsTriggerButton` w nagłówku watchlisty; zaszyć disabled + tooltip przy limicie.

2) Hooki i klient API
   - Przygotować `apiClient` (Axios) z interceptorami JWT i błędów.
   - Zaimplementować `useAISuggestions({ debug? })` (TanStack Query) z mapowaniem na `AISuggestionsViewModel` i polityką cache do `expires_at`.
   - Zaimplementować `useAddToWatchlist()` (POST) ze wsparciem per-item loading i toastami.
   - Zaimplementować `useCountdownTo(date)`.

3) Komponenty UI
  - `AISuggestionsDialog` – kontener, nagłówek, lista, stopka, empty states.
   - `SuggestionList`, `SuggestionCard`, `AvailabilityIcons`, `AddToWatchlistButton`, `RateLimitBadge`, `EmptyState`.
   - Stylowanie Tailwind + shadcn/ui (Dialog, Button, Badge, Tooltip, Toast).

4) Integracja z watchlistą
   - Przekazać `watchlistTconstSet` z kontekstu do widoku.
   - Po dodaniu (201) – opcjonalnie odświeżyć listę watchlisty (invalidate Query) lub zastosować event bus.

5) Dostępność i UX
   - Focus trap, aria-labels, obsługa Esc, poprawny cykl Tab, focus na nagłówku lub pierwszym aktywnym przycisku.
   - Responsywne układy kart, czytelne kontrasty, tooltips na ikonach platform.

6) Testy (rekomendowane)
   - Jednostkowe: mapowanie DTO→VM, `useCountdownTo`.
   - Integracyjne: ścieżki 200/404/429/500; klik „Dodaj do watchlisty” (201, 409); focus/keyboard w modalu.

7) Dokumentacja i cleanup
   - Krótkie README sekcyjne dla komponentu, opis parametrów `debug` i polityki cache.
   - Review zgodności z PRD i user stories; finalne poprawki.


