### **Plan Implementacji: Filtrowanie po Gatunkach i Statusie**

### **Cel: Implementacja uproszczonego filtrowania**

Głównym celem jest wprowadzenie nowej funkcjonalności filtrowania na stronie `OnVOD`, a następnie zastąpienie przycisku "Ukryj niedostępne" na stronach `Watchlist` i `Watched` nowym przyciskiem "Filtry". W wersji uproszczonej panel filtrów będzie zawierał:
1.  **Filtrowanie po gatunkach**: Możliwość wyboru wielu gatunków filmowych.
2.  **Filtrowanie po statusie**: Przełączniki do ukrywania/pokazywania filmów w zależności od statusu (obejrzane, watchlist, nieprzypisane, dostępne).

---

### **Plan Implementacji - Backend (API)**

Zmiany w API są konieczne, aby frontend mógł pobierać przefiltrowane dane.

#### **Krok 1: Centralizacja listy gatunków w dedykowanej tabeli**

Aby zapewnić wydajność i spójność danych, tworzymy pojedyncze źródło prawdy dla gatunków filmowych.

1.  **Nowa tabela w bazie danych**: Wprowadzamy nową tabelę `Genre`.
    ```sql
    CREATE TABLE genre (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL
    );
    ```
2.  **Mechanizm aktualizacji**: Tworzymy management command w Django (np. `populate_genres`) na podstawie skryptu `check_genres.py`. Będzie on synchronizował gatunki z tabeli `movie` do tabeli `genre`.
3.  **Nowy Endpoint**: `GET /api/movies/genres/`
    *   **Cel**: Dostarczenie unikalnej, posortowanej alfabetycznie listy wszystkich gatunków z nowej tabeli `genre`.
    *   **Metoda**: `GET`
    *   **Autoryzacja**: Niewymagana.
    *   **Struktura Odpowiedzi**:
        ```json
        [
            { "name": "Action" },
            { "name": "Adventure" },
            { "name": "Animation" },
            { "name": "Comedy" },
            { "name": "Crime" }
        ]
        ```

#### **Krok 2: Rozszerzenie istniejących endpointów o nowe filtry**

1.  **Modyfikacja `GET /api/on-vod-movies/`**
    *   **Nowe Parametry (Query Params)**:
        *   `genres` (string, opcjonalny): Rozdzielona przecinkami lista nazw gatunków (np. `?genres=Action,Drama`). Zwraca filmy, które mają **co najmniej jeden** z podanych gatunków.
        *   `exclude_watched` (boolean, opcjonalny): Jeśli `true`, wyklucza filmy obejrzane.
        *   `exclude_watchlisted` (boolean, opcjonalny): Jeśli `true`, wyklucza filmy na watchliście.
        *   `exclude_unassigned` (boolean, opcjonalny): Jeśli `true`, wyklucza filmy, które nie są ani na watchliście, ani w obejrzanych (pokazuje tylko te z interakcją).
    *   **Logika**: Jeśli parametr `genres` jest pusty lub nieobecny, filtr gatunków nie jest stosowany.

2.  **Modyfikacja `GET /api/user-movies/`**
    *   **Nowe Parametry (Query Params)**:
        *   `genres` (string, opcjonalny): Działający analogicznie jak w `/api/on-vod-movies/`.

---

### **Plan Implementacji - Frontend (UI/UX)**

#### **Krok 1: Zarządzanie stanem filtrów (Zustand)**

*   **Implementacja**:
    *   Utworzenie nowego store'a Zustand (`src/stores/filtersStore.ts`).
    *   Store będzie przechowywał: `genres: string[]`, `selectedGenres: Set<string>`, `showWatched: boolean`, `showOnWatchlist: boolean`, `showUnassigned: boolean` (dla OnVOD), `showOnlyAvailable: boolean` (dla Watchlist/Watched) oraz odpowiednie akcje.

#### **Krok 2: Stworzenie komponentu panelu filtrów (`FiltersPanel`)**

*   **Lokalizacja**: `src/components/library/FiltersPanel.tsx`
*   **Struktura**:
    *   Komponent będzie przyjmował `pageType` (`onvod` | `watchlist` | `watched`).
    *   **Sekcja "Gatunki"**:
        *   Pobierze listę gatunków z `/api/movies/genres/`.
        *   Wyświetli checkboxy w siatce.
        *   Przyciski "Zaznacz wszystkie" / "Odznacz wszystkie".
    *   **Sekcja "Status"** (zależna od `pageType`):
        *   Dla `onvod`:
            *   Przełącznik "Pokaż obejrzane".
            *   Przełącznik "Pokaż na watchlist".
            *   Przełącznik "Pokaż pozostałe" (nieprzypisane).
        *   Dla `watchlist` i `watched`:
            *   Przełącznik "Pokaż tylko dostępne".
    *   **Przyciski akcji**: Tylko "Wyczyść" (stan jest aplikowany natychmiastowo).

#### **Krok 3: Integracja nowego panelu z istniejącymi widokami**

1.  **Modyfikacja `MediaToolbar` i stron**:
    *   Na stronach `OnVOD`, `Watchlist` i `Watched` zastąpiono stary przycisk "Ukryj niedostępne" nowym przyciskiem **"Filtry"**.
    *   Kliknięcie przełącza widoczność `FiltersPanel.tsx`.
    *   Usunięto dedykowane paski filtrów (`FiltersBar`, `WatchedFiltersBar`), przenosząc logikę "Ukryj niedostępne" do głównego panelu filtrów.

#### **Krok 4: Aktualizacja logiki pobierania danych (TanStack Query)**

*   Hooki `useOnVODMoviesQuery` i `useListUserMovies` subskrybują `filtersStore`.
*   `queryKey` jest dynamicznie budowany na podstawie stanu filtrów.
*   Parametr `genres` jest wysyłany do API tylko wtedy, gdy `selectedGenres` nie jest pusty.

---

### **Krok 5: Status Implementacji (Wykonane)**

✅ **Backend**:
*   Dodano parametr `exclude_unassigned` do serializera i widoku `OnVODMoviesView`.
*   Zaktualizowano logikę serwisu `user_movies_service` o obsługę wszystkich flag wykluczających (w tym poprawki błędów dla `exclude_watchlisted` i `exclude_watched`).
*   Zaimplementowano indeksowanie gatunków w bazie danych.
*   Wprowadzono drugorzędne sortowanie po `id` dla deterministycznej kolejności wyników.

✅ **Frontend**:
*   Stworzono `filtersStore` z obsługą wszystkich typów filtrów.
*   Zaimplementowano `FiltersPanel` z sekcjami gatunków i statusów (dynamicznie renderowanymi w zależności od strony).
*   Zintegrowano panel na stronach `OnVODPage`, `WatchlistPage`, `WatchedPage`.
*   Usunięto przycisk "Zastosuj filtry" na rzecz natychmiastowego odświeżania (UX).
*   Zastąpiono przycisk "Ukryj niedostępne" na belkach narzędziowych przełącznikiem wewnątrz panelu filtrów.
*   Zaktualizowano hooki React Query (`useOnVODMoviesQuery`) oraz selektory (`useWatchlistSelectors`, `useWatchedSelectors`) do obsługi nowych filtrów.
*   Dodano liczniki wyświetlanych filmów ("Wyświetlane: X/Y") na stronach Watchlist i Watched.
*   Usunięto limit wyświetlanych gatunków na kartach filmów (teraz pokazują się wszystkie, z tooltipem dla pełnej listy).

### **Krok 6: Na koniec**

1.  **`README.md`**:
    *   Dodać informację o nowej tabeli `genre`.
    *   Wspomnieć o konieczności uruchamiania management command `populate_genres` po każdej 
    aktualizacji bazy filmów.
    *   Dodać notatkę o planowanej w przyszłości pełnej integracji i automatyzacji tego 
    procesu.
2.  **`.ai/db-plan.md`**:
    *   Dodać specyfikację nowej tabeli `genre`.
3.  **`.ai/api-plan.md`**:
    *   Dodać dokumentację nowego endpointu `GET /api/movies/genres/`.
    *   Uzupełnić dokumentację endpointów `GET /api/on-vod-movies/` i `GET /api/user-movies/` 
    o nowe parametry filtrowania (`genres`, `exclude_watched`, `exclude_watchlisted`).
4.  **`.ai/ui-plan.md`**:
    *   Opisać nowy komponent `FiltersPanel`.
    *   Opisać zmiany w `MediaToolbar` i zachowanie nowego przycisku "Filtry".
    *   Opisać działanie nowego store'a Zustand `filtersStore`.
