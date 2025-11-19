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

### 3.5. Krok 5: Adaptacja Istniejących Stron (`WatchlistPage`, `WatchedPage`) ✅

-   **Cel**: Zintegrowanie istniejących widoków z nowym, globalnym systemem filtrów.
-   **Zmiany w `WatchlistPage.tsx` i `WatchedPage.tsx`**:
    1.  ✅ **Zachowanie istniejących filtrów**: Przycisk "Ukryj niedostępne" pozostaje w komponentach `FiltersBar` i `WatchedFiltersBar` w toolbar każdej strony.
    2.  ✅ **Integracja z globalnym stanem**: Hooki `useListUserMovies` zostały zmodyfikowane tak, aby pobierały `selectedPlatformIds` ze store'a Zustand i przekazywały je jako parametr `platform_ids` do endpointu `/api/user-movies/`.
    3.  ✅ **Aktualizacja UI**: Dodano globalne filtry platform do obu stron poprzez `PlatformFiltersToolbar` w MediaLibraryLayout.
    4.  ✅ **Ukrycie przycisku "Ukryj niedostępne"**: Przycisk został ukryty w globalnych filtrach platform na stronach WatchlistPage i WatchedPage (pozostaje tylko w toolbar).
    5.  ✅ **Nawigacja onVOD**: Dodano zakładkę "onVOD" jako pierwszą w nawigacji na wszystkich stronach (WatchlistPage, WatchedPage, ProfilePage, AdminDashboardPage).

### 3.6. Krok 6: Poprawki Sortowania ✅

-   **Cel**: Naprawa i ujednolicenie systemu sortowania na wszystkich stronach.
-   **Zmiany**:
    1.  ✅ **OnVODPage**: Dodano pełne sortowanie po stronie backendu (added_desc, imdb_desc, year_desc, year_asc) z obsługą NULL wartości.
    2.  ✅ **WatchedPage**: Dodano sortowanie po stronie backendu dla wszystkich opcji WatchedSortKey (watched_at_desc, user_rating_desc, imdb_rating_desc, added_desc, year_desc, year_asc).
    3.  ✅ **Backend**: Rozszerzono serializer i service funkcje o obsługę wszystkich opcji sortowania z prawidłową obsługą NULL wartości (filmy bez ocen trafiają na koniec).
    4.  ✅ **UI**: Poprawiono duplikaty w WatchedSortDropdown i znormalizowano wygląd przycisków platform.

### 3.7. Krok 7: Refaktoryzacja Sortowania 🔄

-   **Cel**: Przejrzeć dostępne opcje sortowania i zoptymalizować ich zestaw.
-   **Zadania do wykonania**:
    1.  🔄 **Przejrzeć duplikaty**: Sprawdzić czy opcje `imdb_rating_desc` i `imdb_desc` są potrzebne (obie sortują po ocenie IMDb).
    2.  🔄 **Sprawdzić konsystencję**: Upewnić się, że wszystkie strony mają spójny zestaw opcji sortowania.
    3.  🔄 **Przetestować funkcjonalność**: Sprawdzić czy wszystkie opcje sortowania działają poprawnie i czy kolejność filmów jest prawidłowa.
    4.  🔄 **Optymalizować UI**: Rozważyć czy niektóre opcje nie powinny być usunięte lub dodane dla lepszego UX.

### 3.8. Krok 8: Interakcje z Filmem na Stronie OnVOD ✅

-   **Cel**: Rozbudowanie strony `/app/onvod` o trzy kluczowe akcje:
    1.  ✅ Ocenianie filmu, które automatycznie dodaje go do listy "Obejrzane".
    2.  Dodawanie filmu bezpośrednio do "Watchlisty".
    3.  Dodawanie filmu bezpośrednio do "Obejrzanych" (bez oceny).

#### 1. Backend (API) - Kluczowa Optymalizacja

-   **Rekomendacja**: Rozszerzenie `POST /api/user-movies/` o dodatkowe akcje.
-   **Cel**: Umożliwienie dodawania filmu do bazy `user_movie` wraz z jednoczesnym wykonaniem akcji (oznaczenie jako obejrzany, dodanie oceny) w jednym zapytaniu.
-   **Endpoint**: `POST /api/user-movies/`
-   **Proponowane zmiany w ciele żądania**:
    -   Serializator powinien akceptować dwa nowe, opcjonalne pola: `action` i `rating`.
        ```json
        {
          "tconst": "tt0816692",
          "action": "mark_as_watched", // Opcjonalne. Jeśli brak, domyślnie dodaje do watchlisty.
          "rating": 8                 // Opcjonalne. Wysłanie oceny implikuje 'mark_as_watched'.
        }
        ```
-   **Logika w serwisie backendowym**:
    1.  Implementacja logiki "znajdź lub utwórz" (`get_or_create`) dla rekordu `user_movie` na podstawie `user_id` i `tconst`.
    2.  **Jeśli `rating` jest podany**: Ustawia `user_rating` oraz `watched_at` na aktualny czas (ocena jest równoznaczna z obejrzeniem).
    3.  **Jeśli `action` to `mark_as_watched`**: Ustawia `watched_at` na aktualny czas.
    4.  **Domyślnie (gdy brak `action` i `rating`)**: Ustawia `watchlisted_at`.
    5.  Endpoint powinien zawsze zwracać zaktualizowany obiekt `UserMovieDto` ze statusem `200 OK` (jeśli rekord istniał) lub `201 Created` (jeśli został utworzony).

#### 2. Frontend (UI/UX)

-   **Krok 1: Modyfikacja komponentów `OnVODMovieCard` i `OnVODMovieRow`**:
    -   **Logika warunkowa**: Nowe kontrolki (gwiazdka, przyciski) powinny być widoczne **tylko wtedy, gdy film nie jest jeszcze na żadnej z list użytkownika** (`watchlisted_at` i `watched_at` mają wartość `null`). Jeśli film jest już na liście, w miejscu przycisków powinien pojawić się odpowiedni status (np. "Na Twojej watchliście" lub "Obejrzany").
    -   **Gwiazdka Oceny (`MovieRating`)**:
        -   Tooltip po najechaniu: **"Oceń i dodaj do Obejrzanych"**.
        -   Kliknięcie otwiera `RatingModal`.
    -   **Nowa sekcja z przyciskami**: Poniżej informacji o dostępności na platformach VOD, należy dodać kontener (`div`) z dwoma przyciskami ikonowymi:
        -   **Przycisk "Dodaj do Watchlisty" (lewa strona)** z tooltipem **"Dodaj do Watchlisty"**.
        -   **Przycisk "Dodaj do Obejrzanych" (prawa strona)** z tooltipem **"Dodaj do Obejrzanych"**.

-   **Krok 2: Utworzenie hooków do zarządzania akcjami**:
    -   **Nowy hook: `useAddUserMovie`**:
        -   Będzie obsługiwał dodanie do watchlisty (`POST /api/user-movies/` z `{ tconst }`) oraz dodanie do obejrzanych (`POST` z `{ tconst, action: 'mark_as_watched' }`).
    -   **Modyfikacja hooka: `useRateMovie`**:
        -   Wywoła `POST /api/user-movies/` z `{ tconst, rating, action: 'mark_as_watched' }`.

#### 3. Zarządzanie Stanem Aplikacji (TanStack Query)

-   **Implementacja w hookach `useAddUserMovie` i `useRateMovie`**:
    -   **`onMutate`**: Optymistyczna aktualizacja cache'a dla `on-vod-movies`.
    -   **`onError`**: Przywrócenie stanu sprzed mutacji.
    -   **`onSettled`**: Unieważnienie zapytań `['on-vod-movies']`, `['user-movies', 'watchlist']` i `['user-movies', 'watched']` w celu synchronizacji.

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
   - Przycisk "Pokaż wszystkie"/"Ukryj wszystkie" (kwadratowy z ikoną X)
   - Loading states i accessibility
   - Możliwość ukrycia przycisku "Ukryj niedostępne" poprzez prop `hideUnavailableButton`

3. **MediaLibraryLayout** ✅
   - Dodany slot `globalFilters` między headerem a toolbar
   - Dodana nawigacja "onVOD" jako pierwszy link na wszystkich stronach
   - Przyciski nawigacji i filtry platform są w tej samej linii (nawigacja po lewej, filtry po prawej)

4. **OnVODPage** ✅
   - Utworzona strona `/app/onvod` z pełnym routingiem
   - `useOnVODMoviesQuery` z infinite scroll i subskrypcją filtrów
   - Dedykowane komponenty `OnVODMovieCard`/`OnVODMovieRow` dla UserMovieDto
   - Pełny toolbar z SearchCombobox, SuggestAIButton, ViewToggle, SortDropdown
   - Liczniki wyświetlanych filmów ("Wyświetlane: X/Y")
   - Sortowanie po stronie backendu (added_desc, imdb_desc, year_desc, year_asc)
   - AISuggestionsDialog z obsługą modalu i rate limiting
   - onVOD jako domyślna strona aplikacji (pierwsze logowanie przekierowuje do `/app/onvod`)
   - Responsywny grid layout dla widoku kafelkowego (2-6 kolumn w zależności od ekranu)
   - Poprawione skalowanie placeholderów (object-cover dla spójności z prawdziwymi plakatami)
   - Przycisk "Ukryj niedostępne" ukryty (nieużyteczny na stronie OnVOD)

5. **Adaptacja istniejących stron** ✅
   - **WatchlistPage**: Zintegrowane globalne filtry platform, ukryty przycisk "Ukryj niedostępne" w filtrach
   - **WatchedPage**: Zintegrowane globalne filtry platform, ukryty przycisk "Ukryj niedostępne" w filtrach, sortowanie po stronie backendu
   - **ProfilePage & AdminDashboardPage**: Dodana nawigacja do onVOD

### 🔄 Następne kroki:
- **Refaktoryzacja sortowania**: Przejrzeć dostępne opcje sortowania, usunąć duplikaty, sprawdzić konsystencję i poprawność działania na wszystkich stronach
- **Aktualizacja README**

## Przyszłe usprawnienia (Future Enhancements)

### Przycisk "Ukryj obejrzane" na stronach Watchlist i Watched i na OnVOD
- **Opis**: Zmiana przycisku "Ukryj niedostępne" na stronach Watchlist i Watched na przycisk "Filtry". Dodanie przycisku filtrującego na stronie OnVODD
- **Szczegóły**:
  - Kliknięcie w przycisk "Filtry" pokazuje panel. Strzałka obok napisu wskazuje, czy panel jest zwinięty czy rozwinięty
  - Sekcja Gatunki posiada opcję "Zaznacz/Odznacz wszystkie" dla wygody oraz listę gatunków w formie checkboxów ułożonych w siatce, by zaoszczędzić miejsce
  - Sekcja Status posiada proste i intuicyjne przełączniki (toggle switches) do szybkiego filtrowania filmów.
  - Na stronach Watchlist i Watched w sekcji Status będzie opcja "Ukryj obejrzane" / "Pokaż obejrzane"
  - Na stronie OnVOD w sekcji Status będzie opcja "Ukryj obejrzane / Pokaż obejrzane" oraz "Ukryj na Watchlist / Pokaż na Watchlist"
  - Przyciski akcji: "Zastosuj filtry" aktywuje wybrane opcje, a "wyczyść" resetuje wszystkie wybory do stanu domyślnego
  - Odznaczenie wszystkich gatunków a następnie kliknięcie Zastosuj filtry spowoduje, że nic się nie zmieni (inaczej żaden film nie został by wybrany)
  - Filtr będzie dostępny na wszystkich stronach (onVOD, Watchlist, Watched)
  - Możliwość wyboru wielu gatunków jednocześnie
  - Rozważyć zapamiętanie stanu przycisku w preferencjach użytkownika (jako późniejszy etap implementacji)
- **Powód odłożenia**: Wymaga rozszerzenia API o filtrowanie po gatunkach i dodania UI dla wyboru gatunków
- **Priorytet**: Wysoki - znacząco poprawi UX przy wyszukiwaniu filmów
- **Wygląd interfejsu**:
  ---------------------------------------------------------------------------------------------------
|                                                                                                 |
|  OnVOD   Watchlista   [ Obejrzane ]   Profil   Admin                  Platformy: [N] [HBO] [D+] ... |
|                                                                                                 |
|  [  magnifying_glass  Szukaj filmu... ]   [ ✨ Zasugeruj filmy ]  [田] [≡] [ Data dodania v ] [ Filtry ^ ]   |
|                                                                                                 |
|  ┌─────────────────────────────────────────────────────────────────────────────────────────────┐  |
|  │                                                                                             │  |
|  │   Gatunki                                     [ Zaznacz wszystkie ] [ Odznacz wszystkie ]   │  |
|  │   ---------------------------------------------------------------------------------------   │  |
|  │   [x] Akcja     [ ] Dramat    [x] Komedia    [ ] Romans     [ ] Thriller   [ ] Sci-Fi        │  |
|  │   [ ] Horror    [x] Kryminał  [ ] Animacja   [ ] Fantasy    [ ] Familijny  [ ] Przygodowy    │  |
|  │                                                                                             │  |
|  │   Lata produkcji                                                                            │  |
|  │   ---------------------------------------------------------------------------------------   │  |
|  │   od: 1920 ‹———————•—————————————————————————————————•———————› 2025                       │  |
|  │                                                                                             │  |
|  │   Twórcy                                                                                    │  |
|  │   ---------------------------------------------------------------------------------------   │  |
|  │   Reżyser:  [ Wpisz nazwisko...                                                    ]        │  |
|  │   Aktor:    [ Wpisz nazwisko...                                                    ]        │  |
|  │                                                                                             │  |
|  │   Status                                                                                    │  |
|  │   ---------------------------------------------------------------------------------------   │  |
|  │   Pokaż obejrzane                                                         (•)-----          │  |
|  │   Pokaż na watchlist                                                      ( )-----          │  |
|  │                                                                                             │  |
|  │                                                                 [ Zastosuj filtry ] [ Wyczyść ] │  |
|  └─────────────────────────────────────────────────────────────────────────────────────────────┘  |
|                                                                                                 |
|  [ Plakat filmu 1 ]  [ Plakat filmu 2 ]  [ Plakat filmu 3 ]  [ Plakat filmu 4 ] [ Plakat filmu 5 ]  |
|                                                                                                 |
---------------------------------------------------------------------------------------------------

### Rozszerzenie Filtrów
**Opis**: Dodanie opcji filtrowania po roku produkcji, reżyserach i po głównych aktorach.
**Szczegóły**:
- Rozbudowa poprzedniej koncepcji. Panel filtrów jest wyższy i może być podzielony na dwie kolumny, by uniknąć długiego przewijania
- Lata produkcji: Suwak zakresu (range slider) to najbardziej intuicyjny sposób na filtrowanie po dacie.
- Dwa pola tekstowe z funkcją autouzupełnienia/podpowiedzi, któa po wpisaniu pierwszych liter nazwiska reżysera lub aktora podpowiadałaby poasujące osoby z bazy danych
- **Powód odłożenia**: Wymaga implementacji podstawowej funkcji filtrowania i dodania do bazy danych informacji o aktorach i reżyserach
- **Priorytet**: Niski
- **Wygląd interfejsu**:
  ---------------------------------------------------------------------------------------------------
|                                                                                                 |
|  OnVOD   Watchlista   [ Obejrzane ]   Profil   Admin                  Platformy: [N] [HBO] [D+] ... |
|                                                                                                 |
|  [  magnifying_glass  Szukaj filmu... ]   [ ✨ Zasugeruj filmy ]  [田] [≡] [ Data dodania v ] [ Filtry ^ ]   |
|                                                                                                 |
|  ┌─────────────────────────────────────────────────────────────────────────────────────────────┐  |
|  │                                                                                             │  |
|  │   Gatunki                                     [ Zaznacz wszystkie ] [ Odznacz wszystkie ]   │  |
|  │   ---------------------------------------------------------------------------------------   │  |
|  │   [x] Akcja     [ ] Dramat    [x] Komedia    [ ] Romans     [ ] Thriller   [ ] Sci-Fi        │  |
|  │   [ ] Horror    [x] Kryminał  [ ] Animacja   [ ] Fantasy    [ ] Familijny  [ ] Przygodowy    │  |
|  │                                                                                             │  |
|  │   Lata produkcji                                                                            │  |
|  │   ---------------------------------------------------------------------------------------   │  |
|  │   od: 1920 ‹———————•—————————————————————————————————•———————› 2025                       │  |
|  │                                                                                             │  |
|  │   Twórcy                                                                                    │  |
|  │   ---------------------------------------------------------------------------------------   │  |
|  │   Reżyser:  [ Wpisz nazwisko...                                                    ]        │  |
|  │   Aktor:    [ Wpisz nazwisko...                                                    ]        │  |
|  │                                                                                             │  |
|  │   Status                                                                                    │  |
|  │   ---------------------------------------------------------------------------------------   │  |
|  │   Pokaż obejrzane                                                         (•)-----          │  |
|  │   Pokaż na watchlist                                                      ( )-----          │  |
|  │                                                                                             │  |
|  │                                                                 [ Zastosuj filtry ] [ Wyczyść ] │  |
|  └─────────────────────────────────────────────────────────────────────────────────────────────┘  |
|                                                                                                 |
|  [ Plakat filmu 1 ]  [ Plakat filmu 2 ]  [ Plakat filmu 3 ]  [ Plakat filmu 4 ] [ Plakat filmu 5 ]  |
|                                                                                                 |
---------------------------------------------------------------------------------------------------
