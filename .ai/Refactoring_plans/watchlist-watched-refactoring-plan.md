# Refaktoryzacja widoków Watchlist & Watched

## 1. Cel i zakres
- Ujednolicić layout, belkę sterującą i zachowanie `/app/watchlist` oraz `/app/watched`.
- Zredukować duplikację kodu (search, przełączniki widoku, sort, styl kontenera).
- Ułatwić rozbudowę (dodawanie filtrów, nowych akcji) poprzez wspólne komponenty.

## 2. Wysokopoziomowa architektura
1. **Shared layout** – nowy komponent np. `MediaLibraryLayout` osadzony w `src/components/library/`:
   - odpowiedzialny za nagłówek sekcji (tytuł, opis, zakładki),
   - renderuje górną belkę z wyszukiwarką, przyciskami, filtrami (przekazywanymi przez propsy),
   - zawiera slot na listę kart/wierszy.
2. **Reusable toolbar** – opcjonalnie wyodrębnić `MediaToolbar` przyjmujący konfigurację (czy pokazać przycisk AI, sorty, badge „Wyświetlane”).
3. **Strony**:
   - `WatchlistPage` → dostarcza dane watchlisty, akcje (mark/delete/suggest) oraz konfigurację layoutu.
   - `WatchedPage` → korzysta z tych samych komponentów, ale dostarcza dane obejrzonych i akcję „restore”.
4. **Stan wspólny** – komponent layoutu powinien przyjmować obiekt z callbackami wyszukiwarki (`onAddToWatchlist`, `onAddToWatched`), listą istniejących tconsts oraz kontrolkami sort/filter.

## 3. Kroki implementacyjne
1. **Przegląd bieżących różnic**
   - Zanotować wszystkie kontrolki obecne na watchliście (AI, sorty, filtry, licznik) i na watched.
   - Określić które elementy są specyficzne (np. przycisk „Zasugeruj filmy” tylko na watchlist).
2. **Stworzyć kontener layoutu**
   - Nowy komponent `MediaLibraryLayout` z propsami: `title`, `subtitle`, `tabs`, `toolbar`, `children`.
   - Tabs: tab aktywny + callback `onNavigate`.
3. **Wspólna belka sterująca**
   - Wyodrębnić logikę z `WatchlistControlsBar` i `WatchedToolbar` do `MediaToolbar`.
   - `MediaToolbar` powinien przyjmować sloty/konfigurację: search (`showSearch`, `searchProps`), dodatkowe przyciski (np. `extraActions`), sort (`sortOptions`), filtry (`filterControls`).
4. **Modyfikacja SearchCombobox**
   - Nic do zmiany poza upewnieniem się, że propsy są opcjonalne (już działa w obu kontekstach).
5. **Adaptacja WatchlistPage**
   - Zamienić sekcję kontrolną na `MediaLibraryLayout`.
   - W propsach layoutu przekazać: tytuł „Moja lista filmów”, tabsy, toolbar (wyszukiwarka + `SuggestAIButton` + filtry watchlist).
6. **Adaptacja WatchedPage**
   - Zamiast `WatchedToolbar` użyć `MediaToolbar` w tym samym layoutcie.
   - Skonfigurować wyszukiwarkę i sort; brak przycisku AI → `extraActions` puste.
7. **Styling konsolidacja**
   - Upewnić się, że kontenery (`bg-card`, `border`, spacing) są identyczne – przenieść te klasy do layoutu.
8. **Usunięcie starych komponentów**
   - Jeśli `WatchlistControlsBar` i `WatchedToolbar` nie są już używane, zastąpić je nowymi odpowiednikami lub pozostawić jako wrappery reużywające layout.
9. **Aktualizacja testów**
   - Uaktualnić istniejące testy snapshot/interaction dla toolbaru i wyszukiwarki.
   - Dodać test integracyjny sprawdzający, że `MediaToolbar` renderuje przekazane akcje.
10. **Manualna weryfikacja**
    - `/app/watchlist`: wyszukiwarka, sugestie, filtry, licznik.
    - `/app/watched`: wyszukiwarka działa identycznie, brak ramki, wygląd jak watchlista.

## 4. Ryzyka i uwagi
- Upewnić się, że logika preferencji (sessionStorage) pozostaje niezależna – layout nie powinien kontrolować stanu sortowania.
- Zachować istniejące akcje toastów (przywracanie, dodawanie) – layout nie może ich dublować.
- Dbać o responsywność – wcześniej belki miały inne układy (kolumna vs wiersz); layout musi reagować na `flex-col lg:flex-row`.
- Sprawdzić, czy `SuggestAIButton` nie wymaga dodatkowej logiki (wyłączenie gdy rate limit) – w toolbarze najlepiej przekazać gotowy komponent jako slot.

## 5. Plan testów/regresji
- `npm test` – upewnić się, że testy SearchCombobox i akcje watchlist/watched przechodzą.
- Manualne scenariusze:
  - Dodawanie kilku filmów z dropdownu na obu widokach.
  - Przywracanie filmu z watched do watchlist.
  - Sprawdzenie, że preferencje sortowania oraz przełączniki widoku nadal działają.
  - Test w trybie jasnym i ciemnym (dropdown tła).

## 6. Materiały referencyjne
- `src/pages/WatchlistPage.tsx`, `src/pages/WatchedPage.tsx`
- `src/components/watchlist/WatchlistControlsBar.tsx`
- `src/components/watched/WatchedToolbar.tsx`
- `src/components/watchlist/SearchCombobox.tsx`


