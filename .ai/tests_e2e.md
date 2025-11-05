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

**Kluczowe jest zapewnienie izolacji i spójności danych testowych.** Poniższa procedura opisuje, jak skonfigurować dedykowaną, testową bazę danych na Supabase od zera.

#### **Krok 1: Utworzenie Bazy Testowej w Supabase**

1.  Zaloguj się na swoje konto [Supabase](https://app.supabase.com).
2.  Utwórz nowy, pusty projekt, który będzie przeznaczony wyłącznie do testów E2E.
3.  **Ważne:** W wersji darmowej Supabase nie oferuje łatwych backupów. Jeśli baza testowa ulegnie uszkodzeniu lub będzie wymagała "wyczyszczenia", najprostszą metodą jest jej usunięcie i stworzenie nowej.

#### **Krok 2: Konfiguracja Pliku `.env.tests`**

W katalogu `myVOD/frontend/myVOD/` znajduje się plik `.env.tests`, który przechowuje dane dostępowe do bazy testowej. Po utworzeniu nowego projektu w Supabase, należy go uzupełnić.

1.  W panelu Supabase przejdź do `Project Settings` (ikona zębatki) -> `Database`.
2.  W sekcji `Connection info` znajdziesz wszystkie potrzebne dane. Skopiuj je do pliku `.env.tests`.

**Struktura pliku `.env.tests`:**
```env
# Wartości należy umieścić w cudzysłowie
SUPABASE_DB_HOST="db.<ID-PROJEKTU>.supabase.co"
SUPABASE_DB_PORT="5432" # Używaj portu 5432 do bezpośredniego połączenia
SUPABASE_DB_USER="postgres.<ID-PROJEKTU>"
SUPABASE_DB_PASSWORD="<TWOJE-HASŁO-DO-BAZY>"
SUPABASE_DB_NAME="postgres"
```

#### **Krok 3: Wgranie Początkowego Schematu Bazy (Migracje Supabase)**

Projekt wykorzystuje natywne migracje SQL Supabase do zdefiniowania podstawowego schematu bazy danych. Pliki te znajdują się w `myVOD/supabase/migrations`. Muszą one zostać zastosowane na czystej bazie **przed** migracjami Django.

Masz dwie możliwości, aby to zrobić:

**Opcja A (Zalecana): Użycie Supabase CLI**
1.  Zainstaluj i skonfiguruj [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started).
2.  Z głównego katalogu projektu uruchom komendę, podając pełny connection string do Twojej nowej bazy testowej:
    ```bash
    supabase db push --db-url "postgresql://postgres.<ID>:[HASŁO]@db.<ID>.supabase.co:5432/postgres"
    ```

**Opcja B (Ręczna): Użycie SQL Editora**
1.  W panelu Supabase przejdź do `SQL Editor`.
2.  Otwórz każdy z trzech plików migracji z folderu `myVOD/supabase/migrations`.
3.  Skopiuj zawartość każdego pliku i wklej ją do edytora SQL, a następnie uruchom (`Run`).
4.  **Ważne:** Zachowaj odpowiednią kolejność, zgodną z datami w nazwach plików (od najstarszej do najnowszej).

#### **Krok 4: Synchronizacja Bazy z Django (Migracje Django)**

Gdy schemat bazy został już utworzony przez Supabase, musimy poinformować o tym Django, aby zsynchronizowało z nim swój wewnętrzny stan.

1.  **"Sfałszuj" pierwszą migrację:** Migracja `0001_initial.py` w aplikacji `movies` próbuje stworzyć tabele, które już istnieją. Użyjemy flagi `--fake`, aby Django jedynie "oznaczyło" ją jako wykonaną, bez próby jej uruchamiania.
    ```bash
    # Będąc w katalogu myVOD/frontend/myVOD/
    cd ../../backend/myVOD && npx dotenv-cli -e ../../frontend/myVOD/.env.tests -- python manage.py migrate movies 0001 --fake
    ```

2.  **Uruchom pozostałe migracje:** Po sfałszowaniu problematycznej migracji, uruchom standardową komendę, aby Django mogło zająć się resztą (np. tabelami dla aplikacji `auth`, `sessions` itd.).
    ```bash
    # Będąc w katalogu myVOD/backend/myVOD/
    npx dotenv-cli -e ../../frontend/myVOD/.env.tests -- python manage.py migrate
    ```
    *Dla ułatwienia, oba te kroki można zautomatyzować w jednym skrypcie w `package.json`.*

Po wykonaniu tych czterech kroków, Twoja baza testowa jest w pełni skonfigurowana i gotowa do pracy z Playwright.

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

## **3. Dodatkowe informacje**
Na potrzeby testu dodano do bazy danych użytkownika.
e-mail: test_user@example.com
hasło: Qwed4$5T56n.
- Watchlist
	- Glass Onion (tt11564570) - On Netflix
	- The Godfather (tt0068646) - Not available on streaming
	- Interstellar (tt0816692) - Not available on streaming
- Watched
	- The Dark Knight (tt0468569) - On HBO Max
	- All Quiet on the Western Front (tt1016150) - On Netflix
	- Schindler's List (tt0108052) - Not available on streaming