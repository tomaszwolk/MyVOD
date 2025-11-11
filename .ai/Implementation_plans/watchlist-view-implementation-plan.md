## Plan implementacji widoku Watchlista

## 1. Przegląd
- Cel: Centralne zarządzanie filmami do obejrzenia z podglądem dostępności VOD, szybkim dodawaniem przez wyszukiwarkę oraz akcjami „Oznacz obejrzane” i „Usuń”.
- Zakres: Dwa tryby prezentacji (kafelki/lista), sortowanie, filtry („Tylko dostępne”, „Ukryj niedostępne”), licznik X/Y, toasty, confirm dialog, optimistic updates z cofnięciem, lazy images, zapamiętywanie preferencji w sesji, przycisk „Zasugeruj filmy”.

## 2. Routing widoku
- Ścieżka: `/app/watchlist`
- Ochrona: Wymagane JWT; w razie 401 przekierowanie do logowania z komunikatem o wygaśnięciu sesji.

## 3. Struktura komponentów
- `WatchlistPage`
  - `AppHeader` (globalny)
  - `WatchlistControlsBar`
    - `SearchCombobox`
    - `ViewToggle` (grid/list)
    - `SortDropdown`
    - `FiltersBar`
      - `OnlyAvailableCheckbox`
      - `HideUnavailableButton`
      - `VisibleCounter`
    - `SuggestAIButton`
  - `WatchlistContent`
    - `MovieGrid` (tryb kafelkowy) → wiele `MovieCard` + `AvailabilityIcons`
    - `MovieList` (tryb listowy) → wiele `MovieRow` + `AvailabilityIcons`
    - `EmptyState`
    - `SkeletonList`
  - `ConfirmDialog` (usuwanie)
  - `SuggestionModal` (sugestie AI)
  - `ToastViewport`

## 4. Szczegóły komponentów
### WatchlistPage
- Opis: Kontener strony. Pobiera dane (watchlista, profil, platformy), utrzymuje stan preferencji, scala interakcje (mutacje, toasty, dialogi, modal AI).
- Główne elementy: wrapper, nagłówek, pasek kontrolny, treść listy.
- Zdarzenia: inicjalizacja zapytań, zmiany preferencji (widok/sort/filtry), wywołania akcji elementów, obsługa 401.
- Walidacja: `ordering` i `is_available` niewysyłane (sort/filtr po kliencie). 401 → redirect.
- Typy: `UserMovieDto`, `MovieSearchResultDto`, `AISuggestionsDto`, `UpdateUserMovieCommand`, `AddUserMovieCommand`, `UserProfileDto`, `PlatformDto`, ViewModel-e (rozdz. 5).
- Propsy: brak.

### WatchlistControlsBar
- Opis: Pasek akcji nad listą: wyszukiwanie, przełącznik widoku, sortowanie, filtry, licznik X/Y, przycisk AI.
- Główne elementy: layout responsywny (Tailwind), komponenty shadcn/ui: `Input`, `Select`, `Checkbox`, `Button`, `Tooltip`.
- Zdarzenia: `onAddFromSearch`, `onViewModeChange`, `onSortChange`, `onFiltersChange`, `onSuggest`.
- Walidacja: wyszukiwanie min. 2 znaki; sort tylko z allow-listy; `OnlyAvailable` disabled gdy użytkownik nie wybrał platform.
- Typy: `SortOption`, `ViewMode`, `FiltersState`.
- Propsy:
  - `viewMode: ViewMode`
  - `onViewModeChange(mode: ViewMode): void`
  - `sort: SortOption`
  - `onSortChange(option: SortOption): void`
  - `filters: FiltersState`
  - `onFiltersChange(next: FiltersState): void`
  - `visibleCount: number`
  - `totalCount: number`
  - `hasUserPlatforms: boolean`
  - `onSuggest(): void`
  - `isSuggestDisabled: boolean`

### SearchCombobox
- Opis: Autocomplete do `GET /api/movies?search=` z limitem 10 wyników.
- Główne elementy: `Command`/`Combobox` (shadcn), input, lista wyników z mini plakatem 50x75, tytułem, rokiem, oceną (placeholder gdy brak plakatu/oceny).
- Zdarzenia: `onQueryChange` (debounce 250–300 ms), `onSelect(result)` → `onAdd(tconst)`.
- Walidacja: min. 2 znaki (inaczej nie wywołujemy API), max. 255; blokada duplikatów po stronie UI.
- Typy: `MovieSearchResultDto`.
- Propsy: `onAdd(tconst: string): void`, `existingTconsts: string[]`.

### ViewToggle
- Opis: Przełącznik `grid`/`list` z ikonami (Lucide).
- Główne elementy: dwa przyciski z `aria-pressed`.
- Zdarzenia: `onChange`.
- Walidacja: n/d.
- Typy: `ViewMode`.
- Propsy: `value: ViewMode`, `onChange(mode: ViewMode): void`.

### SortDropdown
- Opis: Dropdown sortowania po stronie klienta.
- Główne elementy: `Select` shadcn.
- Zdarzenia: `onChange`.
- Walidacja: tylko predefiniowane wartości.
- Typy: `SortOption`.
- Propsy: `value: SortOption`, `onChange(option: SortOption): void`.

### FiltersBar (OnlyAvailableCheckbox, HideUnavailableButton, VisibleCounter)
- Opis: Filtry oraz licznik „Wyświetlane: X/Y”. „Ukryj niedostępne” przełącza `onlyAvailable`.
- Główne elementy: `Checkbox`, `Button` (toggle), `Badge`.
- Zdarzenia: `onToggleOnlyAvailable`, `onToggleHideUnavailable`.
- Walidacja: `OnlyAvailable` disabled gdy `userProfile.platforms.length === 0` (plus tooltip/link do profilu).
- Typy: `FiltersState`.
- Propsy: `filters`, `onChange`, `visibleCount`, `totalCount`, `hasUserPlatforms: boolean`.

### WatchlistContent
- Opis: Renderuje grid/listę, skeletony i pusty stan.
- Główne elementy: `MovieGrid`/`MovieList`, `EmptyState`, `SkeletonList`.
- Zdarzenia: delegowane do dzieci.
- Walidacja: n/d.
- Typy: `WatchlistItemVM[]`, `ViewMode`.
- Propsy: `items`, `mode`, `onMarkWatched(id: number)`, `onDelete(id: number)`.

### MovieCard / MovieRow
- Opis: Prezentacja pojedynczego filmu (kafel/wiersz) z akcjami.
- Główne elementy: obraz (stałe wymiary + lazy), tytuł, rok, gatunki, ocena ("—" gdy brak), `AvailabilityIcons`, badge „Niedostępne…”, przyciski „Obejrzane” i „Usuń”.
- Zdarzenia: `onMarkWatched`, `onDelete` (otwiera `ConfirmDialog`).
- Walidacja: `avg_rating` może być string/null → formatowanie; brak plakatu → placeholder.
- Typy: `WatchlistItemVM`.
- Propsy: `item`, `onMarkWatched(id)`, `onDelete(id)`.

### AvailabilityIcons
- Opis: Ikony platform (kolor dla dostępnych, szary/ukryty dla niedostępnych), tooltipy z nazwami.
- Główne elementy: zestaw ikon (Lucide/custom) mapowanych po `platform_slug` lub `id`.
- Zdarzenia: n/d.
- Walidacja: render tylko dla platform użytkownika (filtr po profilu).
- Typy: `MovieAvailabilityDto[]` (przefiltrowane) lub `AvailabilitySummary`.
- Propsy: `availability: MovieAvailabilityDto[]`, `platforms: PlatformDto[]` (do mapowania ikon).

### EmptyState
- Opis: Pusty stan z komunikatem i aktywną wyszukiwarką.
- Główne elementy: ikona/ilustracja, tekst, `SearchCombobox`.
- Zdarzenia: `onAdd` z comboboxa.
- Propsy: `onAdd(tconst)`.

### ConfirmDialog
- Opis: Potwierdzenie usunięcia: „Czy na pewno chcesz usunąć [tytuł]…?”
- Główne elementy: `Dialog` shadcn.
- Zdarzenia: `onConfirm`, `onCancel`.
- Propsy: `open`, `onOpenChange`, `title`, `message`, `onConfirm`.

### SuggestAIButton + SuggestionModal
- Opis: Przycisk „Zasugeruj filmy” i modal z listą 1–5 sugestii (plakat, tytuł, rok, uzasadnienie, ikony, przycisk „Dodaj”).
- Główne elementy: `Button`, `Dialog/Sheet` z listą kart.
- Zdarzenia: `onClick` (GET), `onAdd(tconst)` (POST), zamykanie.
- Walidacja: 429 → disabled + tooltip z czasem do odnowienia; 404 → komunikat informacyjny.
- Typy: `AISuggestionsDto`.
- Propsy: `open`, `onOpenChange`, `data: AISuggestionsDto | null`, `onAdd(tconst)`.

## 5. Typy
- Wykorzystanie istniejących DTO: `PlatformDto`, `UserMovieDto`, `MovieAvailabilityDto`, `MovieSearchResultDto`, `AISuggestionsDto`, `AddUserMovieCommand`, `UpdateUserMovieCommand`, `UserProfileDto`.
- Nowe typy (frontend ViewModel):
  - `type ViewMode = 'grid' | 'list'`
  - `type SortOption = 'added_desc' | 'imdb_desc' | 'year_desc' | 'year_asc'`
  - `type FiltersState = { onlyAvailable: boolean; hideUnavailable: boolean }`
  - `type AvailabilitySummary = { isAvailableOnAny: boolean; availablePlatformIds: number[] }`
  - `type WatchlistItemVM = {
      id: number;
      movie: {
        tconst: string;
        primary_title: string;
        start_year: number | null;
        genres: string[] | null;
        avg_rating: string | null;
        poster_path: string | null;
      };
      availability: MovieAvailabilityDto[];
      watchlisted_at: string | null;
      watched_at: string | null;
      availabilitySummary: AvailabilitySummary;
    }`

## 6. Zarządzanie stanem
- Biblioteka: TanStack Query (dane serwerowe) + stan UI (React) + sessionStorage (preferencje).
- Preferencje (klucze): `watchlist:viewMode`, `watchlist:sort`, `watchlist:onlyAvailable`, `watchlist:hideUnavailable`.
- Custom hooki:
  - `useSessionPreferences()` – odczyt/zapis preferencji z domyślnymi wartościami: `grid`, `added_desc`, `false`, `false`.
  - `useWatchlistQuery()` – `GET /api/user-movies?status=watchlist`.
  - `useUserProfile()` – `GET /api/me/` (lista wybranych platform przez użytkownika).
  - `usePlatforms()` – `GET /api/platforms/` (mapowanie ikon po `platform_slug`).
  - `useMovieSearch(query)` – `GET /api/movies?search=` (debounce; limit 10 wyników po klientu).
  - `useAddMovie()` – `POST /api/user-movies` (po sukcesie dołączenie elementu do cache i toast).
  - `useMarkWatched()` – `PATCH /api/user-movies/:id { action: 'mark_as_watched' }` (optimistic remove + rollback on error).
  - `useDeleteUserMovie()` – `DELETE /api/user-movies/:id` (optimistic remove + toast z „Cofnij”, które wykonuje `PATCH restore_to_watchlist`).
  - `useAISuggestions()` – on-demand `GET /api/suggestions` (obsługa 404/429) i `useAddFromSuggestion()` – `POST /api/user-movies`.
- Sort/Filtr po kliencie:
  - Sort: `added_desc` (watchlisted_at desc), `imdb_desc` (avg_rating desc, null last), `year_desc`/`year_asc` (start_year, null last).
  - Filtr `onlyAvailable`: `item.availabilitySummary.isAvailableOnAny === true`.
  - „Ukryj niedostępne”: szybkie ustawienie `onlyAvailable=true`/`false`.

## 7. Integracja API
- `GET /api/user-movies?status=watchlist` → `UserMovieDto[]`
  - 200: lista; 400/401: obsługa (401 → login).
- `POST /api/user-movies` body: `{ tconst: string }` → `UserMovieDto`
  - 201: toast „Dodano do watchlisty”; 400/409: komunikaty.
- `PATCH /api/user-movies/:id` body: `{ action: 'mark_as_watched' }` → `UserMovieDto`
  - 200: usunięcie z listy; 400/404/401: komunikaty.
- `DELETE /api/user-movies/:id` → 204 (optimistic remove, toast z „Cofnij”).
- `PATCH /api/user-movies/:id` body: `{ action: 'restore_to_watchlist' }` – do cofnięcia po usunięciu.
- `GET /api/movies?search=` → `MovieSearchResultDto[]` (limit 10).
- `GET /api/suggestions` → `AISuggestionsDto` (200/404/429; modal, przycisk disabled do `expires_at`).
- `GET /api/me/` → `UserProfileDto` (warunki filtrowania, komunikaty UX).
- `GET /api/platforms/` → `PlatformDto[]` (ikony/platformy do tooltipów i mapowania dostępności).

## 8. Interakcje użytkownika
- Przełącznik widoku: zapis do sessionStorage; natychmiastowa zmiana układu.
- Sortowanie: zmiana opcji → re-sorting w pamięci (bez refetch).
- Filtry: `onlyAvailable` i „Ukryj niedostępne” (ustawia `onlyAvailable=true`) → odświeżenie listy w pamięci, licznik X/Y.
- Wyszukiwanie → wybór wyniku: `POST` dodania, toast, dopięcie do listy (jeśli nie duplikat).
- Oznaczenie obejrzane: `PATCH mark_as_watched` → optimistic remove, toast sukcesu (rollback on error).
- Usuwanie: confirm dialog → `DELETE` → optimistic remove + toast z „Cofnij”, które wywoła `PATCH restore_to_watchlist` (rollback pewny).
- Sugestie AI: klik → loader → modal z wynikami; dodanie pozycji → `POST` i oznaczenie przycisku jako „Dodano”.

## 9. Warunki i walidacja
- Dostęp do widoku: wymaga JWT; 401 → redirect do logowania + informacja.
- Wyszukiwanie: min. 2 znaki; debounce; wyniki max 10.
- `tconst`: prosty regex `^tt\d+$` po stronie klienta (niewiążący) + walidacja serwera.
- Sort: tylko `SortOption` (mapowanie do labeli UI).
- Filtr dostępności: disabled, gdy `userProfile.platforms.length === 0` (z tooltipem/linkiem do profilu).
- Ikony dostępności: render tylko dla platform użytkownika; brak danych → opcjonalny badge „Dostępność nieznana”.
- „Stan z: [data]”: renderuj, jeśli dostępne w modelu; w przeciwnym razie pomiń (rozszerzenie API w przyszłości o `last_checked`).

## 10. Obsługa błędów
- 401: interceptor Axios → czyszczenie tokenów i redirect do logowania; preferencje pozostają w sessionStorage.
- 400/404/409: toasty (np. duplikat przy dodaniu).
- 429 (AI): przycisk disabled z tooltipem do `expires_at` (czas do odnowienia).
- 500/Network: toast „Spróbuj ponownie później”, przyciski retry.
- Obrazy: `onError` → placeholder.
- Optimistic UI: rollback przy błędzie PATCH/DELETE.

## 11. Kroki implementacji
1. Routing i guard JWT dla `/app/watchlist`.
2. Klient API (`src/lib/api`): funkcje dla user-movies, movies, suggestions, me, platforms + interceptory Axios (refresh/401 → redirect).
3. Hooki danych: `useWatchlistQuery`, `useUserProfile`, `usePlatforms`, `useMovieSearch`, `useAddMovie`, `useMarkWatched`, `useDeleteUserMovie`, `useAISuggestions`.
4. Hook preferencji: `useSessionPreferences` (pobieranie/zapis do sessionStorage, domyślne wartości).
5. Komponenty UI: `WatchlistControlsBar` (SearchCombobox, ViewToggle, SortDropdown, FiltersBar, SuggestAIButton), `ConfirmDialog`, `SuggestionModal`, `ToastViewport`.
6. Prezentacja listy: `MovieGrid`/`MovieCard`, `MovieList`/`MovieRow`, `AvailabilityIcons`, `EmptyState`, `SkeletonList`; layout responsywny.
7. Logika selektorów: sortowanie i filtrowanie po kliencie (memo), licznik X/Y.
8. Akcje elementów: confirm usuwania, optimistic updates, toast z „Cofnij” (wykorzystaj `restore_to_watchlist`).
9. Sugestie AI: integracja GET/POST, obsługa 404/429, modal i oznaczanie dodanych.
10. UX/A11y: focus states, role/aria, lazy images ze stałymi wymiarami, tooltips.
11. Testy: selektory sort/filtr (jednostkowe), komponenty (RTL), mutacje z rollback (integracyjne), smoke dla wywołań API.
12. Perf: memoizacje, ewentualna wirtualizacja listy przy dużej liczbie elementów.


