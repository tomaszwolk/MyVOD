# Architektura UI dla MyVOD

## 1. Przegląd struktury UI

Architektura interfejsu użytkownika MyVOD skupia się na trzech filarach: (1) szybkim zarządzaniu watchlistą i obejrzanymi, (2) natychmiastowej widoczności dostępności VOD, (3) lekkim przepływie onboardingu oraz sugestiach AI limitowanych dziennie. Aplikacja jest SPA oparta na React 18 (Vite), z routowaniem w React Router v6 i stanem danych sieciowych zarządzanym przez TanStack Query. UI bazuje na Tailwind CSS i komponentach shadcn/ui.

Wysoki poziom podziału UI:
- Public: logowanie i rejestracja (`/auth/*`).
- Onboarding (3 kroki) dostępny tylko przy pierwszym logowaniu (`/onboarding/*`).
- Aplikacja właściwa: sekcje watchlisty i obejrzanych osadzone we wspólnym `MediaLibraryLayout` i `MediaToolbar`, co pozwala na późniejsze dodawanie kolejnych widoków biblioteki bez dublowania struktury. Preferencje widoku (lista/kafelki) są współdzielone pomiędzy zakładkami.
- Admin dashboard metryk (MVP – podstawowy zakres) (`/admin`).
- Strony błędów i fallbacki (401/403/404/offline) oraz guardy chroniące prywatne ścieżki.

Zasady UX, dostępności i bezpieczeństwa:
- Error handling first: wczesne walidacje i czytelne komunikaty (toasty/inline), guard clauses w akcjach.
- Responsywność mobile-first: 1–2 kolumny na mobile, 3–4 na desktop (gridy w watchliście/obejrzanych). Wspólny layout zapewnia stałe odstępy, obramowania i zachowanie toolbaru.
- Podstawowa dostępność: etykiety, focus-states, trap w modalach, role dla elementów interaktywnych.
- Bezpieczeństwo: trasy chronione (auth guard), automatyczne odświeżanie JWT (interceptor), bezpieczne obchodzenie 401 (redirect po niepowodzeniu refresh), minimalizacja ujawnianych informacji o błędach logowania.
- Wydajność: prefetch kluczowych danych, opcjonalna wirtualizacja list przy większych kolekcjach, cache kontrolowany dla sugestii (reset dzienny kalendarzowy po stronie UI).

Zgodność z API: wszystkie interakcje użytkownika mapują się na przewidziane endpointy: auth (`/api/token/`, `/api/register/`), profil (`/api/me/` GET/PATCH), listy i operacje filmów (`/api/movies/`, `/api/user-movies/` GET/POST/PATCH/DELETE), platformy (`/api/platforms/`), oraz sugestie AI (`/api/suggestions/`).

## 2. Lista widoków

1) Widok: Logowanie
- Ścieżka widoku: `/auth/login`
- Główny cel: Uwierzytelnienie użytkownika i pozyskanie pary tokenów JWT.
- Kluczowe informacje do wyświetlenia: pola email/hasło, link do rejestracji, błędy walidacji i komunikaty o niepowodzeniu logowania.
- Kluczowe komponenty widoku: Form (Email, Password), Button (Zaloguj), Link (Rejestracja), Alert/Toast na błąd, Loader na submit.
- UX, dostępność i względy bezpieczeństwa: etykiety i opisy pól, klawisz Enter do submitu, maskowanie hasła, ograniczenie informacji o błędach („Nieprawidłowy email lub hasło”), blokada wielokrotnych kliknięć, focus management.

2) Widok: Rejestracja
- Ścieżka widoku: `/auth/register`
- Główny cel: Utworzenie nowego konta użytkownika zgodnie z polityką haseł.
- Kluczowe informacje do wyświetlenia: email, hasło, powtórz hasło, zasady dotyczące siły hasła, potwierdzenie rejestracji.
- Kluczowe komponenty widoku: Form (Email, Password, Confirm), Button (Zarejestruj), Alert/Toast, Link (Logowanie).
- UX, dostępność i względy bezpieczeństwa: walidacja inline (min. 8 znaków, litery i cyfry), brak auto-logowania po rejestracji (zgodnie z PRD), jasne komunikaty 400, focus management, czytelne błędy bez ujawniania stanu kont w systemie.

3) Widok: Onboarding – Krok 1: Wybór platform VOD
- Ścieżka widoku: `/onboarding/platforms`
- Główny cel: Zapisanie preferencji platform VOD użytkownika.
- Kluczowe informacje do wyświetlenia: 5 platform (Netflix, HBO Max, Disney+, Prime Video, Apple TV+), wskazówki, progress „Krok 1/3”.
- Kluczowe komponenty widoku: CheckboxGroup z ikonami platform, Buttons (Dalej, Skip), Progress bar.
- UX, dostępność i względy bezpieczeństwa: możliwość przejścia dalej bez wyboru, zachowanie wyboru, focus i role dla checkboxów, wizualne stany zaznaczenia.

4) Widok: Onboarding – Krok 2: Dodaj 3 filmy do watchlisty
- Ścieżka widoku: `/onboarding/first-movies`
- Główny cel: Dodanie 0–3 filmów do watchlisty poprzez wyszukiwarkę z autocomplete.
- Kluczowe informacje do wyświetlenia: pole wyszukiwania, dropdown do 10 wyników (plakat, tytuł, rok, ocena), licznik „Dodane: X/3”, lista dodanych.
- Kluczowe komponenty widoku: Combobox z debounce, Lista wyników, Lista dodanych pozycji (mini-kafelki), Buttons (Dalej, Skip).
- UX, dostępność i względy bezpieczeństwa: responsywność i łatwe trafianie w pozycje listy, placeholder dla braku plakatu, jasny komunikat przy braku wyników, zapobieganie duplikatom w sesji.

5) Widok: Onboarding – Krok 3: Oznacz 3 obejrzane
- Ścieżka widoku: `/onboarding/watched`
- Główny cel: Oznaczenie 0–3 filmów jako obejrzane (przeniesienie do historii).
- Kluczowe informacje do wyświetlenia: pole wyszukiwania, wyniki, licznik „Oznaczone: X/3”, lista oznaczonych.
- Kluczowe komponenty widoku: Combobox, Kafelki/wiersze wyników z akcją „Oznacz obejrzane”, Buttons (Zakończ, Skip).
- UX, dostępność i względy bezpieczeństwa: brak wymuszeń (można 0/3), komunikaty sukcesu/błędu, mechanika: dodanie, jeśli brak, a następnie oznaczenie jako obejrzane w tle.

6) Widok: Dashboard – Watchlista
- Ścieżka widoku: `/watchlist`
- Główny cel: Centralne zarządzanie filmami do obejrzenia, z podglądem dostępności VOD i szybkim dodawaniem.
- Kluczowe informacje do wyświetlenia: kafelki/wiersze filmów (plakat/placeholder, tytuł, rok, ocena IMDb, gatunki), ikony dostępności VOD, badge „Niedostępne…”, data „Stan z: [data]”, licznik widocznych.
- Kluczowe komponenty widoku: App header, `MediaLibraryLayout` + `MediaToolbar` z osadzonymi elementami sterującymi (Search Combobox, Toggle widoków, wspólny SortDropdown, `FiltersBar` z przyciskiem „Ukryj niedostępne” i licznikiem), Karta/Wiersz filmu z akcjami (Oznacz obejrzane, Usuń), Toastery, Paginacja/wirtualizacja (opcjonalnie), Przycisk „Zasugeruj filmy”.
- UX, dostępność i względy bezpieczeństwa: szybkie akcje z confirm dla usuwania, optimistic updates z opcją Undo, wyraźne stany filtrów, zapamiętywanie preferencji widoku/sortowania w sesji, focus states, minimalizacja skoków layoutu (lazy image + stałe wymiary).

7) Widok: Zakładka „Obejrzane"
- Ścieżka widoku: `/app/watched`
- Główny cel: Przegląd historii obejrzanych filmów, opcja przywrócenia do watchlisty oraz usuwania z historii obejrzanych.
- Kluczowe informacje do wyświetlenia: lista filmów z datą obejrzenia, te same pola co w watchliście, sort po dacie (najnowsze pierwsze).
- Kluczowe komponenty widoku: ten sam `MediaLibraryLayout` i `MediaToolbar` co w watchliście (re-użycie Search Combobox, SortDropdown, przycisku „Zasugeruj filmy"), dedykowany `WatchedFiltersBar` (przycisk „Ukryj niedostępne / Pokaż niedostępne" + licznik), Karta/Wiersz filmu z akcjami „Przywróć do watchlisty" i „Usuń", `ConfirmDialog` dla potwierdzenia usunięcia, Empty state.
- UX, dostępność i względy bezpieczeństwa: preferencje widoku i sortowania dziedziczone z watchlisty; filtr „Ukryj niedostępne" działa tylko przy skonfigurowanych platformach (profil) i zapamiętuje stan.
- UX, dostępność i względy bezpieczeństwa: szybkie cofnięcie do listy, spójne skróty klawiaturowe/tabindex, brak ograniczeń na liczbę „Obejrzanych".
- Usuwanie z historii: przycisk „Usuń" umieszczony w prawym dolnym rogu, z prawej strony przycisku „Przywróć" (widok listy) lub obok przycisku „Przywróć" (widok siatki). Operacja wymaga potwierdzenia przez `ConfirmDialog` z komunikatem o nieodwracalności. Hard delete (ustawienie `watched_at = NULL`) - operacja nieodwracalna, bez możliwości undo. Użytkownik może ponownie oznaczyć film jako watched, jeśli chce go przywrócić do historii.

8) Widok: Sugestie AI (modal)
- Ścieżka widoku: modal otwierany przez URL param `?suggestions=true` z `/app/watchlist`, `/app/watched` lub `/app/profile`
- Główny cel: Wyświetlenie do 5 sugestii (tytuł, rok, uzasadnienie, dostępność) i dodanie wybranych do watchlisty.
- Kluczowe informacje do wyświetlenia: lista kart sugestii, licznik/czas do resetu dziennego, komunikaty o limicie/404.
- Kluczowe komponenty widoku: `AISuggestionsDialog` (modal z focus trap), `SuggestionList`, `SuggestionCard` (plakat, tytuł, uzasadnienie, ikony VOD), Button „Dodaj do watchlisty” (z blokadą po dodaniu), `RateLimitBadge` z odliczaniem do resetu, `AISuggestionsEmptyState`, Toastery.
- UX, dostępność i względy bezpieczeństwa: brak nadmiarowych informacji przy błędzie 429, jasny czas do kolejnej próby, nie duplikować filmów już na liście, obsługa klawiatury w modalnym wariancie (Esc do zamknięcia, Tab navigation), routing przez URL params pozwala na bezpośrednie linkowanie.

9) Widok: Profil użytkownika
- Ścieżka widoku: `/app/profile`
- Główny cel: Zarządzanie platformami VOD i ustawieniami konta (w tym RODO – usunięcie konta).
- Kluczowe informacje do wyświetlenia: email, stan checkboxów platfom, przyciski zapisu, sekcja „Usuń konto” z ostrzeżeniem.
- Kluczowe komponenty widoku: CheckboxGroup platform z ikonami, Button „Zapisz zmiany”, AlertDialog „Usuń konto”, Toastery.
- UX, dostępność i względy bezpieczeństwa: confirm z jasnym ostrzeżeniem, odświeżenie ikon dostępności po zapisie, disabled filtr „Tylko dostępne”, gdy brak wybranych platform.

10) Widok: Admin dashboard (MVP – podstawowy)
- Ścieżka widoku: `/admin`
- Główny cel: Podgląd metryk (overview, retention, AI adoption, growth) – wysokopoziomowo.
- Kluczowe informacje do wyświetlenia: podstawowe wykresy/metryki z backendu lub z Django Admin; lista top 10 filmów, logi błędów (zależnie od zakresu w MVP).
- Kluczowe komponenty widoku: Karty metryk, proste wykresy, tabele.
- UX, dostępność i względy bezpieczeństwa: dostęp tylko dla roli admin (guard), paginacja tabel, czytelne etykiety wykresów.

11) Widoki błędów i fallbacki
- Ścieżki widoków: `*` (404), dedykowane: `/error/unauthorized`, `/error/offline`.
- Główny cel: Czytelne komunikaty i CTA (np. „Zaloguj ponownie”, „Odśwież”).
- Kluczowe informacje do wyświetlenia: opis błędu, akcje powrotu/ponów.
- Kluczowe komponenty widoku: Empty/Illustration, Buttons, Linki.
- UX, dostępność i względy bezpieczeństwa: nie ujawniać szczegółów systemu, przyjazne opisy, dostępne CTA.

## 3. Mapa podróży użytkownika

Główne przepływy i przejścia między widokami:

1) Rejestracja → Logowanie → Onboarding → Dashboard watchlisty
- Rejestracja (`/auth/register`) – 201; przekierowanie do logowania.
- Logowanie (`/auth/login`) – po sukcesie sprawdzenie stanu onboardingu (pierwsze logowanie) i redirect do `/onboarding/platforms` lub `/watchlist`.
- Onboarding kroki 1–3 (`/onboarding/*`) – każdy krok pozwala „Skip”; po „Zakończ/Skip” → `/watchlist`.

1) Główny przypadek użycia – Dodaj film i obejrzyj
- Start: `/watchlist`.
- Wyszukiwanie (Combobox) → GET `/api/movies?search=…` → wybór pozycji → POST `/api/user-movies/` → toast „Dodano".
- Przeglądanie dostępności (Watchmode) i filtr „Tylko dostępne"/„Ukryj niedostępne".
- Oznacz jako „Obejrzane" → PATCH `/api/user-movies/<id>/ {action: mark_as_watched}` → toast, film znika z watchlisty i pojawia się w `/app/watched`.
- Usuwanie z historii obejrzanych: `/app/watched` → klik „Usuń" → `ConfirmDialog` z potwierdzeniem → DELETE `/api/user-movies/<id>/` → hard delete (`watched_at = NULL`) → toast sukcesu, film znika z listy watched. Operacja nieodwracalna, bez undo.

1) Sugestie AI – odkrywanie nowych tytułów
- Z `/app/watchlist`, `/app/watched` lub `/app/profile`: klik „Zasugeruj filmy” → modal otwierany przez URL param `?suggestions=true`.
- GET `/api/suggestions/`:
  - 200: lista 1–5 sugestii → „Dodaj do watchlisty”: POST `/api/user-movies/` (z flagą `added_from_ai_suggestion=true`) → toast, disable przycisku.
  - 429: pokazanie limitu i czasu do resetu w `RateLimitBadge`.
  - 404: komunikat „Dodaj filmy do watchlisty lub oznacz jako obejrzane…”.
- Zamknięcie modala usuwa URL param `?suggestions=true` z powrotem do poprzedniej strony.

1) Edycja profilu – platformy i RODO
- `/app/profile` → GET `/api/me/` i `/api/platforms/`.
- Zmiana platform → PATCH `/api/me/` → refresh ikon dostępności w listach.
- „Usuń konto” → AlertDialog → potwierdzenie → hard delete po stronie backendu → clear tokeny → redirect do `/` lub `/auth/login` z komunikatem.

1) Sesja i bezpieczeństwo
- Każdy request z access tokenem. Na 401: próba refresh (`/api/token/refresh/`); gdy refresh niepowodzenie → redirect do `/auth/login` z komunikatem „Twoja sesja wygasła…”.
- Ochrona tras: guard dla `/app/*` i `/admin`.

## 4. Układ i struktura nawigacji

Layouty i nawigacja:
- PublicLayout (Auth): prosty układ formularzowy z logo i linkami.
- OnboardingLayout: nagłówek z progressem (1/3, 2/3, 3/3), główna treść kroku, przyciski „Dalej/Skip/Zakończ”.
- AppShell (Private):
  - Header: logo, przycisk „Zasugeruj filmy”, link do profilu, „Wyloguj”.
  - Main nav (Tabs): „Watchlista” (`/app/watchlist`), „Obejrzane” (`/app/watched`).
  - Sub-bar nad listami: wyszukiwarka, sortowanie, filtry, przełącznik widoków.
  - Content: grid/lista filmów z akcjami.
- AdminLayout: sekcja metryk i tabel (tylko admin).

Struktura tras (skrót):
- `/` → redirect na `/app/watchlist` (jeśli zalogowany) albo `/auth/login`.
- `/auth/login`, `/auth/register` (publiczne).
- `/onboarding/platforms`, `/onboarding/add`, `/onboarding/watched` (chronione, tylko przy pierwszym logowaniu).
- `/app/watchlist`, `/app/watched`, `/app/profile` (chronione). Sugestie AI dostępne przez URL param `?suggestions=true` na każdej z tych tras.
- `/admin` (chronione, rola admin).
- `*` (404) oraz dedykowane strony błędów.

Nawigacja kluczowych akcji:
- CTA „Zasugeruj filmy” z headera lub toolbaru otwiera modal przez dodanie URL param `?suggestions=true` do aktualnej trasy.
- Akcje na elementach listy: oznacz jako obejrzane, usuń, przywróć – bez przeładowania, z tostem i ewentualnym Undo.
- Linki pomocnicze w empty states (np. „Wyszukaj filmy”).

## 5. Kluczowe komponenty

- AppShell / ProtectedRoute: wspólny układ i strażnik autoryzacji, integracja z interceptorami JWT.
- SearchCombobox: wyszukiwarka z debounce (min. 2 znaki, max 10 wyników, plakat/placeholder, tytuł, rok, ocena).
- MovieCard / MovieListRow: prezentacja filmu (plakat, tytuł, rok, gatunki, ocena, ikony platform), akcje kontekstowe.
- AvailabilityBadges: ikony platform VOD w kolorze przy dostępności, badge „Niedostępne…”, znacznik „Stan z: [data]”.
- MediaLibraryLayout & MediaToolbar: wspólny kontener i belka sterująca dla widoków biblioteki (watchlista, obejrzane oraz przyszłe ekrany). Zapewnia jednolite nagłówki, zakładki i sloty na kontrolki.
- FiltersBar: checkbox „Tylko dostępne”, przycisk „Ukryj niedostępne”, selektor sortowania („Data dodania”, „Ocena IMDb”, „Rok”).
- WatchedFiltersBar: toolbar obejrzanych z przyciskiem „Ukryj/Pokaż niedostępne” i licznikiem.
- ViewToggle: przełącznik kafelki/lista (zapamiętanie preferencji w sesji).
- `AISuggestionsDialog`: modal do wyświetlania sugestii AI z focus trap, routing przez URL params (`?suggestions=true`).
- `SuggestionCard`: karta pojedynczej sugestii AI (plakat, tytuł, uzasadnienie, dostępność, CTA „Dodaj”).
- `SuggestionList`: lista kart sugestii w responsywnym gridzie.
- `RateLimitBadge`: badge z odliczaniem czasu do resetu limitu sugestii.
- `AISuggestionsEmptyState`: komponenty empty state dla różnych wariantów (brak danych, limit, błąd).
- ProfilePlatformsForm: checkboxy platform z ikonami, zapis zmian, odświeżenie danych listy.
- DeleteAccountDialog: dialog RODO z mocnym ostrzeżeniem i akceptacją konsekwencji.
- OnboardingProgress: pasek postępu 1/3, 2/3, 3/3 i nawigacja krokami (z „Skip”).
- EmptyState: ilustracje i CTA dla pustych list (watchlista, obejrzane, brak sugestii).
- ConfirmDialog: confirm dla usuwania i akcji destrukcyjnych. Używany zarówno w watchliście (soft delete z undo) jak i w watched movies (hard delete bez undo) z odpowiednim komunikatem o nieodwracalności operacji.
- useDeleteFromWatched: hook React Query do obsługi usuwania filmów z historii obejrzanych. Implementuje optimistic updates, rollback przy błędzie oraz toast notyfikacje. Operacja hard delete (nieodwracalna).
- Toasts/Alerts: komunikaty o sukcesie/błędach (w tym 401/409/429/404 dla odpowiednich scenariuszy).
- ErrorBoundary / OfflineBoundary: przyjazne ekrany błędów i offline z retry.


