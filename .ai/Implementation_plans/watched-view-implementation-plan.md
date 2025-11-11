# Plan implementacji widoku „Obejrzane”

## 1. Przegląd
Widok „Obejrzane” służy do przeglądania historii filmów oznaczonych jako obejrzane oraz do szybkiego przywracania pozycji z powrotem na watchlistę. Użytkownik widzi te same dane filmu co w watchliście (plakat, tytuł, rok, gatunki, ocena IMDb, dostępność VOD na własnych platformach), dodatkowo z datą obejrzenia. Domyślne sortowanie: po dacie obejrzenia malejąco (najnowsze pierwsze). Widok oferuje dwa tryby prezentacji: kafelkowy (grid) i listowy (table/rows).

## 2. Routing widoku
- Ścieżka: `/app/watched`
- Dostęp: wymagana autentykacja JWT; w razie 401 → przekierowanie do logowania
- Nawigacja: zakładka „Obejrzane” w głównej nawigacji obok „Watchlista”

## 3. Struktura komponentów
```
<WatchedPage>
  <WatchedToolbar>
    <ViewModeToggle />
    <SortSelect />
  </WatchedToolbar>
  <WatchedContent>
    ├─ if (isEmpty) <WatchedEmptyState />
    └─ else if (viewMode==='grid') <WatchedGrid>
         └─ [...UserMovieCard]
       else <WatchedList>
         └─ [...UserMovieRow]
  </WatchedContent>
</WatchedPage>
```
Komponenty współdzielone/analogiczne do widoku watchlisty powinny zachować spójny interfejs (jeśli istnieją, wykorzystać je ponownie).

## 4. Szczegóły komponentów
### WatchedPage
- Opis: Strona-kontener. Łączy pobieranie danych, stan trybu widoku, sortowania i renderuje toolbar oraz treść.
- Główne elementy: wrapper strony, hooki do danych i stanu, sekcja treści.
- Obsługiwane interakcje: inicjalne pobranie listy `status=watched`; zmiana sortowania/trybu; akcja przywrócenia (mutacja i odświeżenie listy/toast).
- Walidacja: brak wejściowych formularzy; walidacja parametrów zapytań po stronie klienta (np. dozwolone wartości sortowania).
- Typy: `UserMovieDto`, `WatchedMovieItemVM`, `WatchedViewMode`, `WatchedSortKey`.
- Propsy: brak (komponent routowany).

### WatchedToolbar
- Opis: Pasek narzędzi nad listą: przełącznik widoku i select sortowania.
- Główne elementy: `<ViewModeToggle />`, `<SortSelect />`.
- Interakcje: zmiana trybu (`grid`/`list`), zmiana sortowania (domyślnie „Data obejrzenia (najnowsze)”).
- Walidacja: dopuszczalne wartości sortowania (mapa enum → label → backend/klient).
- Typy: `WatchedViewMode`, `WatchedSortKey`.
- Propsy:
  - `viewMode: WatchedViewMode`
  - `onViewModeChange: (mode: WatchedViewMode) => void`
  - `sortKey: WatchedSortKey`
  - `onSortKeyChange: (key: WatchedSortKey) => void`

### ViewModeToggle
- Opis: Przycisk/ikony do przełączania `grid`/`list`, zgodny z tym z watchlisty.
- Główne elementy: dwa przyciski typu toggle, ikony grid/list (lucide-react).
- Interakcje: klik/keyboard; focus ring dla a11y.
- Walidacja: brak.
- Typy: `WatchedViewMode`.
- Propsy: `value`, `onChange`.

### SortSelect
- Opis: Select ze sposobem sortowania.
- Główne elementy: `<select>` lub komponent z shadcn/ui.
- Interakcje: wybór pozycji; aktualizacja stanu sortowania.
- Walidacja: dopuszczalne opcje.
- Typy: `WatchedSortKey`.
- Propsy: `value`, `onChange`, `options` (z mapowaniem na backend/klient).

### WatchedContent
- Opis: Warunkowy kontener; pokazuje `EmptyState` lub listę w wybranym trybie.
- Główne elementy: conditional rendering.
- Interakcje: brak.
- Walidacja: brak.
- Propsy: `items: WatchedMovieItemVM[]`, `viewMode`, `onRestore`.

### WatchedGrid
- Opis: Grid kart filmów.
- Główne elementy: responsywny CSS grid; karta per film.
- Interakcje: klik w „Przywróć do watchlisty”.
- Walidacja: brak.
- Typy: `WatchedMovieItemVM`.
- Propsy: `items`, `onRestore: (id: number) => void`.

### WatchedList
- Opis: Widok listowy (wiersze) z podstawowymi danymi.
- Główne elementy: `<table>` lub semantyczne `<ul>/<li>` z kolumnami tytuł/rok/ocena/dostępność/data/akcja.
- Interakcje: przycisk „Przywróć”.
- Walidacja: brak.
- Typy: `WatchedMovieItemVM`.
- Propsy: `items`, `onRestore`.

### UserMovieCard
- Opis: Karta filmu z plakatem, tytułem, rokiem, oceną, gatunkami, ikonami platform, datą obejrzenia i akcją przywrócenia.
- Główne elementy: obraz (poster lub placeholder), metadane, badge dostępności (kolorowe/wyłączone), przycisk „Przywróć”.
- Interakcje: klik przycisku; tooltip na ikonach platform; klawiatura (Enter/Space).
- Walidacja: fallback na placeholder, gdy brak plakatu.
- Typy: `WatchedMovieItemVM`.
- Propsy: `item`, `onRestore`.

### UserMovieRow
- Opis: Kompaktowy wiersz z tymi samymi informacjami co karta, ale w układzie poziomym.
- Główne elementy: miniatura plakatu, pola tekstowe, ikony platform, data obejrzenia, przycisk „Przywróć”.
- Interakcje: klik przycisku; fokusa11y.
- Walidacja: jak wyżej.
- Typy: `WatchedMovieItemVM`.
- Propsy: `item`, `onRestore`.

### RestoreButton
- Opis: Przyciski akcji „Przywróć do watchlisty” z obsługą stanu ładowania i disabled.
- Główne elementy: `<button>` z ikoną „undo”/„rotate-ccw”.
- Interakcje: click, klawiatura.
- Walidacja: zablokowany podczas trwania mutacji.
- Typy: brak dodatkowych.
- Propsy: `onClick`, `loading: boolean`, `ariaLabel?: string`.

### WatchedEmptyState
- Opis: Pusty stan dla braku danych.
- Główne elementy: ilustracja/ikona, nagłówek, opis, link/przycisk do watchlisty.
- Teksty: 
  - Tytuł: „Nie oznaczyłeś jeszcze żadnych filmów jako obejrzane”
  - Opis: „Filmy oznaczone jako obejrzane pojawią się tutaj”
  - Link: „Przejdź do watchlisty” → `/app/watchlist`
- Interakcje: klik linku.
- Walidacja: brak.
- Typy: brak.
- Propsy: opcjonalnie `onGoToWatchlist`.

## 5. Typy
Wykorzystujemy istniejące typy z `src/types/api.types.ts` i definiujemy lekkie modele widoku.

- DTO z API:
  - `UserMovieDto` — element listy; zawiera `id`, `watchlisted_at`, `watched_at`, `movie` (tconst, primary_title, start_year, genres, avg_rating, poster_path), `availability: MovieAvailabilityDto[]`.
  - `MovieAvailabilityDto` — `{ platform_id, platform_name, is_available }`.
  - `UpdateUserMovieCommand` — `{ action: 'mark_as_watched' | 'restore_to_watchlist' }`.

- Nowe typy (ViewModel):
```ts
export type WatchedViewMode = 'grid' | 'list';

export type WatchedSortKey =
  | 'watched_at_desc'      // domyślnie, sortowanie po stronie klienta
  | 'rating_desc';         // sortowanie po stronie backendu (-tconst__avg_rating)

export type WatchedMovieItemVM = {
  id: number;
  tconst: string;
  title: string;
  year: number | null;
  genres: string[] | null;
  avgRating: string | null;
  posterPath: string | null;
  watchedAt: string;            // oryginalny ISO string z API
  watchedAtLabel: string;       // sformatowana data do UI
  availability: MovieAvailabilityDto[];
  isAvailableOnAnyPlatform: boolean; // wyliczane z availability
};
```
Uwagi:
- Backend nie oferuje `ordering=-watched_at`. Domyślne sortowanie po dacie obejrzenia realizujemy na kliencie (stabilne sortowanie malejące po `watchedAt`).
- Dla sortowania „Ocena IMDb (najwyższe)” wykorzystujemy backend `ordering=-tconst__avg_rating`.

## 6. Zarządzanie stanem
- Globalny stan danych: TanStack Query.
  - Klucze: `['user-movies', { status: 'watched', ordering?, is_available? }]`.
  - CacheTime/GC: domyślne; `staleTime` można ustawić na 60s.
- Lokalny stan UI:
  - `viewMode: WatchedViewMode` — init z `localStorage` lub query param (np. `?view=list`), fallback: `'grid'`.
  - `sortKey: WatchedSortKey` — init `'watched_at_desc'`.
  - `pendingRestoreIds: Set<number>` — do blokowania przycisków podczas mutacji.
- Custom hooki:
  - `useUserMoviesWatched(sortKey)`
    - Wywołuje GET `/api/user-movies/?status=watched`.
    - Jeśli `sortKey==='rating_desc'`, dołącza `ordering=-tconst__avg_rating` i nie sortuje lokalnie.
    - W pozostałych przypadkach sortuje lokalnie wg `watchedAt` malejąco.
    - Mapuje `UserMovieDto` → `WatchedMovieItemVM` (w tym `watchedAtLabel`, `isAvailableOnAnyPlatform`).
  - `useRestoreToWatchlist()`
    - Mutacja PATCH `/api/user-movies/:id` z body `{ action: 'restore_to_watchlist' }`.
    - On success: `invalidateQueries(['user-movies', {status:'watched'}])` oraz opcjonalnie `invalidateQueries(['user-movies', {status:'watchlist'}])`.
    - Wyświetla toast sukcesu/błędu.

## 7. Integracja API
- Lista obejrzanych:
  - `GET /api/user-movies/?status=watched[&ordering=-tconst__avg_rating]`
  - Auth: wymagany JWT (axios instance z interceptorami refresh-token, jeśli dostępne).
  - Response: `UserMovieDto[]`.
- Przywracanie do watchlisty:
  - `PATCH /api/user-movies/:id`
  - Body: `{ "action": "restore_to_watchlist" }` (typ `UpdateUserMovieCommand`).
  - Success: 200 z zaktualizowanym `user-movie`; po stronie UI usuwamy element z listy watched (invalidate) i pokazujemy toast.
- Uwagi dot. sortowania:
  - Backend wspiera `ordering` tylko w wartościach `-watchlisted_at` i `-tconst__avg_rating`. Dla „Obejrzane” domyślne sortowanie po `watched_at` realizujemy na kliencie.

## 8. Interakcje użytkownika
- Zmiana trybu widoku (kafelkowy/listowy): przełącznik; stan zapamiętywany w `localStorage` lub URL param.
- Zmiana sortowania: select; dla „Data obejrzenia (najnowsze)” – sort lokalny; dla „Ocena IMDb (najwyższe)” – param `ordering=-tconst__avg_rating`.
- Klik „Przywróć do watchlisty”: wysyła mutację, przycisk w stanie `loading`, po sukcesie element znika z listy, toast: „Film został przywrócony do watchlisty”.
- A11y: pełna obsługa klawiatury (Tab/Shift+Tab, Enter/Space na przyciskach), focus management po mutacji (np. przenieść fokus na kolejny element), etykiety aria.

## 9. Warunki i walidacja
- Walidacja wejściowych parametrów UI:
  - `sortKey` ∈ {`watched_at_desc`, `rating_desc`}.
  - `viewMode` ∈ {`grid`, `list`}.
- Walidacja danych z API:
  - `watched_at` powinno istnieć dla statusu `watched`; jeśli brak, traktować jako `''` i umieszczać na końcu sortu.
  - `movie.poster_path` może być `null` → placeholder.
  - `availability` może być puste → grafika szara „Niedostępne na Twoich platformach”.
- Warunki wynikające z API:
  - 401 Unauthorized → przekierowanie do logowania.
  - 400 Bad Request (np. zły `ordering`) → fallback do domyślnych ustawień sortu i komunikat błędu „Przywrócono domyślne sortowanie”.

## 10. Obsługa błędów
- GET fail (network/5xx):
  - Pokaż `ErrorState` inline: „Nie udało się załadować listy obejrzanych. Spróbuj ponownie.” + przycisk „Odśwież”.
- PATCH fail:
  - Zgaś loading; pokaż toast błędu: „Nie udało się przywrócić filmu. Spróbuj ponownie.”
- Brak danych (200 + `[]`):
  - Pokaż `WatchedEmptyState` (spec zgodnie z US-026).
- Braki plakatów TMDB: placeholder (zgodnie z PRD RF-011/US-038/039 – graceful degradation).

## 11. Kroki implementacji
1. Routing
   - Dodaj trasę `'/app/watched'` w routerze; zabezpiecz dostęp (guard dla JWT).
   - Dodaj link do nawigacji głównej „Obejrzane”.
2. Typy i warstwa danych
   - Zdefiniuj typy `WatchedViewMode`, `WatchedSortKey`, `WatchedMovieItemVM` w `src/types`.
   - Utwórz klienta: `getUserMovies({ status: 'watched', ordering? })` oraz `restoreUserMovie(id)` w `src/lib/api` (Axios).
3. Hooki
   - `useUserMoviesWatched(sortKey)` z TanStack Query: pobieranie, mapowanie do VM i sort lokalny po `watchedAt` gdy trzeba.
   - `useRestoreToWatchlist()` mutacja PATCH z invalidacją cache watched (+ opcjonalnie watchlist).
4. UI: toolbar
   - `WatchedToolbar` z `ViewModeToggle` i `SortSelect` (opcje: „Data obejrzenia (najnowsze)”, „Ocena IMDb (najwyższe)”).
   - Persistencja `viewMode` i `sortKey` (localStorage/URL param).
5. UI: listy
   - `WatchedGrid` i `UserMovieCard` (poster, tytuł, rok, gatunki, ocena, dostępność, data, przycisk „Przywróć”).
   - `WatchedList` i `UserMovieRow` (tożsame informacje w układzie wiersza).
   - Przyciski „Przywróć” spięte z mutacją; disabled w trakcie requestu.
6. Empty/Error/Loading
   - `WatchedEmptyState` zgodnie z US-026; link do `/app/watchlist`.
   - Skeletony ładowania dla grid/list.
   - Komponent błędu z retry.
7. A11y i UX
   - Role/aria-labels na przyciskach; focus ring; kolejność Tab.
   - Po przywróceniu przenieś fokus na następny element listy.
   - Toastery sukcesu/błędu (np. shadcn/ui `useToast`).
8. Testy (min.)
   - Testy komponentów: render pustego stanu, render elementu, wywołanie mutacji po kliknięciu „Przywróć”.
   - Testy hooka: sortowanie lokalne po `watchedAt` i z `ordering=-tconst__avg_rating`.
9. Observability
   - (Opcjonalnie) event „restore_from_watched” do prostego loggera analytics (zgodnie z PRD RF-011), jeśli warstwa istnieje.

---

Uwagi implementacyjne (ważne):
- Niespójność API a wymaganie sortowania po dacie obejrzenia: do czasu ewentualnego dodania wsparcia `ordering=-watched_at` w backendzie, stosujemy sortowanie po stronie klienta (stabilne, malejące po `watchedAt`).
- Zachowujemy spójność wizualną i semantyczną z widokiem „Watchlista” (ikonografia platform, placeholdery, komponenty wspólne gdy to możliwe).
