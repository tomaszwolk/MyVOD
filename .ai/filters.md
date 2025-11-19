### **Plan Implementacji: Filtrowanie po Gatunkach i Statusie**

### **Cel: Implementacja uproszczonego filtrowania**

Głównym celem jest wprowadzenie nowej funkcjonalności filtrowania na stronie `OnVOD`, a następnie zastąpienie przycisku "Ukryj niedostępne" na stronach `Watchlist` i `Watched` nowym przyciskiem "Filtry". W wersji uproszczonej panel filtrów będzie zawierał:
1.  **Filtrowanie po gatunkach**: Możliwość wyboru wielu gatunków filmowych.
2.  **Filtrowanie po statusie**: Przełączniki do ukrywania/pokazywania filmów, które są już na watchliście lub zostały obejrzane (dotyczy tylko strony `OnVOD`).

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
3.  **Nowy Endpoint**: `GET /api/genres/`
    *   **Cel**: Dostarczenie unikalnej, posortowanej alfabetycznie listy wszystkich gatunków z nowej tabeli `genre`.
    *   **Metoda**: `GET`
    *   **Autoryzacja**: Niewymagana.
    *   **Struktura Odpowiedzi**:
        ```json
        [
            "Action",
            "Adventure",
            "Animation",
            "Comedy",
            "Crime"
        ]
        ```

#### **Krok 2: Rozszerzenie istniejących endpointów o nowe filtry**

1.  **Modyfikacja `GET /api/on-vod-movies/`**
    *   **Nowe Parametry (Query Params)**:
        *   `genres` (string, opcjonalny): Rozdzielona przecinkami lista nazw gatunków (np. `?genres=Action,Drama`). Zwraca filmy, które mają **co najmniej jeden** z podanych gatunków.
        *   `exclude_watched` (boolean, opcjonalny): Jeśli `true`, wyklucza filmy obejrzane.
        *   `exclude_watchlisted` (boolean, opcjonalny): Jeśli `true`, wyklucza filmy na watchliście.
    *   **Logika**: Jeśli parametr `genres` jest pusty lub nieobecny, filtr gatunków nie jest stosowany.

2.  **Modyfikacja `GET /api/user-movies/`**
    *   **Nowe Parametry (Query Params)**:
        *   `genres` (string, opcjonalny): Działający analogicznie jak w `/api/on-vod-movies/`.

---

### **Plan Implementacji - Frontend (UI/UX)**

#### **Krok 1: Zarządzanie stanem filtrów (Zustand)**

*   **Implementacja**:
    *   Utworzenie nowego store'a Zustand (`src/stores/filtersStore.ts`).
    *   Store będzie przechowywał: `genres: string[]`, `selectedGenres: Set<string>`, `showWatched: boolean`, `showOnWatchlist: boolean` oraz odpowiednie akcje.

#### **Krok 2: Stworzenie komponentu panelu filtrów (`FiltersPanel`)**

*   **Lokalizacja**: `src/components/library/FiltersPanel.tsx`
*   **Struktura**:
    *   Komponent będzie przyjmował `pageType` (`onvod` | `watchlist` | `watched`).
    *   **Sekcja "Gatunki"**:
        *   Pobierze listę gatunków z `/api/genres/`.
        *   Wyświetli checkboxy w siatce.
        *   Przyciski "Zaznacz wszystkie" / "Odznacz wszystkie".
    *   **Sekcja "Status"** (widoczna tylko gdy `pageType === 'onvod'`):
        *   Przełącznik "Pokaż obejrzane".
        *   Przełącznik "Pokaż na watchlist".
    *   **Przyciski akcji**: "Zastosuj filtry" i "Wyczyść".

#### **Krok 3: Integracja nowego panelu z istniejącymi widokami**

1.  **Modyfikacja `MediaToolbar`**:
    *   Na stronach `OnVOD`, `Watchlist` i `Watched` zastąpimy stary przycisk nowym **"Filtry"**.
    *   Kliknięcie będzie przełączać widoczność `FiltersPanel.tsx`.
    *   Na stronach `Watchlist` i `Watched`, przycisk **"Ukryj niedostępne"** pozostaje bez zmian w `MediaToolbar` i działa niezależnie od nowego panelu filtrów.

#### **Krok 4: Aktualizacja logiki pobierania danych (TanStack Query)**

*   Hooki `useOnVODMoviesQuery` i `useListUserMovies` będą subskrybować `filtersStore`.
*   `queryKey` będzie dynamicznie budowany na podstawie stanu filtrów.
*   Parametr `genres` będzie wysyłany do API tylko wtedy, gdy `selectedGenres` nie jest pusty. Zapewni to, że odznaczenie wszystkich gatunków jest równoznaczne z brakiem filtrowania.

---

### **Krok 5: Aktualizacja Dokumentacji**

Po zakończeniu implementacji i testów, należy zaktualizować następujące pliki:

1.  **`README.md`**:
    *   Dodać informację o nowej tabeli `genre`.
    *   Wspomnieć o konieczności uruchamiania management command `populate_genres` po każdej aktualizacji bazy filmów.
    *   Dodać notatkę o planowanej w przyszłości pełnej integracji i automatyzacji tego procesu.
2.  **`.ai/db-plan.md`**:
    *   Dodać specyfikację nowej tabeli `genre`.
3.  **`.ai/api-plan.md`**:
    *   Dodać dokumentację nowego endpointu `GET /api/genres/`.
    *   Uzupełnić dokumentację endpointów `GET /api/on-vod-movies/` i `GET /api/user-movies/` o nowe parametry filtrowania (`genres`, `exclude_watched`, `exclude_watchlisted`).
4.  **`.ai/ui-plan.md`**:
    *   Opisać nowy komponent `FiltersPanel`.
    *   Opisać zmiany w `MediaToolbar` i zachowanie nowego przycisku "Filtry".
    *   Opisać działanie nowego store'a Zustand `filtersStore`.
