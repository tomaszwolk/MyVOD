# Podsumowanie Implementacji Testu E2E - Scenariusz 1
## Data: 2025-01-04

## Cel Testu
Implementacja testu end-to-end dla scenariusza 1: "Pełny cykl nowego użytkownika" obejmującego:
- Rejestrację nowego użytkownika
- Logowanie
- Onboarding (wybór platform, dodanie filmów, oznaczenie obejrzanych)
- Weryfikację watchlisty

## Wykonane Zadania

### ✅ Przygotowanie Środowiska
- **Konfiguracja Playwright**: Zaktualizowano `playwright.config.ts`:
  - Dodano uruchamianie backendu Django podczas testów
  - Zwiększono `actionTimeout` do 60 sekund dla wolnych operacji bazodanowych
- **Baza danych**: Użytkownik wykonał wgranie schematu i migracje

### ✅ Implementacja Page Object Model (POM)
**Lokalizacja**: `tests/e2e/page-objects/`

#### RegisterPage.ts
- Metody: `navigateToRegister()`, `fillRegistrationForm()`, `submitRegistration()`
- Obsługuje rejestrację użytkownika z walidacją formularza

#### LoginPage.ts
- Metody: `navigateToLogin()`, `fillLoginForm()`, `submitLogin()`
- Obsługuje logowanie z istniejącymi danymi

#### OnboardingPage.ts
- **selectPlatforms()**: Wybór platformy Netflix, przejście do następnego kroku
- **addMoviesToWatchlist()**: Wyszukiwanie i dodawanie filmów do watchlisty
- **markMoviesAsWatched()**: Wyszukiwanie i oznaczanie filmów jako obejrzane
- **completeOnboarding()**: Pełny flow onboardingu

#### WatchlistPage.ts
- **navigateToWatchlist()**: Nawigacja do strony watchlisty
- **verifyWatchlistGridVisible()**: Weryfikacja widoczności siatki filmów
- **verifyMovieCardPresent()**: Weryfikacja obecności konkretnego filmu
- **verifyStreamingProviderIconVisible()**: Weryfikacja ikon platform streamingowych

### ✅ Dodanie data-testid Atrybutów
**Zaktualizowane komponenty:**

#### Rejestracja/Logowanie:
- `RegisterForm.tsx`: `register-email-input`, `register-password-input`, `register-confirm-password-input`, `register-submit-button`
- `LoginForm.tsx`: `login-email-input`, `login-password-input`, `login-submit-button`

#### Onboarding:
- `OnboardingPlatformsPage.tsx`: `onboarding-step-1`
- `PlatformsGrid.tsx`: `platform-selection-grid`
- `PlatformCheckboxCard.tsx`: `platform-checkbox-${slug}`
- `ActionBar.tsx`: `onboarding-next-button`
- `OnboardingAddPage.tsx`: `onboarding-step-2`
- `MovieSearchCombobox.tsx`: `movie-search-combobox`
- `SearchResultsList.tsx`: `search-results-list`
- `AddedMoviesGrid.tsx`: `added-movies-counter`
- `OnboardingFooterNav.tsx`: `onboarding-next-button`, `onboarding-finish-button`
- `OnboardingWatchedPage.tsx`: `onboarding-step-3`
- `WatchedSearchCombobox.tsx`: `watched-search-combobox`

#### Watchlista:
- `MovieGrid.tsx`: `watchlist-grid`
- `MovieCard.tsx`: `movie-card-${tconst}`
- `AvailabilityIcons.tsx`: `streaming-provider-icon-${platform_slug}`

### ✅ Konfiguracja API Mocking
**Plik**: `tests/e2e/setup/api-mocks.ts`
- Mock tylko dla `onboarding/status` (wymusza przejście przez onboarding)
- Wszystkie inne operacje (rejestracja, wyszukiwanie filmów, dodawanie filmów) używają prawdziwego backendu

### ✅ Główny Test E2E
**Plik**: `tests/e2e/scenario-1-full-user-cycle.spec.ts`

**Flow testu:**
1. Czyszczenie localStorage między testami
2. Generowanie unikalnych danych testowych
3. Rejestracja użytkownika
4. Logowanie
5. Onboarding (3 kroki z wyszukiwaniem filmów)
6. Weryfikacja watchlisty
7. Cleanup (podstawowy)

## Napotkane Błędy i Próby Rozwiązania

### ❌ Błąd 1: localStorage SecurityError
```
SecurityError: Failed to read the 'localStorage' property from 'Window': Access is denied for this document
```

**Przyczyna**: `page.evaluate()` wywoływane przed pełnym załadowaniem strony
**Rozwiązanie**: Zmieniono na `page.addInitScript()` - wykona się przed ładowaniem strony

### ❌ Błąd 2: Użytkownik już istnieje w bazie
```
A user with this email already exists
```

**Przyczyna**: Unikalne emaile z poprzednich uruchomień testów pozostały w bazie testowej
**Rozwiązanie**: Zwiększono losowość w generowaniu emaili: `test-{timestamp}-{random}@example.com`

### ❌ Błąd 3: Element disabled w wynikach wyszukiwania
```
element is not enabled - waiting for element to be visible, enabled and stable
```

**Przyczyna**: Pierwszy wynik wyszukiwania był disabled (już dodany lub niedostępny)
**Rozwiązanie**:
- Zmieniono selektor na szukanie pierwszego włączonego elementu: `li:not([aria-disabled="true"])`
- Dodano dłuższe timeouty dla wolnych operacji bazodanowych

### ❌ Błąd 4: Timeout przekracza limit Playwright
```
Test timeout of 30000ms exceeded despite setting 60000
```

**Przyczyna**: Timeout w `waitFor()` nie może przekraczać globalnego `actionTimeout`
**Rozwiązanie**: Dodano `actionTimeout: 60000` do `playwright.config.ts`

## Aktualny Stan

### ✅ Działa:
- Rejestracja i logowanie (unikalne dane na każde uruchomienie)
- Onboarding krok 1: wybór platform i przejście dalej
- Onboarding krok 2: wyszukanie i dodanie pełnej trójki filmów (`Glass Onion`, `The Godfather`, `Inception`) z obsługą wielu wyników i zduplikowanych pozycji
- Onboarding krok 3: wyszukanie i oznaczenie trzech filmów jako obejrzane (`The Dark Knight`, `All Quiet on the Western Front`, `Schindler's List`) poprzez kliknięcie przycisków "Oznacz … jako obejrzany"
- Wejście na `watchlist` po zakończeniu onboardingu oraz weryfikacja obecności kafelków filmów

### ❌ Nie działa (bieżące blokery):
- Weryfikacja ikon dostępności (`streaming-provider-icon-netflix`) – brak wgranych ikon/danych o dostępności powoduje renderowanie jedynie badge "Dostępność nieznana"

## Podejrzane Problemy

### 1. **Dane o dostępności platform**
- Brak ikon platform/rekordów dostępności w środowisku testowym (Supabase + assety) – komponent `AvailabilityIcons` renderuje badge fallback, więc test nie znajdzie `data-testid="streaming-provider-icon-netflix"`.
- Potrzebne jest wgranie ikon do `platformIcons` oraz danych dostępności (np. `movie_availability`) odpowiadających wybranej platformie.

### 2. **Stabilność czasu wyszukiwania**
- Operacje wyszukiwania nadal trwają ~15 s, ale są już obsługiwane przez wydłużone timeouty (60 s). Warto monitorować po wdrożeniu optymalizacji bazy, lecz nie blokuje to obecnie scenariusza.

## Pliki do Sprawdzania Jutro

### Test E2E:
- `tests/e2e/scenario-1-full-user-cycle.spec.ts`
- `tests/e2e/page-objects/`
- `tests/e2e/setup/api-mocks.ts`

### Konfiguracja:
- `playwright.config.ts` (actionTimeout: 60000)

### Komponenty z data-testid:
- Wszystkie pliki w `src/pages/auth/components/`
- Wszystkie pliki w `src/pages/onboarding/`
- Wszystkie pliki w `src/components/watchlist/`

## Następne Kroki

1. **Wgrać dane dostępności**: Uzupełnić środowisko testowe o rekordy dostępności i (opcjonalnie) ikonę dla `netflix`, aby `AvailabilityIcons` renderował `data-testid="streaming-provider-icon-netflix"`.
2. **(Opcjonalnie) Dodać fallback w teście**: Jeśli ikony nie będą dostępne od razu, można tymczasowo zaakceptować badge "Dostępność nieznana" w `WatchlistPage.verifyStreamingProviderIconVisible` (patrz sekcja niżej).
3. **Powtórzyć scenariusz**: Po wgraniu danych lub dodaniu fallbacku uruchomić ponownie `npm run test:e2e -- --grep "Scenariusz 1"` i zweryfikować pełny przepływ.

## Tymczasowe obejście (jeśli ikony nadal brakują)

- Można poluzować asercję w `WatchlistPage.verifyStreamingProviderIconVisible`, aby test akceptował badge fallback, a nie tylko ikony. Kod do wklejenia w razie potrzeby:

```ts
// tests/e2e/page-objects/WatchlistPage.ts
async verifyStreamingProviderIconVisible(platformSlug: string): Promise<void> {
  const icon = this.page.getByTestId(`streaming-provider-icon-${platformSlug}`);
  if (await icon.count()) {
    await icon.first().waitFor({ state: 'visible' });
    return;
  }

  await this.page.getByText('Dostępność nieznana').waitFor({ state: 'visible' });
}
```

- Po wgraniu ikon i danych fallback można wycofać, by test znów wymagał realnych wskaźników dostępności.

## Uwagi Techniczne

- Test używa prawdziwego backendu dla rejestracji/logowania/wyszukiwania
- Tylko onboarding status jest mockowany (wymusza pełny flow)
- Timeouty zwiększone dla wolnych operacji bazodanowych
- Unikalne dane testowe generowane automatycznie
- Cleanup localStorage między testami</contents>
</xai:function_call">Created file .ai/after_implementation/e2e_test1.md
