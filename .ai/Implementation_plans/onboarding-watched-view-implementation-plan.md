# Plan implementacji widoku Onboarding – Krok 3: Oznacz 3 obejrzane

## 1. Przegląd
Widok trzeciego kroku onboardingu, dostępny pod ścieżką `/onboarding/watched`, umożliwia szybkie oznaczenie 0–3 filmów jako obejrzane. Użytkownik wybiera filmy z wyszukiwarki (autocomplete), a aplikacja dodaje je do watchlisty (jeśli potrzeba) i oznacza jako obejrzane w tle. Widok zawsze pozwala pominąć krok lub zakończyć onboarding.

Cele UX i funkcjonalne:
- Brak wymuszeń – można oznaczyć 0–3 tytuły.
- Prosta wyszukiwarka z wynikami (plakat, tytuł, rok, ocena) i akcją „Oznacz obejrzane”.
- Licznik postępu „Oznaczone: X/3”.
- Lista wybranych (oznaczonych) tytułów w bieżącej sesji.
- Przyciski „Zakończ” (zawsze aktywny) i „Skip”.

## 2. Routing widoku
- Ścieżka: `/onboarding/watched`
- Ochrona: wymaga zalogowania (sprawdzenie JWT; w razie braku – przekierowanie do logowania).
- Warunek wyświetlania: jeżeli onboarding został zakończony, przekieruj do strony głównej (np. `/`).
  - Przechowywanie stanu zakończenia: localStorage (`onboardingComplete=true`) lub flaga użytkownika, jeśli backend ją udostępni w przyszłości.

## 3. Struktura komponentów
- OnboardingWatchedPage
  - StepHeader (Krok 3/3, tytuł)
  - WatchedSearchSection
    - WatchedSearchBox (Combobox z debounce)
    - SearchResultsList
      - SearchResultItem
  - SelectedCounter
  - SelectedMoviesList
    - SelectedMovieItem
  - ActionsBar (Skip, Zakończ)

## 4. Szczegóły komponentów
### OnboardingWatchedPage
- Opis: Komponent strony, scala sekcje, trzyma stan wybranych filmów i koordynuje wywołania API przez hook.
- Główne elementy: `StepHeader`, `WatchedSearchSection`, `SelectedCounter`, `SelectedMoviesList`, `ActionsBar`.
- Obsługiwane interakcje: inicjalizacja, nawigacja (Skip/Zakończ), przekazanie handlerów do dzieci.
- Walidacja: ograniczenie do maks. 3 zaznaczeń; brak duplikatów `tconst`.
- Typy: `OnboardingWatchedViewModel`, `OnboardingSelectedItem`.
- Propsy: brak (strona). 

### StepHeader
- Opis: Pasek nagłówka kroku z tytułem „Oznacz 3 filmy które już widziałeś” i widocznością „Krok 3/3”.
- Główne elementy: tytuł, subtelny opis.
- Interakcje: brak.
- Walidacja: brak.
- Typy: brak niestandardowych.
- Propsy: `{ stepIndex: 3, stepCount: 3 }`.

### WatchedSearchSection
- Opis: Sekcja wyszukiwania i wyników.
- Główne elementy: `WatchedSearchBox`, `SearchResultsList`.
- Interakcje: wpisywanie zapytania, wybór elementu z listy, wywołanie handlera `onPick(movie)`.
- Walidacja: ignoruj wejścia < 2 znaki (nie odpalaj zapytań), całkowicie wyłączaj wybór po osiągnięciu 3/3.
- Typy: `MovieSearchResultDto`.
- Propsy: `{ disabled: boolean, onPick: (movie: MovieSearchResultDto) => void }`.

### WatchedSearchBox (Combobox)
- Opis: Pole z autocomplete (debounce 250–300 ms) z wykorzystaniem TanStack Query i publicznego `GET /api/movies?search`.
- Główne elementy: input, dropdown, loader, puste stany.
- Interakcje: onChange (ustawia query), onKeyDown Enter (pick pierwszy wynik), onPick.
- Walidacja: minimalnie 2 znaki; obsługa pustych wyników („Nie znaleziono filmów”).
- Typy: `MovieSearchResultDto`.
- Propsy: `{ value: string, onChange: (v: string) => void, onPick: (movie) => void, disabled?: boolean }`.

### SearchResultsList / SearchResultItem
- Opis: Lista wyników z wizualnym podglądem: plakat (50×75), tytuł, rok, ocena.
- Interakcje: kliknięcie elementu -> `onPick(movie)`.
- Walidacja: zablokuj, jeśli `disabled` lub X/3.
- Typy: `MovieSearchResultDto`.
- Propsy: `{ results: MovieSearchResultDto[], onPick, disabled }`.

### SelectedCounter
- Opis: Licznik „Oznaczone: X/3”.
- Interakcje: brak.
- Walidacja: X ∈ {0,1,2,3}.
- Typy: prymitywy.
- Propsy: `{ count: number, max: number }`.

### SelectedMoviesList / SelectedMovieItem
- Opis: Lista tytułów oznaczonych w tej sesji z opcją cofnięcia (jeśli dozwolone – patrz Obsługa błędów i cofnięcia).
- Główne elementy: kafelek/wiersz z: poster, tytuł, rok, status API (loading/success/error), przycisk „Cofnij”.
- Interakcje: `onUndo(item)` – próba przywrócenia stanu sprzed oznaczenia.
- Walidacja: brak duplikatów; elementy disabled podczas operacji.
- Typy: `OnboardingSelectedItem`.
- Propsy: `{ items: OnboardingSelectedItem[], onUndo: (item) => void }`.

### ActionsBar (Skip, Zakończ)
- Opis: Dolny pasek akcji nawigacyjnych.
- Główne elementy: dwa przyciski – „Skip” (secondary) i „Zakończ” (primary).
- Interakcje: `onSkip()`, `onFinish()` → zapis `onboardingComplete`, nawigacja do `/`.
- Walidacja: brak (obydwa zawsze aktywne).
- Typy: prymitywy.
- Propsy: `{ onSkip: () => void, onFinish: () => void }`.

## 5. Typy
Wykorzystanie istniejących typów (z `src/types/api.types.ts`):
- `MovieSearchResultDto`
- `AddUserMovieCommand`
- `UpdateUserMovieCommand`
- `UserMovieDto`

Nowe typy (ViewModel – plik proponowany: `src/types/view/onboarding-watched.types.ts`):
```ts
export type SelectedSource = 'preexisting_watchlist' | 'preexisting_watched' | 'newly_created';

export type SelectedStatus = 'idle' | 'loading' | 'success' | 'error';

export type OnboardingSelectedItem = {
  tconst: string;
  primary_title: string;
  start_year: number | null;
  poster_path: string | null;
  userMovieId: number | null; // znane po POST/lookup
  source: SelectedSource;
  status: SelectedStatus;
  error?: string;
};

export type OnboardingWatchedViewModel = {
  query: string;
  isSubmitting: boolean; // dla blokady globalnej podczas nawigacji
  selected: OnboardingSelectedItem[]; // max 3
  maxSelected: number; // 3
};
```

## 6. Zarządzanie stanem
- Biblioteka: React + TanStack Query dla I/O.
- Stan lokalny w `OnboardingWatchedPage` lub w dedykowanym hooku `useOnboardingWatchedController()`:
  - `query` (string, kontroluje WatchedSearchBox)
  - `selected: OnboardingSelectedItem[]` (maks. 3, bez duplikatów `tconst`)
  - `isSubmitting` (blokada UI przy kończeniu)
- Hooki:
  - `useDebouncedValue(value, 300)` – debounce do zapytań.
  - `useMoviesSearch(query)` – `GET /api/movies?search`, `enabled: query.length >= 2`.
  - `useAddUserMovie()` – `POST /api/user-movies` (mutation).
  - `usePatchUserMovie()` – `PATCH /api/user-movies/:id` (mutation).
  - `useListUserMovies(status)` – `GET /api/user-movies?status=watchlist|watched` (do rozwiązywania 409/400 przypadków i pozyskania `id`).
- Strategia aktualizacji:
  - Po wyborze wyniku: natychmiast dodaj element do `selected` ze statusem `loading` i uruchom łańcuch operacji:
    1) Spróbuj `POST /api/user-movies` (jeśli 201 → `id`; jeśli 409 → lookup `GET /api/user-movies?status=watchlist` i znajdź `id` po `tconst`).
    2) `PATCH /api/user-movies/:id` z `{ action: 'mark_as_watched' }`.
    3) Po sukcesie ustaw `status: success`, `source` zgodnie z przypadkiem; przy błędach ustaw `status: error` i `error`.
  - Limituj do 3: jeżeli `selected.length === 3`, zablokuj wybór.

## 7. Integracja API
- Wyszukiwanie: `GET /api/movies?search={query}` → `MovieSearchResultDto[]` (publiczny, bez JWT).
- Dodanie do watchlisty: `POST /api/user-movies/` (JWT)
  - Body: `{ tconst: string }` (`AddUserMovieCommand`).
  - 201 → `UserMovieDto` (z `id`).
  - 409 → film już na watchliście – wykonaj `GET /api/user-movies?status=watchlist`, znajdź po `movie.tconst`, weź `id`.
- Oznaczenie jako obejrzany: `PATCH /api/user-movies/:id`
  - Body: `{ action: 'mark_as_watched' }` (`UpdateUserMovieCommand`).
  - 200 → `UserMovieDto` (z `watched_at != null`).
  - 400 → m.in. „Movie is already marked as watched” → potraktuj jako sukces i rozwiąż `id` z `GET /api/user-movies?status=watched`.
- Cofnięcie (opcjonalne, jeśli udostępniamy przycisk „Cofnij”):
  - Jeżeli element `source === 'newly_created'` i cofamy natychmiast: `DELETE /api/user-movies/:id` (204) – usuwa z watchlisty (soft delete), efektywnie „odwraca” nową pozycję.
  - W przeciwnym wypadku: `PATCH /api/user-movies/:id` `{ action: 'restore_to_watchlist' }`.

Uwagi implementacyjne:
- Autoryzacja: wszystkie `/api/user-movies/*` wymagają JWT (401 → przekieruj do logowania).
- Brak paginacji (MVP) – proste odpytywanie do lookupów.

## 8. Interakcje użytkownika
- Wpisywanie zapytania → dropdown z wynikami (max 10 po stronie backendu, jeśli ograniczone; w UI pokazujemy do 10).
- Kliknięcie wyniku → dodanie tymczasowego elementu do Selected (loading) → łańcuch `POST` (lub lookup) → `PATCH` → sukces i aktualizacja stanu.
- Limit 3 → po osiągnięciu `X === 3` pole i wyniki są disabled; komunikat tooltip „Osiągnięto limit 3 filmów”.
- Przycisk „Cofnij” (jeśli dostępny) → próba przywrócenia poprzedniego stanu (Delete/Restore) → sukces: usuń z Selected; błąd: komunikat.
- „Skip” → oznacz onboarding jako zakończony lokalnie i przejdź do `/`.
- „Zakończ” → to samo co „Skip”; jeśli jakieś operacje w toku, możesz ostrzec lub zablokować (`isSubmitting`).

## 9. Warunki i walidacja
- Min. długość zapytania: 2 znaki (w przeciwnym razie nie uruchamiaj `GET /api/movies`).
- Limit wybranych: `selected.length <= 3` – blokuj możliwość wyboru po osiągnięciu limitu.
- Duplikaty: nie dodawaj pozycji z tym samym `tconst` do `selected`.
- Uprawnienia/API:
  - 401 dla `/api/user-movies/*` → przekierowanie do logowania + zachowanie zamiaru (opcjonalnie).
  - Obsłuż 409 (już na watchliście) i 400 (już obejrzany) zgodnie z sekcją Integracja API.

## 10. Obsługa błędów
- Sieć/API: toast „Nie udało się oznaczyć filmu. Spróbuj ponownie.”, ustaw `status: error` na pozycji; zapewnij akcję „Ponów”.
- `POST /api/user-movies` 409 → fallback przez lookup watchlisty.
- `PATCH mark_as_watched` 400 „already watched” → potraktuj jako sukces; uzupełnij `id` lookupiem watched.
- Brak dopasowania w lookupach (skrajny przypadek) → pokaż błąd i usuń element z Selected.
- 401 → przekieruj do logowania (zachowaj `location.state.from` na powrót).
- TMDB poster brak → pokaż placeholder (zgodnie z PRD – graceful degradation, brak błędu UX).

## 11. Kroki implementacji
1) Routing i ochrona trasy
- Dodaj trasę `/onboarding/watched` w React Router.
- Wymuś autoryzację i przekierowanie do logowania przy 401.
- Dodaj guard: jeśli `onboardingComplete`, przekieruj na `/`.

2) Typy i kontrakty
- Utwórz `src/types/view/onboarding-watched.types.ts` z typami ViewModel.
- Zweryfikuj importy istniejących DTO (`api.types.ts`).

3) Klient API i zapytania
- Dodaj funkcje: `searchMovies`, `addUserMovie`, `patchUserMovie`, `deleteUserMovie`, `listUserMovies(status)` w `src/lib/api/userMovies.ts` i `src/lib/api/movies.ts` (Axios, JWT z interceptorem).
- Przygotuj hooki TanStack Query: `useMoviesSearch`, `useAddUserMovie`, `usePatchUserMovie`, `useListUserMovies`, `useDeleteUserMovie`.

4) Hook kontrolera
- Zaimplementuj `useOnboardingWatchedController` z metodami: `pick(movie)`, `undo(item)`, `finish()`, `skip()` i stanem `viewModel`.
- Zaimplementuj łańcuch operacji pick: POST→(409→lookup)→PATCH; fallbacki opisane wyżej.

5) UI – komponenty
- Zbuduj `OnboardingWatchedPage` i podkomponenty z sekcji 4 z Tailwind + shadcn/ui.
- `WatchedSearchBox`: input, dropdown, loader, puste stany; blokada po 3/3.
- `SelectedMoviesList`: kafelki z posterem, tytułem, statusem i przyciskiem „Cofnij/Usuń”.
- `ActionsBar`: Skip/Zakończ (zawsze aktywne).

6) UX, dostępność i komunikaty
- Dodaj aria-labels, role combobox/listbox, focus management.
- Toasty dla sukcesów/błędów, tooltip przy limicie 3.

7) Testy
- Testy jednostkowe hooka `useOnboardingWatchedController` (scenariusze: 201, 409→lookup, 400 already watched, 401 redirect, limit 3, duplikaty).
- Testy komponentów: render i interakcje dla SearchBox, SelectedList, Actions.

8) Dokończenie
- Po „Zakończ”/„Skip” ustaw `onboardingComplete` i przejdź do `/`.
- Krótkie sprawdzenie regresji: brak błędów przy 0 wybranych.

---

Zgodność z PRD i User Stories:
- Brak wymuszania minimum (0–3) i zawsze aktywny „Zakończ”/„Skip”.
- Licznik „Oznaczone: X/3”, wyszukiwarka z autocomplete, lista oznaczonych.
- Po akcji filmy trafiają do „Obejrzane” (`watched_at` dziś) dzięki `PATCH mark_as_watched`.
- Skip na Kroku 3 kończy onboarding i przenosi do aplikacji; brak zapisu danych przy braku wyborów.
