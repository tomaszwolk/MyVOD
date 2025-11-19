# Plan Refaktoryzacji Onboardingu

Data: 19.11.2025

## 1. Cel

Uproszczenie procesu onboardingu poprzez połączenie drugiego i trzeciego kroku w jeden, spójny widok. Zmiana ma na celu wykorzystanie zaktualizowanego API (`POST /api/user-movies/`), zmniejszenie złożoności kodu frontendowego oraz poprawę doświadczenia użytkownika (UX) poprzez skrócenie onboardingu i wprowadzenie go w mechaniki znane z docelowej aplikacji (strona `OnVODPage`).

## 2. Plan Działania

### Krok 1: Usunięcie zbędnych plików

Następujące pliki związane z krokiem `/onboarding/watched` zostaną usunięte, ponieważ ich funkcjonalność zostanie wchłonięta przez nowy, połączony komponent.

-   **Do usunięcia:**
    -   `myVOD/frontend/myVOD/src/pages/onboarding/OnboardingWatchedPage.tsx`
    -   `myVOD/frontend/myVOD/src/hooks/useOnboardingWatchedController.ts`
    -   `myVOD/frontend/myVOD/src/pages/onboarding/__tests__/OnboardingWatchedPage.test.tsx` (oraz inne powiązane testy)

### Krok 2: Modyfikacja drugiego kroku onboardingu

Plik `OnboardingAddPage.tsx` zostanie przekształcony w centralny punkt do zarządzania filmami w onboardingu.

-   **Plik do modyfikacji:** `myVOD/frontend/myVOD/src/pages/onboarding/OnboardingAddPage.tsx`
-   **Nowa nazwa pliku:** `myVOD/frontend/myVOD/src/pages/onboarding/OnboardingMoviesPage.tsx`

#### Szczegółowe zmiany w `OnboardingMoviesPage.tsx`:

1.  **Zmiana nazwy komponentu i eksportu:**
    -   `export function OnboardingAddPage()` -> `export function OnboardingMoviesPage()`

2.  **Aktualizacja UI i treści:**
    -   Zmienić `ProgressBar` z `<ProgressBar current={2} total={3} />` na `<ProgressBar current={2} total={2} />`.
    -   Zaktualizować `OnboardingHeader`:
        -   `title`: "Dodaj przynajmniej 3 filmy do watchlisty" -> "Dodaj lub oznacz filmy" (lub podobne).
        -   `hint`: "Większa ilość filmów poprawi rekomendacje" -> "Dodaj filmy do watchlisty, oznacz jako obejrzane lub oceń, abyśmy mogli lepiej dopasować rekomendacje."
    -   Zmienić tekst przycisku `onNext` w `OnboardingFooterNav` z "Dalej" na "Zakończ".

3.  **Implementacja logiki interakcji z filmem:**
    -   Wyszukiwarka `MovieSearchCombobox` pozostaje bez zmian, ale jej `onSelect` będzie musiał obsługiwać różne akcje.
    -   **Kluczowa zmiana:** Komponent `SearchResultItem.tsx` (używany wewnątrz `MovieSearchCombobox`) musi zostać zmodyfikowany lub zastąpiony. Zamiast jednego przycisku "Dodaj", powinien renderować zestaw trzech kontrolek, tak jak na `OnVODPage`:
        -   Przycisk "Dodaj do watchlisty" (ikona zakładki).
        -   Przycisk "Oznacz jako obejrzany" (ikona oka/ptaszka).
        -   Komponent `MovieRating` do oceniania.
    -   *Alternatywa:* Można stworzyć nowy komponent `OnboardingSearchResultItem.tsx` z tą logiką, aby nie naruszać istniejącego, jeśli jest używany gdzie indziej.

4.  **Zarządzanie stanem i API:**
    -   Usunąć obecną logikę `handleAddMovie`.
    -   Zaimportować i wykorzystać istniejące hooki, które już obsługują nowe API:
        -   `useAddUserMovie`: Do dodawania na watchlistę i oznaczania jako obejrzany.
        -   `useRateMovie`: Do oceniania filmów.
    -   Stan `added` i `addedSet` musi teraz przechowywać nie tylko `tconst`, ale także informację o wykonanej akcji (np. `status: 'watchlisted' | 'watched'`), aby poprawnie renderować listę dodanych filmów.
        ```typescript
        interface AddedMovieVM {
          // ...istniejące pola
          status: 'watchlisted' | 'watched';
          userRating?: number | null;
        }
        ```

5.  **Aktualizacja listy dodanych filmów:**
    -   Komponent `AddedMoviesList` i jego element `MovieListItem` muszą zostać zaktualizowane, aby wyświetlać status filmu (np. "Na watchliście", "Obejrzany", "Oceniony: 8/10"). Można to zrealizować za pomocą małej etykiety lub ikony przy każdym filmie.

6.  **Logika nawigacji:**
    -   Funkcja `handleNext` (teraz `handleFinish`) powinna finalizować onboarding (ustawić flagę w `localStorage`) i nawigować do strony głównej, np. `/app/onvod`.
    -   Funkcja `handleSkip` również finalizuje onboarding.

### Krok 3: Aktualizacja routingu

-   **Plik do modyfikacji:** `myVOD/frontend/myVOD/src/router.tsx`

1.  **Usunąć importy:**
    -   Usunąć `OnboardingWatchedPage` z listy importów.
2.  **Usunąć ścieżkę:**
    -   Całkowicie usunąć obiekt `path: "watched"` z sekcji `onboarding`.
3.  **Zaktualizować ścieżkę:**
    -   Zmienić `path: "add"` na `path: "movies"`.
    -   Zmienić `element: <OnboardingAddPage />` na `element: <OnboardingMoviesPage />`.
4.  **Poprawić nawigację z poprzedniego kroku:**
    -   W pliku `myVOD/frontend/myVOD/src/pages/onboarding/OnboardingPlatformsPage.tsx`, zaktualizować `handleNext`, aby nawigował do `/onboarding/movies`.

### Krok 4: Refaktoryzacja komponentów współdzielonych

-   **Pliki do modyfikacji:**
    -   `myVOD/frontend/myVOD/src/components/onboarding/SearchResultItem.tsx`
    -   `myVOD/frontend/myVOD/src/components/onboarding/AddedMoviesList.tsx`
    -   `myVOD/frontend/myVOD/src/components/onboarding/MovieListItem.tsx`

1.  **`SearchResultItem.tsx`**: Jak wspomniano, ten komponent musi zostać rozbudowany, aby zawierał trzy akcje zamiast jednej.
2.  **`AddedMoviesList.tsx` / `MovieListItem.tsx`**: Muszą zostać dostosowane do wyświetlania statusu dodanego filmu.

## 3. Oczekiwany Rezultat

-   Liczba kroków onboardingu zredukowana z 3 do 2.
-   Kod jest znacznie prostszy, bardziej suchy (DRY) i łatwiejszy w utrzymaniu.
-   Nowy użytkownik od razu poznaje kluczowe funkcje aplikacji w spójnym interfejsie.
-   Cały proces jest bardziej wydajny dzięki mniejszej liczbie zapytań API.

### Krok 5: Aktualizacja testów

Po dokonaniu refaktoryzacji, następujące pliki testowe będą wymagały aktualizacji, aby odzwierciedlały zmiany w logice i komponentach:

-   `myVOD/frontend/myVOD/src/pages/onboarding/__tests__/OnboardingAddPage.test.tsx`
-   `myVOD/frontend/myVOD/src/pages/onboarding/__tests__/OnboardingAddPage.integration.test.tsx`
-   `myVOD/frontend/myVOD/src/pages/onboarding/__tests__/OnboardingPlatformsPage.test.tsx` (weryfikacja nawigacji)
-   `myVOD/frontend/myVOD/src/pages/onboarding/__tests__/OnboardingPlatformsPage.integration.test.tsx` (weryfikacja nawigacji)
-   `myVOD/frontend/myVOD/src/components/onboarding/__tests__/SelectedMoviesList.test.tsx`
-   `myVOD/frontend/myVOD/src/components/onboarding/__tests__/ProgressBar.test.tsx`
-   `myVOD/frontend/myVOD/src/components/onboarding/__tests__/MovieSearchCombobox.test.tsx`
-   `myVOD/frontend/myVOD/srcs/components/onboarding/__tests__/ActionBar.test.tsx`
-   `myVOD/frontend/myVOD/src/pages/onboarding/__tests__/OnboardingWatchedPage.test.tsx` (ten plik testowy zostanie usunięty wraz z komponentem)
