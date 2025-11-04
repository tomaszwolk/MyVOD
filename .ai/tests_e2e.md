# Plan Testów End-to-End (E2E) dla Aplikacji myVOD

---

## **1. Wprowadzenie**

Niniejszy dokument szczegółowo opisuje kluczowe scenariusze testowe End-to-End (E2E) dla aplikacji myVOD. Celem jest zapewnienie, że najważniejsze ścieżki użytkownika działają poprawnie w zintegrowanym środowisku, od interfejsu graficznego (frontend) po logikę biznesową i bazę danych (backend).

### **Wytyczne Implementacyjne**

#### **1.1. Atrybuty `data-testid`**

Wszystkie interaktywne elementy kluczowe dla testów E2E **muszą** posiadać atrybut `data-testid`. Umożliwi to tworzenie stabilnych i odpornych na zmiany w kodzie selektorów.

**Zasady:**
-   **Nazewnictwo:** Używaj semantycznych, zrozumiałych nazw w formacie `kebab-case`, np. `login-email-input`, `add-to-watchlist-button`.
-   **Umiejscowienie:** Atrybuty `data-testid` powinny być dodawane **wewnątrz definicji komponentu**, a nie na jego wywołaniu.

**Przykład:**

```jsx
// Źle - atrybut na zewnątrz komponentu
// Layout.tsx
<Topbar client:load data-testid="topbar" />

// Dobrze - atrybut wewnątrz komponentu
// Topbar.tsx
return (
  <header data-testid="topbar">
   ...
  </header>
)
```

#### **1.2. Wzorzec Page Object Model (POM)**

Aby zapewnić czytelność i łatwość utrzymania testów, należy stosować wzorzec Page Object Model (POM). Dla każdej strony lub skomplikowanego, reużywalnego komponentu należy utworzyć dedykowaną klasę w folderze `tests/e2e/page-objects`.

**Sugerowane klasy POM:**
-   `RegisterPage`
-   `LoginPage`
-   `OnboardingPage`
-   `WatchlistPage`
-   `ProfilePage`
-   `HeaderComponent` (dla nawigacji i wyszukiwarki)

### **1.3. Zarządzanie Stanem Bazy Danych i Konfiguracja**

**Kluczowe jest zapewnienie izolacji i spójności danych testowych.**

-   **Konfiguracja Bazy Testowej:** Wszystkie testy E2E muszą być uruchamiane na dedykowanej, testowej bazie danych Supabase. Należy upewnić się, że konfiguracja połączenia (np. `DATABASE_URL`) jest wczytywana z pliku `.env.tests`, aby uniknąć przypadkowego działania na danych produkcyjnych.

-   **Czyszczenie Danych po Testach:** Po zakończeniu całej suity testowej, baza danych musi zostać przywrócona do stanu początkowego. Należy zaimplementować globalny mechanizm `teardown` (określony jako `@E2E_teardown`), który usunie wszystkie dane utworzone podczas testów (użytkowników, watchlisty itp.).

### **1.4. Optymalizacja Logowania (Opcjonalne)**

W celu przyspieszenia wykonania testów E2E, można zaimplementować mechanizm jednorazowego logowania i ponownego wykorzystywania sesji. Zamiast logować się na początku każdego pliku testowego, można skorzystać z globalnego pliku `setup` w Playwright.

**Koncepcja (zgodnie z `@E2E_Auth`):**
1.  **Globalny Setup:** Tworzony jest dedykowany plik (np. `tests/e2e/setup/auth.setup.ts`), który uruchamia się raz przed wszystkimi testami.
2.  **Logowanie i Zapis Stanu:** W tym pliku skrypt loguje użytkownika testowego, a następnie zapisuje stan jego sesji (ciasteczka, local storage) do pliku JSON za pomocą `page.context().storageState()`.
3.  **Ponowne Użycie Stanu:** W pliku `playwright.config.ts` testy są konfigurowane tak, aby przed uruchomieniem wczytywały zapisany stan sesji z pliku JSON (`use: { storageState: '...' }`).

**Korzyści:**
-   **Znaczące przyspieszenie:** Eliminuje powtarzające się kroki logowania przed każdą suitą testową.
-   **Większa stabilność:** Zmniejsza ryzyko błędów związanych z procesem logowania, które mogłyby przerywać testy.

---

## **2. Scenariusze Testowe**

### **Scenariusz 1: Pełny cykl nowego użytkownika (Rejestracja, Onboarding, Pierwsze użycie)**

**Cel:** Weryfikacja, czy nowy użytkownik może bezproblemowo założyć konto, skonfigurować je i zobaczyć spersonalizowaną watchlistę.

| Krok | Akcja Użytkownika | Kluczowe Elementy i Wymagane `data-testid` | Sugerowana Klasa POM |
| :-- | :--- | :--- | :--- |
| 1.1 | Nawigacja do strony rejestracji i wypełnienie formularza. | - Link/przycisk do rejestracji: `navigate-to-register-button`<br>- Pole email: `register-email-input`<br>- Pole hasła: `register-password-input`<br>- Pole powtórzenia hasła: `register-confirm-password-input`<br>- Przycisk "Zarejestruj": `register-submit-button` | `RegisterPage` |
| 1.2 | Logowanie po rejestracji. | - Pole email: `login-email-input`<br>- Pole hasła: `login-password-input`<br>- Przycisk "Zaloguj": `login-submit-button` | `LoginPage` |
| 1.3 | Krok 1 Onboardingu: Wybór platform VOD. | - Kontener kroku 1: `onboarding-step-1`<br>- Siatka platform: `platform-selection-grid`<br>- Checkbox dla Netflix: `platform-checkbox-netflix`<br>- Przycisk "Dalej": `onboarding-next-button` | `OnboardingPage` |
| 1.4 | Krok 2 Onboardingu: Dodanie 3 filmów do watchlisty. | - Kontener kroku 2: `onboarding-step-2`<br>- Wyszukiwarka: `movie-search-combobox`<br>- Lista wyników: `search-results-list`<br>- Licznik dodanych filmów: `added-movies-counter`<br>- Przycisk "Dalej": `onboarding-next-button` | `OnboardingPage` |
| 1.5 | Krok 3 Onboardingu: Oznaczenie 3 obejrzanych filmów. | - Kontener kroku 3: `onboarding-step-3`<br>- Wyszukiwarka: `watched-search-combobox`<br>- Przycisk "Zakończ": `onboarding-finish-button` | `OnboardingPage` |
| 1.6 | Weryfikacja stanu aplikacji po onboardingu. | - Siatka watchlisty: `watchlist-grid`<br>- Kafelki filmów (każdy): `movie-card-<movie-id>`<br>- Ikony dostępności VOD na kafelku: `streaming-provider-icon-netflix` | `WatchlistPage` |

---

### **Scenariusz 2: Podstawowy cykl życia filmu (Wyszukiwanie, Dodawanie, Oznaczanie, Usuwanie)**

**Cel:** Weryfikacja kluczowej pętli zaangażowania: od znalezienia filmu, przez zarządzanie nim na listach, aż po usunięcie.

| Krok | Akcja Użytkownika | Kluczowe Elementy i Wymagane `data-testid` | Sugerowana Klasa POM |
| :-- | :--- | :--- | :--- |
| 2.1 | Wyszukanie i wybranie filmu. | - Wyszukiwarka w nagłówku: `header-movie-search`<br>- Wynik na liście autouzupełniania: `search-result-item-<movie-id>` | `HeaderComponent` |
| 2.2 | Weryfikacja dodania filmu i oznaczenie jako obejrzany. | - Toast/Snackbar z potwierdzeniem: `toast-notification`<br>- Kafelek filmu na watchliście: `movie-card-<movie-id>`<br>- Przycisk/Checkbox "Obejrzane": `mark-as-watched-button` | `WatchlistPage` |
| 2.3 | Nawigacja do listy obejrzanych i weryfikacja. | - Link/przycisk nawigacji: `navigation-watched-link`<br>- Siatka obejrzanych filmów: `watched-grid`<br>- Kafelek filmu: `watched-movie-card-<movie-id>` | `HeaderComponent`, `WatchedPage` |
| 2.4 | Przywrócenie filmu do watchlisty. | - Przycisk "Przywróć do watchlisty": `restore-to-watchlist-button` | `WatchedPage` |
| 2.5 | Usunięcie filmu z watchlisty. | - Przycisk "Usuń": `delete-movie-button`<br>- Okno dialogowe potwierdzenia: `confirm-delete-dialog`<br>- Przycisk potwierdzający usunięcie: `confirm-delete-button` | `WatchlistPage` |

---

### **Scenariusz 3: Generowanie i wykorzystanie sugestii AI**

**Cel:** Weryfikacja, czy funkcja sugestii AI działa poprawnie i czy użytkownik może z niej skorzystać.

| Krok | Akcja Użytkownika | Kluczowe Elementy i Wymagane `data-testid` | Sugerowana Klasa POM |
| :-- | :--- | :--- | :--- |
| 3.1 | Inicjacja generowania sugestii. | - Przycisk "Zasugeruj filmy": `get-ai-suggestions-button` | `WatchlistPage` |
| 3.2 | Interakcja z oknem sugestii. | - Okno modalne/dialog z sugestiami: `ai-suggestions-dialog`<br>- Karta sugestii: `suggestion-card-<movie-id>`<br>- Przycisk "Dodaj do watchlisty": `add-suggestion-to-watchlist-button` | `AISuggestionsDialog` (jako komponent) |
| 3.3 | Weryfikacja dodania filmu do watchlisty. | - Sprawdzenie, czy nowy film (`movie-card-<suggested-movie-id>`) pojawił się na `watchlist-grid`. | `WatchlistPage` |
| 3.4 | Weryfikacja działania limitu. | - Przycisk "Zasugeruj filmy" (ponowne kliknięcie): `get-ai-suggestions-button`<br>- Sprawdzenie, czy przycisk jest nieaktywny (`disabled`) lub czy pojawia się komunikat o limicie. | `WatchlistPage` |

---

### **Scenariusz 4: Zarządzanie profilem i usuwanie konta (zgodność z RODO)**

**Cel:** Weryfikacja, czy użytkownik może zarządzać swoimi danymi oraz trwale usunąć konto.

| Krok | Akcja Użytkownika | Kluczowe Elementy i Wymagane `data-testid` | Sugerowana Klasa POM |
| :-- | :--- | :--- | :--- |
| 4.1 | Nawigacja i zmiana platform VOD w profilu. | - Link/przycisk nawigacji do profilu: `navigation-profile-link`<br>- Grupa checkboxów platform: `platform-preferences-card`<br>- Przycisk "Zapisz zmiany": `save-profile-changes-button` | `HeaderComponent`, `ProfilePage` |
| 4.2 | Weryfikacja zmian na watchliście. | - Powrót na watchlistę i sprawdzenie, czy ikony `streaming-provider-icon-*` na kafelkach filmów (`movie-card-*`) uległy zmianie. | `WatchlistPage` |
| 4.3 | Inicjacja i potwierdzenie usunięcia konta. | - Sekcja "Danger Zone": `danger-zone-card`<br>- Przycisk "Usuń konto": `delete-account-button`<br>- Okno dialogowe: `confirm-delete-account-dialog`<br>- Przycisk potwierdzający usunięcie: `confirm-delete-account-button` | `ProfilePage` |
| 4.4 | Weryfikacja wylogowania i braku dostępu. | - Sprawdzenie przekierowania na stronę logowania.<br>- Próba ponownego zalogowania z danymi usuniętego konta i weryfikacja błędu. | `LoginPage` |
