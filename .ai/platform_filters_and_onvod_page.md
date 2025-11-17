# Plan Wdrożenia: Filtry Platform i Strona "onVOD"

Ten dokument opisuje kroki niezbędne do zaimplementowania dwóch powiązanych ze sobą funkcjonalności: globalnego systemu filtrowania po platformach VOD oraz nowej strony `/app/onvod` agregującej wszystkie dostępne filmy.

## 1. Cel (High-Level Goal)

1.  **Globalne Filtry Platform**: Wprowadzenie w głównym layoucie aplikacji reużywalnego paska narzędzi z ikonami platform VOD, umożliwiającego użytkownikowi dynamiczne filtrowanie widocznych filmów we wszystkich kluczowych widokach (`onVOD`, `Watchlist`, `Watched`).
2.  **Strona "onVOD"**: Stworzenie nowej, domyślnej strony `/app/onvod`, która będzie prezentować paginowaną listę unikalnych filmów dostępnych na co najmniej jednej z platform VOD, zintegrowaną z nowym systemem filtrowania.

## 2. Plan Modyfikacji Backendu (API)

Zmiany w backendzie są kluczowe do dostarczenia danych dla nowych funkcjonalności.

### 2.1. Nowy Endpoint: `GET /api/on-vod-movies/`

-   **Cel**: Dostarczenie paginowanej, unikalnej listy filmów dostępnych na platformach VOD.
-   **URL**: `/api/on-vod-movies/`
-   **Metoda**: `GET`
-   **Autoryzacja**: Wymagana.
-   **Parametry (Query Params)**:
    -   `page` (int, opcjonalny): Numer strony do paginacji.
    -   `platform_ids` (string, opcjonalny): Rozdzielona przecinkami lista ID platform do filtrowania (np. `?platform_ids=1,3`). Jeśli parametr nie zostanie podany, endpoint zwróci filmy dostępne na dowolnej platformie.
-   **Sortowanie**: Wyniki będą sortowane w kolejności malejącej po `id` z tabeli `movie_availability`. Zapewni to, że najnowsze dodane pozycje pojawią się jako pierwsze.
-   **Logika**:
    1.  Endpoint musi zwracać **unikalne** filmy (`DISTINCT ON (movie.tconst)`).
    2.  Odpowiedź dla każdego filmu powinna zawierać te same dane, co `/api/user-movies/`, w tym informacje o filmie (`movie`), jego dostępności (`availability`) oraz dane kontekstowe użytkownika (`user_movie_info` - czy jest na watchliście, czy jest obejrzany, jaka jest ocena użytkownika). Pozwoli to na pełne ponowne wykorzystanie komponentów `UserMovieCard`/`UserMovieRow`.
-   **Struktura Odpowiedzi** (Paginowana):
    ```json
    {
      "count": 123,
      "next": "/api/on-vod-movies/?page=2",
      "previous": null,
      "results": [
        {
          "id": null, // id z user_movie, może być null
          "movie": {
            "tconst": "tt0111161",
            "primary_title": "The Shawshank Redemption",
            // ... reszta pól filmu
          },
          "availability": [
            {"platform_id": 1, "platform_name": "Netflix", "is_available": true}
          ],
          "watchlisted_at": "2025-10-12T10:00:00Z", // lub null
          "watched_at": null, // lub null
          "user_rating": 8 // lub null
        }
      ]
    }
    ```

### 2.2. Modyfikacja Endpointu: `GET /api/user-movies/`

-   **Cel**: Rozszerzenie istniejącego endpointu o możliwość filtrowania po platformach VOD.
-   **URL**: `/api/user-movies/`
-   **Parametry (Query Params)**:
    -   Do istniejących parametrów (`status`, `ordering`, `is_available`) należy dodać `platform_ids` (string, opcjonalny), działający analogicznie jak w nowym endpoincie. Filtr ten powinien działać w połączeniu z istniejącymi (np. pokazywać filmy z watchlisty, które są dostępne na platformach o ID 1 i 5).

## 3. Plan Implementacji Frontendu (UI/UX)

Implementacja na frontendzie zostanie podzielona na logiczne, następujące po sobie kroki.

### 3.1. Krok 1: Globalny Stan Filtrów (Zustand) ✅

-   **Cel**: Stworzenie centralnego miejsca do zarządzania stanem filtrów platform.
-   **Implementacja**:
    -   ✅ Utworzony nowy store Zustand (`src/stores/platformFilterStore.ts`).
    -   ✅ Store przechowuje:
        -   `platforms: PlatformDto[]`: Lista wszystkich platform (ładowana przez `usePlatforms` hook).
        -   `selectedPlatformIds: Set<number>`: Zbiór ID aktualnie aktywnych platform.
        -   `actions`:
            -   `togglePlatform(platformId: number)`: Przełącza stan wybranej platformy.
            -   `selectAll()`: Zaznacza wszystkie platformy.
            -   `deselectAll()`: Odznacza wszystkie platformy.
            -   `initialize(platforms: PlatformDto[])`: Inicjalizuje store wszystkimi dostępnymi platformami jako domyślnie zaznaczonymi.

### 3.2. Krok 2: Nowy Komponent `PlatformFiltersToolbar` ✅

-   **Cel**: Stworzenie reużywalnego paska narzędzi z filtrami.
-   **Lokalizacja**: `src/components/library/PlatformFiltersToolbar.tsx` (przeniesiony do library)
-   **Struktura**:
    -   ✅ Komponent pobiera stan i akcje z store'a Zustand.
    -   **Po lewej**: Grupa przełączników z ikonami platform. Stan każdej ikony (aktywne/nieaktywne) odzwierciedla stan w store. Kliknięcie wywołuje `togglePlatform`.
    -   **Po prawej**: Przycisk "Pokaż wszystkie" / "Ukryj wszystkie". Jego funkcja zależy od aktualnego stanu:
        -   Jeśli wszystkie platformy są zaznaczone, tekst to "Ukryj wszystkie", kliknięcie wywołuje `deselectAll`.
        -   W przeciwnym wypadku, tekst to "Pokaż wszystkie", kliknięcie wywołuje `selectAll`.

### 3.3. Krok 3: Modyfikacja Głównego Layoutu (`MediaLibraryLayout`) ✅

-   **Cel**: Integracja nowych elementów nawigacyjnych i paska filtrów.
-   **Zmiany w `MediaLibraryLayout.tsx`:**
    1.  ✅ **Nawigacja (`tabs`)**: Dodany nowy, pierwszy link "onVOD" prowadzący do `/app/onvod`.
    2.  ✅ **Nowy Slot na Pasek Filtrów**: Dodany nowy slot `globalFilters` między headerem a toolbar, gdzie renderowany jest `PlatformFiltersToolbar`.

### 3.4. Krok 4: Nowa Strona `OnVODPage` ✅

-   **Cel**: Stworzenie nowej strony `/app/onvod`.
-   **Routing**: ✅ Dodana nowa ścieżka `/app/onvod` w router configuration.
-   **Komponent (`OnVODPage.tsx`)**:
    -   ✅ Używa hooka `useOnVODMoviesQuery` z TanStack Query do pobierania danych z `/api/on-vod-movies/`.
    -   ✅ Hook subskrybuje zmiany w `platformFilterStore` i przekazuje `selectedPlatformIds` jako `platform_ids`.
    -   ✅ Renderuje filmy używając dedykowanych komponentów `OnVODMovieCard`/`OnVODMovieRow` (zamiast `UserMovieCard`).
    -   ✅ Implementacja infinite scroll z automatycznym ładowaniem kolejnych stron.
    -   ✅ Pełny toolbar z: SearchCombobox, SuggestAIButton, ViewToggle, SortDropdown, liczniki filmów.
    -   ✅ Integracja z `PlatformFiltersToolbar` w globalnych filtrach.

### 3.5. Krok 5: Adaptacja Istniejących Stron (`WatchlistPage`, `WatchedPage`)

-   **Cel**: Zintegrowanie istniejących widoków z nowym, globalnym systemem filtrów.
-   **Zmiany w `WatchlistPage.tsx` i `WatchedPage.tsx`**:
    1.  **Zachowanie istniejących filtrów**: Przycisk "Ukryj niedostępne" pozostaje w komponentach `FiltersBar` i `WatchedFiltersBar` w toolbar każdej strony. Komponenty te mogą zostać zrefaktoryzowane jeśli zawierają inną logikę, która ma pozostać.
    2.  **Integracja z globalnym stanem**: Hooki `useQuery`/`useInfiniteQuery` w tych stronach zostaną zmodyfikowane tak, aby pobierały `selectedPlatformIds` ze store'a Zustand i przekazywały je jako parametr `platform_ids` do endpointu `/api/user-movies/`.
    3.  **Aktualizacja UI**: Upewnienie się, że po usunięciu starych filtrów layout wygląda poprawnie, a nowy, globalny pasek jest poprawnie wyświetlany.

## Dodatkowe uwagi do planu

### Brakujące szczegóły implementacyjne:

1. **Integracja z istniejącymi preferencjami sesji**: Globalne filtry platform powinny współistnieć z istniejącymi `useSessionPreferences` (view mode, sort, lokalne filtry). Stan globalny platform będzie niezależny od preferencji sesyjnych użytkownika.

2. **Migracje bazy danych**: Plan zakłada, że struktura bazy danych (tabele `platform`, `movie_availability`, `user_movie`) jest już gotowa zgodnie z `db-plan.md`. Jeśli nie, będą potrzebne migracje Supabase.

3. **Zachowanie starych komponentów filtrów**: `FiltersBar` i `WatchedFiltersBar` pozostają w toolbar każdej strony z przyciskiem "Ukryj niedostępne". Ich funkcjonalność zostanie rozszerzona o globalne filtry platform.

4. **Obsługa pustych filtrów platform**: Jeśli użytkownik nie ma wybranych platform (`selectedPlatformIds` jest pusty), endpointy powinny zwracać wszystkie filmy (bez filtrowania po platformach).

5. **Domyślny stan filtrów**: Wszystkie platformy powinny być domyślnie zaznaczone przy inicjalizacji store'a Zustand, aby zapewnić wsteczną kompatybilność.

6. **Performance**: Przy dużej liczbie filmów, filtrowanie po wielu platformach może być kosztowne - upewnić się, że indeksy w bazie danych są optymalne (GIN indexes na `genres`, partial indexes na availability).

## Stan implementacji

### ✅ Zakończone (Faza 2 - Backend):

1. **Rozszerzony endpoint `/api/user-movies/`** ✅
   - Dodano parametr `platform_ids` do query params
   - Walidacja formatu i istnienia platform w bazie danych
   - Integracja z istniejącą logiką filtrowania (is_available, ordering, status)
   - Test potwierdzony: `GET /api/user-movies/?status=watchlist&platform_ids=1,2` działa

2. **Nowy endpoint `/api/on-vod-movies/`** ✅
   - Serializer `OnVODMoviesQueryParamsSerializer` dla parametrów page, platform_ids
   - Serializer `OnVODMovieSerializer` zwracający identyczną strukturę co UserMovieSerializer z id=null
   - Service function `build_on_vod_movies_queryset()` z filtrowaniem i sortowaniem
   - View `OnVODMoviesView` z paginacją i obsługą błędów
   - URL path dodany: `path("api/on-vod-movies/", OnVODMoviesView.as_view(), name="on-vod-movies")`
   - Test potwierdzony: `GET /api/on-vod-movies/` działa

### ✅ Zakończone (Faza 3 - Frontend):

1. **Globalny stan filtrów (Zustand)** ✅
   - Utworzony `platformFilterStore.ts` ze wszystkimi akcjami (togglePlatform, selectAll, deselectAll, initialize)
   - Wszystkie platformy domyślnie zaznaczone przy inicjalizacji

2. **PlatformFiltersToolbar** ✅
   - Utworzony komponent w `src/components/library/PlatformFiltersToolbar.tsx`
   - Przełączniki platform z ikonami i tooltipami
   - Przyciski "Pokaż wszystkie"/"Ukryj wszystkie"
   - Loading states i accessibility

3. **MediaLibraryLayout** ✅
   - Dodany slot `globalFilters` między headerem a toolbar
   - Dodana nawigacja "onVOD" jako pierwszy link

4. **OnVODPage** ✅
   - Utworzona strona `/app/onvod` z pełnym routingiem
   - `useOnVODMoviesQuery` z infinite scroll i subskrypcją filtrów
   - Dedykowane komponenty `OnVODMovieCard`/`OnVODMovieRow` dla UserMovieDto
   - Pełny toolbar z SearchCombobox, SuggestAIButton, ViewToggle, SortDropdown
   - Liczniki wyświetlanych filmów ("Wyświetlane: X/Y")
   - Sortowanie takie jak na innych stronach (added_desc, imdb_desc, year_desc, year_asc)
   - AISuggestionsDialog z obsługą modalu i rate limiting
   - onVOD jako domyślna strona aplikacji (pierwsze logowanie przekierowuje do `/app/onvod`)

### 🔄 Następne kroki:
- Adaptacja istniejących stron (`WatchlistPage`, `WatchedPage`) - zintegrować z globalnymi filtrami platform
- Zaktualizować endpoint `/api/user-movies/` żeby obsługiwał platform_ids
- Przetestować pełną funkcjonalność filtrowania platform na wszystkich stronach