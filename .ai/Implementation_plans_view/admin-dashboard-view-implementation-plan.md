# Plan implementacji widoku Admin Dashboard

## 1. Przegląd
Widok Admin Dashboard służy do przeglądu kluczowych metryk produktu oraz diagnostyki integracji (logi błędów). Celem MVP jest dostarczenie prostego, czytelnego pulpitu: karty metryk ogólnych, podstawowe wykresy (retention, wzrost użytkowników), tabela Top 10 filmów oraz tabela logów błędów z filtrami i eksportem CSV. Dostęp wyłącznie dla administratorów (staff/superuser) poprzez wbudowany Django Admin.

## 2. Routing widoku
- Backend (Django Admin): `GET /admin/` (domyślny panel) oraz dedykowana podstrona `GET /admin/analytics/dashboard/` (zalecane dla izolacji). Widok dostępny tylko dla `request.user.is_staff == True`.
- JSON endpointy serwowane spod przestrzeni admina (niepubliczne, guardowane):
  - `GET /admin/analytics/api/metrics/` – agregaty do kart i wykresów
  - `GET /admin/analytics/api/top-movies/` – top 10 (parametry: `type`, `range`)
  - `GET /admin/analytics/api/error-logs/` – logi z paginacją i filtrami
  - `GET /admin/analytics/api/top-movies/export.csv` – eksport CSV (z filtrami)
  - `GET /admin/analytics/api/error-logs/export.csv` – eksport CSV (z filtrami)

Uwaga: Panel admina Django już jest pod `path("admin/", admin.site.urls)`. Nowy dashboard i API należy wystawić w obrębie panelu (np. poprzez custom admin views + `@staff_member_required`).

## 3. Struktura komponentów
- AdminDashboardShell
  - MetricsCardsGrid
    - MetricCard (x8, różne źródła danych)
  - ChartsRow
    - RetentionLineChart
    - UsersGrowthBarChart
  - TopMoviesSection
    - TopMoviesFilters (timeframe, typ rankingu)
    - TopMoviesTable
    - ExportButton
  - ErrorLogsSection
    - ErrorLogsFilters (API type, data od/do, user_id)
    - ErrorLogsTable (paginacja 50/strona, sortowanie po dacie)
    - ExportButton

Wykresy: Chart.js (CDN) lub alternatywnie mała aplikacja React z `react-chartjs-2` osadzona w szablonie admina. MVP: prosty szablon Django + Chart.js + fetch.

## 4. Szczegóły komponentów
### AdminDashboardShell
- Opis: Kontener widoku z nagłówkiem, breadcrumbem i sekcjami.
- Główne elementy: nagłówek „Analytics”, sekcje: Karty, Wykresy, Top 10, Logi.
- Obsługiwane interakcje: brak (layout).
- Walidacja: n/d.
- Typy: `AdminMetricsDto`, `TopMoviesDto`, `PaginatedErrorLogsDto` (używane w dzieciach).
- Propsy: brak (root). 

### MetricsCardsGrid
- Opis: Siatka 2–4 kolumn z kartami metryk.
- Główne elementy: 8 kart: łączna liczba użytkowników; nowi użytkownicy (dziś, 7 dni, 30 dni); retention 7d; retention 30d; % użytkowników z ≥10 filmami; % używających AI; % dodających filmy z AI; średnia liczba filmów/użytkownika.
- Obsługiwane interakcje: tooltipy.
- Walidacja: liczby ≥0; wartości procentowe 0–100.
- Typy: `AdminMetricsDto` → `MetricCardVM[]`.
- Propsy: `{ metrics: AdminMetricsDto }`.

### MetricCard
- Opis: Uniwersalna karta z etykietą, wartością, opcjonalnym sub-label (np. timeframe) i tooltipem.
- Główne elementy: label, value, optional hint, optional icon.
- Interakcje: hover tooltip.
- Walidacja: wartość numeryczna lub „—” gdy brak danych.
- Typy: `MetricCardVM`.
- Propsy: `{ vm: MetricCardVM }`.

### ChartsRow
- Opis: Wiersz z dwoma wykresami.
- Główne elementy: `RetentionLineChart`, `UsersGrowthBarChart`.
- Interakcje: hover tooltip na punktach.
- Walidacja: dane timeseries – poprawne daty ISO i wartości w zakresie.
- Typy: `AdminMetricsDto` (pola timeseries).
- Propsy: `{ metrics: AdminMetricsDto }`.

### RetentionLineChart
- Opis: Linia 7-day i 30-day retention (np. 8 ostatnich tygodni).
- Główne elementy: Chart.js line chart z legendą i osiami.
- Interakcje: hover tooltip, legenda togglująca serie.
- Walidacja: 0–100%.
- Typy: `RetentionPoint[]`.
- Propsy: `{ data: RetentionPoint[] }`.

### UsersGrowthBarChart
- Opis: Słupki z liczbą nowych użytkowników w czasie (np. ostatnie 30 dni/tygodnie).
- Główne elementy: Chart.js bar chart.
- Interakcje: hover tooltip.
- Walidacja: wartości ≥0.
- Typy: `UsersGrowthPoint[]`.
- Propsy: `{ data: UsersGrowthPoint[] }`.

### TopMoviesSection
- Opis: Ranking najczęściej dodawanych/oglądanych filmów.
- Główne elementy: `TopMoviesFilters`, `TopMoviesTable`, `ExportButton`.
- Interakcje: zmiana typu (watchlist/watched), timeframe (7d/30d/all), eksport CSV.
- Walidacja: `type ∈ {watchlist, watched}`, `range ∈ {7d, 30d, all}`.
- Typy: `TopMoviesQuery`, `TopMoviesDto`.
- Propsy: wewnętrzny stan sekcji.

### TopMoviesFilters
- Opis: Sterowanie parametrami zapytania.
- Główne elementy: Select „Typ rankingu” (watchlist/watched), Segmented control „Zakres” (7 dni/30 dni/Cały czas).
- Interakcje: onChange → refetch listy.
- Walidacja: domyślne: `watchlist` + `7d`.
- Typy: `TopMoviesQuery`.
- Propsy: `{ value: TopMoviesQuery, onChange: (q)=>void }`.

### TopMoviesTable
- Opis: Tabela top 10: tytuł, rok, liczba dodań/obejrzeń.
- Główne elementy: tabela, nagłówki, wiersze.
- Interakcje: brak; sortowanie po stronie backendu (malejąco).
- Walidacja: do 10 pozycji.
- Typy: `TopMoviesDto`.
- Propsy: `{ data: TopMoviesDto }`.

### ErrorLogsSection
- Opis: Podgląd logów błędów integracji.
- Główne elementy: `ErrorLogsFilters`, `ErrorLogsTable`, `ExportButton`.
- Interakcje: filtrowanie po typie API i dacie, wyszukiwanie po user_id, paginacja (50/strona), sortowanie po dacie (najnowsze pierwsze), eksport CSV.
- Walidacja: poprawne formaty dat ISO, `page ≥ 1`, `page_size = 50`, dozwolone `api_type`.
- Typy: `ErrorLogsQuery`, `PaginatedErrorLogsDto`.
- Propsy: stan lokalny sekcji i dane z fetchera.

### ErrorLogsFilters
- Opis: Zestaw filtrów.
- Główne elementy: Multi-select `api_type` (Watchmode/TMDB/Gemini), DateRangePicker (`date_from`, `date_to`), Input `user_id`, Reset.
- Interakcje: onChange → refetch tabeli; Reset czyści parametry.
- Walidacja: `date_from ≤ date_to`; `user_id` bez spacji; dozwolone wartości `api_type`.
- Typy: `ErrorLogsQuery`.
- Propsy: `{ value: ErrorLogsQuery, onChange: (q)=>void, onReset: ()=>void }`.

### ErrorLogsTable
- Opis: Tabela z logami.
- Główne elementy: kolumny: timestamp, typ API, komunikat, user_id.
- Interakcje: nagłówek „Data” przełącza sort asc/desc (via `sort`), paginacja (50/strona), klik w user_id filtruje po user_id.
- Walidacja: stronicowanie i sort – dozwolone wartości.
- Typy: `PaginatedErrorLogsDto`.
- Propsy: `{ data, page, totalPages, onPageChange, sort, onSortChange }`.

### ExportButton
- Opis: Pobranie CSV z uwzględnieniem aktualnych filtrów.
- Główne elementy: button, spinner przy generowaniu.
- Interakcje: klik → zmiana `window.location` na URL eksportu z parametrami.
- Walidacja: n/d.
- Typy: n/d.
- Propsy: `{ href: string, disabled?: boolean }`.

## 5. Typy
Nowe DTO (opis kształtu danych) wykorzystywane po stronie frontendu admina:

- AdminMetricsDto
  - total_users: number
  - new_users: { today: number; last_7_days: number; last_30_days: number }
  - retention_7d_percent: number
  - retention_30d_percent: number
  - pct_users_with_min_10_movies: number
  - pct_users_used_ai: number
  - pct_users_added_ai_movies: number
  - avg_movies_per_user: number
  - retention_timeseries?: RetentionPoint[]
  - new_users_timeseries?: UsersGrowthPoint[]
  - last_updated_at: string (ISO)

- RetentionPoint
  - date: string (ISO)
  - retention_7d: number (0–100)
  - retention_30d: number (0–100)

- UsersGrowthPoint
  - date: string (ISO)
  - count: number (≥0)

- TopMoviesQuery
  - type: 'watchlist' | 'watched'
  - range: '7d' | '30d' | 'all'

- TopMoviesItemDto
  - tconst: string
  - primary_title: string
  - start_year: number | null
  - count: number

- TopMoviesDto
  - type: TopMoviesQuery['type']
  - range: TopMoviesQuery['range']
  - items: TopMoviesItemDto[] (max 10)

- ErrorLogsQuery
  - api_type?: ('watchmode' | 'tmdb' | 'gemini')[]
  - date_from?: string (ISO)
  - date_to?: string (ISO)
  - user_id?: string
  - page?: number (default 1)
  - page_size?: 50 (stała)
  - sort?: 'occurred_at' | '-occurred_at' (default '-occurred_at')

- ErrorLogItemDto
  - id: number
  - occurred_at: string (ISO datetime)
  - api_type: 'watchmode' | 'tmdb' | 'gemini'
  - error_message: string
  - user_id: string | null

- PaginatedErrorLogsDto
  - items: ErrorLogItemDto[]
  - page: number
  - page_size: number
  - total: number
  - total_pages: number

- MetricCardVM
  - label: string
  - value: string | number
  - hint?: string
  - tooltip?: string
  - icon?: string

Uwaga: DTO nie są częścią publicznego REST API. Dane dostarcza warstwa widoków admina po stronie Django.

## 6. Zarządzanie stanem
- Strategia: lokalny stan filtrów w sekcjach + proste fetch + cache w pamięci (lub `TanStack Query` jeśli osadzimy mini-React).
- Klucze zapytań (jeśli Query):
  - `['admin-metrics']` – staleTime: 10 min (dane aktualizowane 1x/dzień), refetchOnWindowFocus: false
  - `['admin-top-movies', type, range]` – staleTime: 2 min
  - `['admin-error-logs', filters]` – staleTime: 30 s
- Debounce zmian filtrów: 300 ms.

## 7. Integracja API
Niepubliczne endpointy w obrębie admina (wymagane uprawnienia staff). Kontrakty:

- GET `/admin/analytics/api/metrics/`
  - 200: `AdminMetricsDto`
  - 403: brak uprawnień

- GET `/admin/analytics/api/top-movies/?type=watchlist&range=7d`
  - 200: `TopMoviesDto`
  - 400: nieprawidłowe parametry (`type`, `range`)
  - 403: brak uprawnień

- GET `/admin/analytics/api/error-logs/?api_type=tmdb&api_type=gemini&date_from=2025-10-01&date_to=2025-10-27&user_id=123&page=1&sort=-occurred_at`
  - 200: `PaginatedErrorLogsDto`
  - 400: nieprawidłowe parametry
  - 403: brak uprawnień

- GET `/admin/analytics/api/top-movies/export.csv?...` i `/admin/analytics/api/error-logs/export.csv?...`
  - 200: `text/csv` z nagłówkiem Content-Disposition

Walidacja w UI:
- `type` ∈ {watchlist, watched}
- `range` ∈ {7d, 30d, all}
- `api_type` ∈ {watchmode, tmdb, gemini}
- `page` ≥ 1, `page_size` = 50
- `sort` ∈ {occurred_at, -occurred_at}

## 8. Interakcje użytkownika
- Zmiana filtrów w TopMovies (type/range) → natychmiastowy refetch i odświeżenie tabeli; eksport uwzględnia bieżące filtry.
- Zmiana filtrów w ErrorLogs (api_type/date/user_id) → refetch; Reset przywraca domyślne; paginacja i sort po dacie.
- Hover na kartach i punktach wykresu → tooltip.
- Puste dane → komunikat pustego stanu (np. „Brak danych dla wybranego zakresu”).

## 9. Warunki i walidacja
- Uprawnienia: strona i API dostępne wyłącznie dla `is_staff` (guard backend; frontend wyświetla komunikat przy 403).
- Parametry filtrów: walidowane w UI (lista dozwolonych wartości) i w backendzie (źródło prawdy).
- Paginacja: `page` od 1; `page_size` stałe 50.
- Format dat: ISO (YYYY-MM-DD lub YYYY-MM-DDTHH:mm:ssZ). UI waliduje zgodność formatu i kolejność `date_from ≤ date_to`.

## 10. Obsługa błędów
- 403: Baner „Brak uprawnień do przeglądania tej sekcji”.
- 400: Toast „Nieprawidłowe parametry filtrów”; UI podświetla niepoprawne pola.
- 5xx/sieć: Sekcje pokazują stan błędu z przyciskiem „Spróbuj ponownie”.
- Puste dane: Placeholdery i „—” w kartach; wykresy ukryte z informacją.
- Eksport CSV: przy błędzie – toast; blokada przycisku podczas generowania.

## 11. Kroki implementacji
1. Backend (routing admin): dodać podstronę `admin/analytics/dashboard/` i endpointy JSON (metrics, top-movies, error-logs) z `@staff_member_required`.
2. Backend (agregacje): przygotować zapytania do metryk (cohort/retention, wzrost, średnie, procenty), sort malejący dla top-movies, paginacja 50 dla error-logs, walidacja parametrów.
3. Backend (export): dodać eksport CSV dla top-movies i error-logs, respektujący aktywne filtry i sort.
4. Frontend (template): utworzyć `admin/analytics_dashboard.html` z kontenerami sekcji i dołączyć Chart.js (CDN) + mały skrypt JS.
5. Frontend (UI): zaimplementować komponenty sekcji (HTML + klasy CSS admina), tabele i przyciski eksportu.
6. Frontend (dane): dodać fetchery do endpointów i mapowanie DTO → ViewModeli kart i serii wykresów; obsłużyć stany ładowania/błędów.
7. Frontend (walidacja): weryfikacja wejść filtrów (typy, zakresy, daty, user_id), kontrola błędnych wartości, debounce 300 ms.
8. UX/A11y: dodać tooltipy, aria-labels, focus states, responsywną siatkę.
9. QA: sprawdzić kryteria US-033/US-034/US-035: dostępność URL, role, metryki i wykresy, top 10 z przełączaniem i eksportem, logi z filtrami, sortem, paginacją i eksportem.
10. Dokumentacja: opisać parametry filtrów, format CSV, harmonogram aktualizacji danych (codziennie o północy).
