# Plan implementacji widoku Onboarding – Krok 2: Dodaj 3 filmy do watchlisty

## 1. Przegląd
Widok służy do szybkiego dodania 0–3 filmów do watchlisty w trakcie onboardingu. Użytkownik wyszukuje filmy poprzez pole z autocomplete (do 10 wyników), a następnie dodaje je do listy. Licznik „Dodane: X/3” prezentuje postęp. „Dalej” i „Skip” przechodzą do Kroku 3 bez wymuszania minimum.

Cele:
- Szybkie odkrycie funkcji wyszukiwania i dodawania do watchlisty.
- Niewymuszające doświadczenie (0–3 pozycje), aby nie blokować przepływu.
- Wysoka dostępność (a11y), responsywność, brak duplikatów w sesji.

## 2. Routing widoku
- Ścieżka: `/onboarding/add` (Krok 2/3)
- Wejście: z Kroku 1 (`/onboarding/platforms`) lub bezpośrednio (nie jest blokowane)
- Wyjście:
  - „Dalej” → `/onboarding/seen` (Krok 3/3; nazwa ścieżki do potwierdzenia z routerem)
  - „Skip” → `/onboarding/seen`

Guard (opcjonalny, nice-to-have): jeśli użytkownik nie jest zalogowany, przekierowanie do logowania; jeśli token wygasł, odświeżenie/redirect zgodnie z zachowaniem globalnego klienta HTTP.

## 3. Struktura komponentów
```
OnboardingAddPage (/onboarding/add)
├─ PageHeader (tytuł + progress 2/3)
├─ MovieSearchCombobox
│  ├─ SearchInput
│  └─ ResultsPopover
│     └─ SearchResultsList
│        └─ SearchResultItem (poster, tytuł, rok, ocena, akcja „Dodaj”)
├─ CounterBadge ("Dodane: X/3")
├─ AddedMoviesGrid
│  └─ AddedMovieCard (mini-kafelek: poster/placeholder, tytuł, rok)
└─ OnboardingFooterNav (Skip, Dalej)
```

Lokalizacja plików (proponowana):
- `frontend/src/pages/onboarding/OnboardingAddPage.tsx`
- `frontend/src/components/onboarding/MovieSearchCombobox.tsx`
- `frontend/src/components/onboarding/SearchResultsList.tsx`
- `frontend/src/components/onboarding/SearchResultItem.tsx`
- `frontend/src/components/onboarding/AddedMoviesGrid.tsx`
- `frontend/src/components/onboarding/AddedMovieCard.tsx`
- `frontend/src/components/onboarding/OnboardingFooterNav.tsx`

## 4. Szczegóły komponentów
### OnboardingAddPage
- Opis: Strona-orchestrator. Łączy wyszukiwanie, dodawanie, listę dodanych i nawigację.
- Główne elementy: nagłówek (tytuł + wskaźnik 2/3), combobox, licznik, grid dodanych, nawigacja.
- Interakcje:
  - Odbiera `onAddMovie(tconst)` z comboboxa i wywołuje mutację POST.
  - Uaktualnia stan sesji (lista dodanych, licznik).
  - Przycisk „Dalej”/„Skip” → nawigacja do Kroku 3.
- Walidacja/warunki:
  - Maks. 3 dodane w sesji (blokada przycisku „Dodaj” po osiągnięciu 3).
  - Zapobieganie duplikatom w sesji (tconst unikalny w lokalnym stanie).
- Typy: `MovieSearchResultDto`, `AddUserMovieCommand`, `UserMovieDto`, `AddedMovieVM`, `OnboardingAddState`.
- Propsy: brak (to strona routowana).

### MovieSearchCombobox
- Opis: Pole wyszukiwarki z debounce i listą wyników (do 10 pozycji).
- Główne elementy: `SearchInput`, `ResultsPopover` z `SearchResultsList`.
- Interakcje:
  - `onChange(query)` – kontroluje wpisywany tekst; debounce (np. 250 ms) przed zapytaniem.
  - Klawisze: ↑/↓ nawigują po liście, Enter dodaje zaznaczoną pozycję, Esc zamyka dropdown.
  - Kliknięcie elementu na liście wywołuje `onSelectOption(tconst)`.
- Walidacja/warunki:
  - Zapytanie uruchamiamy przy `query.length >= 2`.
  - Limit 10 wyników, placeholder dla braku plakatu.
  - Komunikat „Nie znaleziono filmów” przy pustym wyniku.
  - Wyłącz element wyników, jeśli film już dodany w sesji lub osiągnięty limit 3.
- Typy: `MovieSearchResultDto`, `SearchOptionVM`.
- Propsy:
  - `maxSelectable: number` (domyślnie 3)
  - `disabledTconsts: Set<string>` (dodane w sesji)
  - `onSelectOption: (item: SearchOptionVM) => void`

### SearchResultsList
- Opis: Scrollowalna lista do 10 wyników.
- Główne elementy: `<ul role="listbox">` z elementami `<li role="option">`.
- Interakcje: wybór myszą lub Enter na zaznaczonym elemencie.
- Walidacja/warunki: elementy disabled dla dodanych/limitu; a11y: `aria-activedescendant`, fokus sterowany.
- Typy: `SearchOptionVM`.
- Propsy:
  - `items: SearchOptionVM[]`
  - `activeIndex: number`
  - `onPick: (item: SearchOptionVM) => void`

### SearchResultItem
- Opis: Pojedynczy wynik (poster/placeholder 50x75, tytuł, rok, ocena) + akcja „Dodaj”.
- Interakcje: kliknięcie w element lub w przycisk „Dodaj”.
- Walidacja/warunki: `disabled` gdy w `disabledTconsts` lub osiągnięty limit.
- Typy: `SearchOptionVM`.
- Propsy:
  - `item: SearchOptionVM`
  - `disabled: boolean`
  - `onAdd: (tconst: string) => void`

### CounterBadge
- Opis: Wyświetla „Dodane: X/3”.
- Propsy: `count: number`, `max: number`.

### AddedMoviesGrid
- Opis: Grid mini-kafelków dodanych pozycji w sesji (max 3).
- Elementy: `AddedMovieCard` (poster/placeholder, tytuł, rok).
- Interakcje: brak wymaganych; opcjonalnie (nice-to-have) „Usuń z sesji”.
- Propsy: `items: AddedMovieVM[]`.

### AddedMovieCard
- Opis: Mini-kafelek 1:1 z posterem/placeholderem, tytułem, rokiem.
- Propsy: `item: AddedMovieVM`.

### OnboardingFooterNav
- Opis: Pasek nawigacji (Skip, Dalej) z wyrównaniem.
- Interakcje: `onSkip()`, `onNext()`.
- Walidacja/warunki: przycisk „Dalej” zawsze aktywny (zgodnie z PRD).
- Propsy: `{ onSkip: () => void; onNext: () => void; }`.

## 5. Typy
Wykorzystanie istniejących typów (`frontend/src/types/api.types.ts`):
- `MovieSearchResultDto` – wynik `GET /api/movies/`.
- `AddUserMovieCommand` – body `POST /api/user-movies/`.
- `UserMovieDto` – odpowiedź `POST /api/user-movies/`.

Nowe typy ViewModel dla widoku:
- `type SearchOptionVM = {
  tconst: string;
  primaryTitle: string; // z MovieSearchResultDto.primary_title
  startYear: number | null;
  avgRating: string | null;
  posterUrl: string | null; // z MovieSearchResultDto.poster_path
}`

- `type AddedMovieVM = {
  tconst: string;
  primaryTitle: string;
  startYear: number | null;
  posterUrl: string | null;
}`

- `type OnboardingAddState = {
  query: string;
  debouncedQuery: string;
  results: SearchOptionVM[]; // zmapowane z DTO
  added: AddedMovieVM[]; // max 3 (stan sesji)
  addedSet: Set<string>; // dla szybkiego sprawdzania duplikatów
  isAddingByTconst: Record<string, boolean>; // kontrola disabled w trakcie POST
  errorMessage?: string; // do inline info przy błędach wyszukiwania
}`

## 6. Zarządzanie stanem
- Lokalny stan w `OnboardingAddPage` + TanStack Query do danych zewnętrznych.
- Zmienne stanu:
  - `query`, `debouncedQuery` (debounce 250 ms)
  - `results` (pochodzi z React Query: `useMovieSearch`)
  - `added` + `addedSet` (lokalna sesja, max 3)
  - `isAddingByTconst` (flagi requestów POST)
  - `activeIndex` i `isOpen` (dla a11y comboboxa)
- Custom hooki:
  - `useDebouncedValue(value, delay)` – opóźnianie zapytań.
  - `useMovieSearch(query)` – React Query: klucz `['movies','search',query]`, `enabled: query.length>=2`, `staleTime: 30_000ms`.
  - `useAddUserMovie()` – React Query mutation `POST /api/user-movies/`.

## 7. Integracja API
- Wyszukiwanie: `GET /api/movies/?search=<query>`
  - Auth: publiczne (brak tokenu)
  - Response: `MovieSearchResultDto[]`
  - Ograniczenie: renderujemy max pierwsze 10 pozycji; fallback na placeholder, gdy `poster_path=null`.
- Dodanie do watchlisty: `POST /api/user-movies/`
  - Auth: wymagany JWT (Axios z interceptorami; automatyczne odświeżanie/redirect zgodnie z globalnym klientem)
  - Body: `AddUserMovieCommand` `{ tconst: string }`
  - 201: `UserMovieDto` – aktualizujemy `added/addedSet` (używamy danych do mini-kafelka)
  - 409: film już na watchliście → toast: „Ten film jest już na Twojej watchliście” + disable w sesji
  - 400: niepoprawny `tconst`/brak w bazie → toast: „Nie udało się dodać filmu”
  - 401: redirect do logowania (wg globalnej obsługi)

## 8. Interakcje użytkownika
- Wpisywanie w pole: po ≥2 znakach pojawia się dropdown z wynikami (max 10). Loader przy ładowaniu.
- Klawiatura: ↑/↓ wybór, Enter dodaje, Esc zamyka.
- Klik „Dodaj” lub klik w wiersz: wywołuje POST, element tymczasowo disabled; sukces → pozycja trafia do listy „Dodane”.
- „Dalej”: przejście do `/onboarding/seen` (bez dodatkowych akcji – dodane filmy już zapisane).
- „Skip”: przejście do `/onboarding/seen` (bez zapisu czegokolwiek ponad to, co już dodano).

## 9. Warunki i walidacja
- Minimalna długość zapytania: 2 znaki (inaczej brak zapytań i dropdownu).
- Limit lokalny: max 3 dodane elementy; po osiągnięciu 3 – wszystkie „Dodaj” są disabled oraz komunikat przy liczniku.
- Duplikaty w sesji: blokada dodania (disabled w wynikach + sprawdzenie w handlerze).
- Duplikaty na serwerze (409): komunikat i zablokowanie elementu w dropdownie (opcjonalnie do końca sesji).
- Poster: placeholder gdy `poster_path` puste.
- A11y: `role="combobox"` dla inputa, `aria-expanded`, `aria-controls`, `aria-activedescendant`, `role="listbox"` i `role="option"` dla listy.

## 10. Obsługa błędów
- GET /api/movies:
  - Błąd sieci: inline `errorMessage` nad/poniżej listy („Nie udało się pobrać wyników. Spróbuj ponownie”).
  - Puste wyniki: komunikat „Nie znaleziono filmów”.
- POST /api/user-movies:
  - 409: toast info + pozostawienie użytkownika w widoku.
  - 400: toast błędu („Nie udało się dodać filmu”).
  - 401: globalny handler JWT – redirect/refresh.
  - Inne 5xx: toast błędu.
- UX: brak przerwania onboardingu przy błędach jednostkowych; częściowy sukces dozwolony.

## 11. Kroki implementacji
1) Routing i szkielet strony
- Dodaj trasę `/onboarding/add` do routera i utwórz `OnboardingAddPage.tsx` (tytuł: „Dodaj pierwsze 3 filmy do watchlisty” + progress „Krok 2/3”).

2) Hooki i klient API
- Zaimplementuj `useDebouncedValue`.
- Zaimplementuj `useMovieSearch` (React Query) z mapowaniem `MovieSearchResultDto` → `SearchOptionVM` i limitem 10.
- Zaimplementuj `useAddUserMovie` (mutation) z mapowaniem `UserMovieDto` → `AddedMovieVM`.

3) Komponent comboboxa
- `MovieSearchCombobox` z kontrolowanym inputem, obsługą klawiatury i listą wyników (`SearchResultsList`, `SearchResultItem`).
- A11y atrybuty i fokus management, loader i komunikaty o błędach/pustych wynikach.

4) Lista dodanych
- `AddedMoviesGrid` + `AddedMovieCard` (poster/placeholder, tytuł, rok). Obsłuż stan max 3.

5) Nawigacja
- `OnboardingFooterNav` z „Skip” i „Dalej” → navigate do `/onboarding/seen`.

6) Walidacje i blokady
- Zaimplementuj limit 3 oraz blokadę duplikatów w sesji (`addedSet`).
- Zadbaj, aby „Dalej” był zawsze aktywny.

7) Obsługa błędów i toasty
- Mapowanie 409/400/5xx na komunikaty; przygotuj `Toast`/`useToast` (shadcn/ui) lub alternatywę.

8) Stylizacja i responsywność
- Tailwind + shadcn/ui (Input, Button, Popover/Command, Badge). Miniatury 50x75 px, grid responsywny.

9) Testy (propozycje)
- Jednostkowe: mapowanie DTO→VM, limit 3, duplikaty, debounce.
- Integracyjne: dodanie jednego i trzech filmów, obsługa 409.
- A11y: nawigacja klawiaturą, role ARIA.

10) Telemetria (nice-to-have)
- Wyślij eventy (dodano film w onb.2) do prostego loggera, jeśli istnieje.

11) Przegląd i QA
- Sprawdź ścieżki krańcowe: 0 dodanych → „Dalej”, brak wyników, brak plakatu, 401.
