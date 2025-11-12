# Zmiany i Ulepszenia w Onboardingu

Ten dokument podsumowuje zmiany wprowadzone w interfejsie użytkownika i logice przepływu onboardingu, mające na celu poprawę spójności, estetyki i użyteczności.

## Wprowadzone zmiany

### 1. Globalne Style Toastów (Powiadomień)
- **Problem**: Powiadomienia (toasty) miały przezroczyste tło, co utrudniało czytelność, zwłaszcza w trybie ciemnym.
- **Rozwiązanie**:
    - Style toastów zostały scentralizowane w komponencie `@/components/ui/sonner.tsx`.
    - Usunięto domyślne, narzucane przez bibliotekę `sonner` tła (`richColors`).
    - Zastosowano dedykowane, nieprzezroczyste tło (`bg-toast`) zdefiniowane globalnie w systemie designu.
    - Stworzono nowe zmienne CSS (`--toast-background`, `--toast-foreground`) w `index.css` oraz odpowiadające im klasy w `tailwind.config.js`, aby umożliwić globalne zarządzanie kolorami toastów w jednym miejscu.

### 2. Spójność Nawigacji
- **Problem**: Przyciski nawigacyjne w kolejnych krokach onboardingu różniły się tekstem ("Next" vs "Dalej") i stylem (domyślny vs `outline`).
- **Rozwiązanie**:
    - Ujednolicono tekst przycisku akcji na **"Dalej"** we wszystkich krokach.
    - Ujednolicono tekst przycisku pominięcia na **"Pomiń"**.
    - Zmieniono styl przycisku "Dalej" na wariant `"outline"`, aby wizualnie zrównać go z przyciskiem "Pomiń", co tworzy spójny i czysty interfejs.

### 3. Poprawa Układu i Odstępów
- **Problem**: Brakowało spójnych marginesów pomiędzy kluczowymi elementami interfejsu.
- **Rozwiązanie**:
    - Dodano margines górny nad nagłówkiem (`OnboardingHeader`) na stronie wyboru platform, aby oddzielić go od paska postępu.
    - Dodano margines górny nad paskiem wyszukiwania filmów na stronie dodawania do watchlisty.
    - Zapewniono spójny odstęp między siatką wyboru platform a dolnym paskiem nawigacyjnym.

### 4. Usunięcie Ikony Potwierdzenia
- **Problem**: Na liście oznaczonych jako obejrzane filmów pojawiała się zielona ikona "tick", która była zbędna i wprowadzała szum wizualny.
- **Rozwiązanie**: Zlokalizowano i usunięto renderowanie ikony `CheckCircle2` w komponencie `SelectedMoviesList.tsx`.

### 5. Tłumaczenia i Lokalizacja
- **Problem**: Niektóre nagłówki i podpowiedzi były w języku angielskim.
- **Rozwiązanie**: Przetłumaczono teksty na stronie `/onboarding/platforms` na język polski, aby zapewnić spójność językową całego procesu.

## Struktura Plików Onboardingu

Poniżej znajduje się opis kluczowych plików i komponentów odpowiedzialnych za działanie onboardingu.

- **Strony (Pages)**:
    - `pages/onboarding/OnboardingPlatformsPage.tsx`: Krok 1 - Wybór platform VOD.
    - `pages/onboarding/OnboardingAddPage.tsx`: Krok 2 - Dodawanie filmów do watchlisty.
    - `pages/onboarding/OnboardingWatchedPage.tsx`: Krok 3 - Oznaczanie filmów jako obejrzane.

- **Komponenty Reużywalne (Components)**:
    - `components/onboarding/OnboardingHeader.tsx`: Centralny nagłówek z tytułem i podpowiedzią, używany w każdym kroku.
    - `components/onboarding/ActionBar.tsx`: Pasek nawigacyjny dla pierwszego kroku (platformy).
    - `components/onboarding/OnboardingFooterNav.tsx`: Pasek nawigacyjny dla kroków 2 i 3.
    - `components/onboarding/PlatformsGrid.tsx`: Siatka do wyświetlania i wyboru platform.
    - `components/onboarding/platformIcons.tsx`: Centralny plik definiujący ikony SVG dla platform VOD jako komponenty React.
    - `components/onboarding/MovieSearchCombobox.tsx`: Wyszukiwarka filmów dla kroku 2.
    - `components/onboarding/WatchedSearchCombobox.tsx`: Wyszukiwarka filmów dla kroku 3.
    - `components/onboarding/AddedMoviesList.tsx`: Lista filmów dodanych do watchlisty (krok 2).
    - `components/onboarding/SelectedMoviesList.tsx`: Lista filmów oznaczonych jako obejrzane (krok 3).

- **Konfiguracja Globalna**:
    - `index.css`: Definicje globalnych zmiennych CSS dla kolorów (`--toast-background` itp.).
    - `tailwind.config.js`: Konfiguracja Tailwind CSS, mapująca zmienne CSS na klasy użytkowe (np. `bg-toast`).
    - `main.tsx`: Miejsce renderowania globalnego komponentu `<Toaster />`.
    - `components/ui/sonner.tsx`: Komponent-wrapper dla toastów, gdzie aplikowane są globalne style.
