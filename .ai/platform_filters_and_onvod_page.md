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

### 3.1. Krok 1: Globalny Stan Filtrów (Zustand)

-   **Cel**: Stworzenie centralnego miejsca do zarządzania stanem filtrów platform.
-   **Implementacja**:
    -   Utworzenie nowego store'a Zustand (`platformFilterStore.ts`).
    -   Store będzie przechowywał:
        -   `platforms: Platform[]`: Lista wszystkich platform (pobrana z `usePlatformsQuery`).
        -   `selectedPlatformIds: Set<number>`: Zbiór ID aktualnie aktywnych platform.
        -   `actions`:
            -   `togglePlatform(platformId: number)`: Przełącza stan wybranej platformy.
            -   `selectAll()`: Zaznacza wszystkie platformy.
            -   `deselectAll()`: Odznacza wszystkie platformy.
            -   `initialize(platformIds: number[])`: Inicjalizuje store wszystkimi dostępnymi platformami jako domyślnie zaznaczonymi.

### 3.2. Krok 2: Nowy Komponent `PlatformFiltersToolbar`

-   **Cel**: Stworzenie reużywalnego paska narzędzi z filtrami.
-   **Lokalizacja**: `src/components/layout/PlatformFiltersToolbar.tsx`
-   **Struktura**:
    -   Komponent będzie pobierał stan i akcje z store'a Zustand.
    -   **Po lewej**: Grupa przełączników (`Toggle`) z ikonami platform. Stan każdej ikony (aktywna/nieaktywna) będzie odzwierciedlał stan w store. Kliknięcie będzie wywoływać akcję `togglePlatform`.
    -   **Po prawej**:
        1.  Przycisk "Ukryj niedostępne" (przeniesiony z `FiltersBar`/`WatchedFiltersBar`). Będzie on teraz działał jako filtr globalny, prawdopodobnie zarządzany również przez ten sam store.
        2.  Przycisk "Pokaż wszystkie" / "Ukryj wszystkie". Jego funkcja będzie zależeć od aktualnego stanu:
            -   Jeśli wszystkie platformy są zaznaczone, tekst zmieni się na "Ukryj wszystkie", a kliknięcie wywoła `deselectAll`.
            -   W przeciwnym wypadku, tekst to "Pokaż wszystkie", a kliknięcie wywoła `selectAll`.

### 3.3. Krok 3: Modyfikacja Głównego Layoutu (`MediaLibraryLayout`)

-   **Cel**: Integracja nowych elementów nawigacyjnych i paska filtrów.
-   **Zmiany w `MediaLibraryLayout.tsx` lub w komponencie nadrzędnym (`AppShell`):**
    1.  **Nawigacja (`tabs`)**: Dodanie nowego, pierwszego linku "onVOD", który będzie prowadził do `/app/onvod` i stanie się domyślnym widokiem.
    2.  **Nowy Slot na Pasek Filtrów**: Dodanie nowego, stałego miejsca w layoucie (np. nad `toolbar`), gdzie będzie renderowany `PlatformFiltersToolbar`. Zapewni to jego widoczność we wszystkich podstronach biblioteki.

### 3.4. Krok 4: Nowa Strona `OnVODPage`

-   **Cel**: Stworzenie nowej strony `/app/onvod`.
-   **Routing**: Dodanie nowej ścieżki w `App.tsx` lub w pliku z routingiem.
-   **Komponent (`OnVODPage.tsx`)**:
    -   Będzie używał hooka `useInfiniteQuery` z TanStack Query do pobierania danych z nowego endpointu `/api/on-vod-movies/`.
    -   Hook będzie subskrybował zmiany w `platformFilterStore` i przekazywał `selectedPlatformIds` jako parametr do zapytania API. Zapewni to automatyczne odświeżanie danych po zmianie filtrów.
    -   Do renderowania listy filmów zostaną wykorzystane istniejące, sprawdzone komponenty `UserMovieCard` i/lub `UserMovieRow`, co zapewni spójność wizualną.
    -   Implementacja "infinite scroll" do ładowania kolejnych stron wyników.

### 3.5. Krok 5: Adaptacja Istniejących Stron (`WatchlistPage`, `WatchedPage`)

-   **Cel**: Zintegrowanie istniejących widoków z nowym, globalnym systemem filtrów.
-   **Zmiany w `WatchlistPage.tsx` i `WatchedPage.tsx`**:
    1.  **Usunięcie starych filtrów**: Logika i przycisk "Ukryj niedostępne" zostaną usunięte z komponentów `FiltersBar` i `WatchedFiltersBar`. Te komponenty mogą zostać całkowicie usunięte lub zrefaktoryzowane, jeśli zawierają inną logikę (np. sortowanie), która ma pozostać.
    2.  **Integracja z globalnym stanem**: Hooki `useQuery`/`useInfiniteQuery` w tych stronach zostaną zmodyfikowane tak, aby pobierały `selectedPlatformIds` ze store'a Zustand i przekazywały je jako parametr `platform_ids` do endpointu `/api/user-movies/`.
    3.  **Aktualizacja UI**: Upewnienie się, że po usunięciu starych filtrów layout wygląda poprawnie, a nowy, globalny pasek jest poprawnie wyświetlany.
