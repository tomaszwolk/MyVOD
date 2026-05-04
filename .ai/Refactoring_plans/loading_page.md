# Podsumowanie optymalizacji ładowania strony

Poniższy dokument podsumowuje zmiany wprowadzone w celu rozwiązania problemu powolnego ładowania strony z listą filmów, a także zawiera listę sugestii dalszych optymalizacji, które nie zostały zaimplementowane.

## Wprowadzone zmiany

Głównym celem było wyeliminowanie ładowania wszystkich filmów z listy użytkownika przy pierwszym wejściu na stronę. Udało się to osiągnąć poprzez kompleksowe zmiany w backendzie i frontendzie.

### 1. Backend: Wprowadzenie paginacji
- **Problem**: Endpoint `/api/user-movies/` zwracał wszystkie filmy naraz, co powodowało ogromne obciążenie przy dużych listach.
- **Rozwiązanie**:
    - Włączono paginację (`PageNumberPagination`) w `user_movies/views.py` dla `UserMovieViewSet`. Domyślny rozmiar strony ustawiono na 20.
    - Naprawiono wynikające z tego błędy `400 Bad Request` i `500 Internal Server Error`, czyniąc parametr `status` opcjonalnym i bezpiecznie go obsługując.

### 2. Frontend: Implementacja "Infinite Scroll"
- **Problem**: Strony `WatchlistPage` i `WatchedPage` pobierały i próbowały renderować całą listę filmów jednocześnie.
- **Rozwiązanie**:
    - Zastąpiono hook `useQuery` hookiem `useInfiniteQuery` w `hooks/useListUserMovies.ts` do obsługi "nieskończonej" listy.
    - W komponentach `WatchlistContent.tsx` i `WatchedContent.tsx` zaimplementowano mechanizm, który automatycznie doładowuje kolejną "stronę" filmów, gdy użytkownik przewinie listę do końca (przy użyciu `react-intersection-observer`).

### 3. Frontend: Refaktoryzacja pobierania danych
- **Problem**: Zmiana na paginację spowodowała liczne błędy typów w całej aplikacji, ponieważ wiele komponentów (np. `ProfilePage`, `useOnboardingStatus`) oczekiwało prostej tablicy filmów, a nie paginowanej struktury.
- **Rozwiązanie**:
    - Stworzono dwie nowe funkcje w kliencie API (`lib/api/movies.ts`):
        1.  `fetchUserMoviesSimpleList`: Pobiera tylko pierwszą stronę wyników i zwraca prostą tablicę (dla miejsc, gdzie potrzebna jest tylko próbka danych).
        2.  `fetchAllUserMovies`: Pobiera wszystkie strony z paginowanego endpointu i zwraca jedną, spłaszczoną listę (dla miejsc, które muszą mieć dostęp do pełnego zestawu danych, np. do sprawdzania duplikatów).
    - Stworzono nowy, dedykowany hook `useAllUserMovies.ts` do pobierania pełnej listy.
    - Zaktualizowano wszystkie komponenty, które się zepsuły, aby używały odpowiedniej funkcji/hooka, co przywróciło stabilność i poprawność typów.

### 4. Rozwiązanie błędów wykonania
- **Problem**: Po wprowadzeniu zmian pojawiał się uporczywy błąd `TypeError: Cannot read properties of undefined (reading 'length')`, który zawieszał aplikację, zwłaszcza przy niestabilnym połączeniu z serwerem lub gdy query było wyłączone (`enabled: false`).
- **Przyczyna**: TanStack Query v5 sprawdza `allPages.length` wewnętrznie przed wywołaniem funkcji `getNextPageParam`. Gdy query jest wyłączone lub jeszcze nie wykonało się, `allPages` może być `undefined`, co powoduje błąd podczas próby odczytania właściwości `length`.
- **Rozwiązanie**:
    - **Dodano `initialData`**: Inicjalizacja struktury danych pustą tablicą stron (`{ pages: [], pageParams: [] }`) od początku, aby TanStack Query zawsze miało poprawną strukturę danych do pracy.
    - **Dodano `placeholderData`**: Stała wartość z pustą strukturą, która zapewnia poprawną strukturę danych nawet gdy query jest wyłączone lub podczas przejścia między stanami.
    - **Dodano `select`**: Funkcja transformująca dane, która zawsze zwraca poprawną strukturę danych, nawet gdy dane są `undefined` lub nieprawidłowe. Zapewnia to, że TanStack Query nigdy nie otrzyma `undefined` jako wartości `allPages`.
    - **Dodano `getPreviousPageParam`**: Zgodnie z dokumentacją TanStack Query v5, dodano funkcję zwracającą `undefined` (nie obsługujemy paginacji wstecznej), co zapewnia kompletną konfigurację infinite query.
    - **Ulepszona walidacja w `getNextPageParam`**: Dodano defensywne sprawdzenia na początku funkcji, które zwracają `undefined` gdy `allPages` lub `lastPage` są nieprawidłowe, zapobiegając dalszym błędom.
    - **Opcje refetch**: Ustawiono `refetchOnMount`, `refetchOnWindowFocus` i `refetchOnReconnect` na wartość `enabled`, aby zapobiec próbom wykonania query gdy jest wyłączone.
    - **Bezpieczny dostęp do danych w komponentach**: W `WatchedPage.tsx` i `WatchlistPage.tsx` zmieniono dostęp do danych z `page.results` na `page?.results ?? []`, aby uniknąć błędów gdy strona jest `undefined`.

### 5. Kolejne usprawnienia (listopad 2025)
- **Nowy klient TMDB**: `services/tmdb_client.py` działa teraz na współdzielonej sesji `requests` z retry i cache (TMDB id oraz plakaty), dzięki czemu seryjne wywołania zadań `update_movie_poster` nie blokują ładowania strony.
- **Zastąpienie `react-intersection-observer`**: dodano autorski hook `useInView`, aby infinite scroll był kompatybilny z React 19 i nie wywalał błędów `Cannot read properties of null (reading 'useState')`.
- **Poprawione liczniki**: watchlist/watched pobierają `count` z paginacji backendu i pokazują realny stan „widoczne/łącznie", a nie tylko sumę wczytanych stron.
- **Lepsze stany ładowania**: komponenty rozróżniają pierwszy fetch od dalszych i trzymają skeleton tak długo, jak długo backend faktycznie pracuje nad pierwszą stroną.
- **Naprawa inicjalizacji `useListUserMovies`**: usunięto `initialData: { pages: [], pageParams: [] }` z konfiguracji `useInfiniteQuery`, pozostawiając tylko `placeholderData`. Dzięki temu `isLoading` poprawnie wskazuje stan początkowego ładowania (jest `true` zamiast `false`), co eliminuje problem przejściowego wyświetlania się komunikatu "lista jest pusta" przed załadowaniem filmów.

## Sugestie (niezaimplementowane)

Poniżej znajdują się propozycje dalszych optymalizacji, które pojawiły się w trakcie prac, ale nie zostały wdrożone. Warto je rozważyć w przyszłości.

### 1. Leniwe ładowanie plakatów (Lazy Loading)
- **Sugestia**: Zmodyfikować komponent `TMDBPoster.tsx` tak, aby plakaty filmów były ładowane dopiero wtedy, gdy pojawią się w widocznym obszarze ekranu (viewport).
- **Korzyść**: Znacząco zmniejszyłoby to liczbę początkowych zapytań sieciowych i przyspieszyło renderowanie listy, zwłaszcza na wolniejszych połączeniach.

### 2. Wirtualizacja listy (List Virtualization)
- **Sugestia**: Zamiast renderować wszystkie załadowane elementy listy w drzewie DOM, można użyć biblioteki takiej jak `@tanstack/react-virtual`.
- **Korzyść**: Wirtualizacja renderuje tylko te elementy, które są aktualnie widoczne dla użytkownika. Jest to krok dalej niż "infinite scroll" i zapewnia doskonałą wydajność nawet przy listach zawierających tysiące filmów, ponieważ DOM pozostaje mały i responsywny.

### 3. Zoptymalizowany endpoint dla identyfikatorów filmów
- **Sugestia**: Stworzyć w backendzie nowy, lekki endpoint (np. `/api/user-movies/tconsts/?status=watchlist`), który zwracałby tylko listę identyfikatorów `tconst` z watchlisty lub listy obejrzanych.
- **Korzyść**: Komponenty takie jak `ProfilePage` czy `WatchedPage` często potrzebują listy `tconst` z watchlisty tylko do sprawdzania duplikatów. Obecnie pobierają pełne obiekty wszystkich filmów za pomocą `useAllUserMovies`, co jest nieefektywne. Dedykowany endpoint znacząco zmniejszyłby ilość przesyłanych danych.

## Aktualny status
- Strona `/app/watched` reaguje zgodnie z założeniami (szkielet, poprawne liczniki, doładowywanie kolejnych stron).
- Strona `/app/watchlist` - **NAPRAWIONO** (listopad 2025): usunięto `initialData` z `useListUserMovies`, pozostawiono tylko `placeholderData`. Dzięki temu `isLoading` poprawnie pokazuje stan początkowego ładowania, a szkielet wyświetla się od razu bez przejściowego komunikatu "lista jest pusta".
