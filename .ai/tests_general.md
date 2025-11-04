Oczywiście, oto zaktualizowana wersja planu testów, uwzględniająca wprowadzone przez Ciebie zmiany.

### **Plan Testów dla Aplikacji myVOD (v2)**

---

#### **1. Wprowadzenie i Cele Testowania**

**1.1. Wprowadzenie**

Niniejszy dokument opisuje kompleksową strategię testowania dla aplikacji myVOD, która jest platformą do zarządzania listami filmów do obejrzenia (watchlist) oraz śledzenia dostępności tytułów na wybranych platformach VOD. Projekt składa się z backendu opartego na Django REST Framework oraz frontendu zbudowanego w React i TypeScript.

**1.2. Cele Testowania**

Głównym celem procesu testowania jest zapewnienie wysokiej jakości, stabilności, bezpieczeństwa i wydajności aplikacji przed jej wdrożeniem produkcyjnym.

Szczegółowe cele obejmują:
*   **Weryfikację funkcjonalną:** Potwierdzenie, że wszystkie funkcje aplikacji działają zgodnie z wymaganiami, w tym zarządzanie kontem użytkownika, obsługa watchlisty, wyszukiwanie filmów i generowanie rekomendacji AI.
*   **Zapewnienie bezpieczeństwa:** Identyfikacja i eliminacja podatności, w szczególności weryfikacja mechanizmów autoryzacji i ochrony danych użytkowników (testy IDOR).
*   **Ocenę wydajności:** Sprawdzenie, czy kluczowe operacje, takie jak wyszukiwanie i ładowanie list, wykonują się w akceptowalnym czasie.
*   **Weryfikację integracji:** Zapewnienie poprawnej komunikacji między frontendem, backendem oraz zewnętrznymi serwisami API (Watchmode, Google Gemini, TMDB).
*   **Zapewnienie użyteczności i spójności UI:** Sprawdzenie, czy interfejs użytkownika jest intuicyjny, responsywny i spójny wizualnie na różnych urządzeniach.

---

#### **2. Zakres Testów**

**2.1. Funkcjonalności objęte testami:**
*   Rejestracja i logowanie użytkowników.
*   Zarządzanie profilem użytkownika (wybór platform VOD, zmiana hasła, usunięcie konta).
*   Proces onboardingu nowego użytkownika.
*   Zarządzanie listą filmów "do obejrzenia" (Watchlista) - dodawanie, usuwanie, oznaczanie jako obejrzone.
*   Przeglądanie historii obejrzanych filmów.
*   Sortowanie i filtrowanie list filmów.
*   Wyszukiwanie filmów.
*   Generowanie i wyświetlanie sugestii AI.
*   Automatyczne odświeżanie sesji użytkownika (token refresh).
*   Panel administracyjny (analityki, logi błędów).
*   Zadania w tle (synchronizacja dostępności filmów).

**2.2. Funkcjonalności wyłączone z testów (dla MVP):**
*   **Testy End-to-End (E2E) z wykorzystaniem Playwright:** Zostaną zaimplementowane, jednak ich dokładny zakres zostanie zdefiniowany w późniejszym etapie projektu.
*   Zaawansowane testy obciążeniowe i stress testy na dużą skalę.
*   Testy kompatybilności na szerokiej gamie niszowych przeglądarek i systemów operacyjnych.

---

#### **3. Typy Testów do Przeprowadzenia**

Proces testowania zostanie podzielony na następujące typy:

*   **Testy jednostkowe (Unit Tests):**
    *   **Backend:** Testowanie pojedynczych funkcji w warstwie usług (`services`), logiki w serializerach, walidatorów oraz komend Django. Testy te będą izolowane od bazy danych i zewnętrznych API.
    *   **Frontend:** Testowanie logiki w customowych hookach (`hooks`), funkcji pomocniczych (`utils`), logiki mapowania (`mappers`) oraz walidacji schematów (Zod). Testy te będą uruchamiane w środowisku `jsdom`.

*   **Testy integracyjne (Integration Tests):**
    *   **Backend:** Testowanie pełnych przepływów na poziomie API. Każdy endpoint będzie testowany pod kątem logiki biznesowej, obsługi błędów, walidacji i autoryzacji. Testy będą operować na bazie danych w chmurze Supabase, uwzględniając specyfikę konfiguracji `managed=False`.
    *   **Frontend:** Testowanie komponentów i całych stron (`pages`) w celu weryfikacji poprawnej interakcji, zarządzania stanem i komunikacji z zamockowanym backendem.

*   **Manualne Testy E2E (Uproszczone):**
    *   Przeprowadzenie manualnych testów kluczowych ścieżek użytkownika (happy paths) w celu weryfikacji poprawnego działania całej aplikacji w zintegrowanym środowisku. Obejmuje to proces od rejestracji, przez onboarding, aż po korzystanie z głównych funkcji.

*   **Zautomatyzowane Testy E2E (Playwright):**
    *   Zautomatyzowane testy symulujące pełne ścieżki użytkownika w przeglądarce. Będą weryfikować kluczowe przepływy, takie jak rejestracja, onboarding i dodawanie filmu do watchlisty, od interfejsu użytkownika aż po bazę danych.
    *   **Szczegółowe scenariusze, wytyczne implementacyjne oraz lista wymaganych selektorów `data-testid` znajdują się w dedykowanym dokumencie: `.ai/tests_e2e.md`**.

*   **Testy bezpieczeństwa:**
    *   **IDOR (Insecure Direct Object Reference):** Weryfikacja, czy użytkownik A nie może uzyskać dostępu ani modyfikować danych użytkownika B poprzez manipulację identyfikatorami w URL-ach lub ciałach zapytań.
    *   **Walidacja danych wejściowych:** Sprawdzenie odporności na podstawowe ataki (np. poprzez wprowadzanie nieoczekiwanych danych w polach formularzy).
    *   **Zarządzanie sesją:** Testowanie mechanizmu odświeżania tokenów JWT, ich wygasania oraz procesu wylogowywania.

*   **Testy wydajności (Uproszczone):**
    *   Manualna ocena czasu odpowiedzi kluczowych endpointów (wyszukiwanie, listowanie filmów) przy użyciu narzędzi deweloperskich przeglądarki.
    *   Analiza zapytań SQL generowanych przez Django ORM (za pomocą `django-debug-toolbar` lub podobnych narzędzi) w celu identyfikacji problemu N+1.

*   **Testy użyteczności (Manualne):**
    *   Ocena intuicyjności interfejsu, spójności nawigacji oraz responsywności na różnych rozmiarach ekranu (desktop, tablet, mobile).

---

#### **4. Scenariusze Testowe dla Kluczowych Funkcjonalności**

Poniżej przedstawiono przykładowe scenariusze dla najważniejszych modułów.

**4.1. Rejestracja i Uwierzytelnianie**
*   **TC1.1:** Pomyślna rejestracja z poprawnymi danymi i przekierowanie na stronę logowania.
*   **TC1.2:** Próba rejestracji z adresem e-mail, który już istnieje w systemie.
*   **TC1.3:** Próba rejestracji z hasłem niespełniającym wymagań bezpieczeństwa.
*   **TC1.4:** Pomyślne logowanie z poprawnymi danymi i przekierowanie do aplikacji.
*   **TC1.5:** Próba logowania z niepoprawnym hasłem lub adresem e-mail.
*   **TC1.6 (Bezpieczeństwo):** Weryfikacja, że token JWT wygasa po określonym czasie, a mechanizm odświeżania tokenu działa poprawnie, przedłużając sesję bez konieczności ponownego logowania.
*   **TC1.7 (Bezpieczeństwo):** Weryfikacja, że po wylogowaniu tokeny są unieważniane (jeśli dotyczy) i dostęp do chronionych zasobów jest niemożliwy.

**4.2. Onboarding Użytkownika**
*   **TC2.1:** Przejście pełnej ścieżki onboardingu (wybór platform, dodanie 3 filmów, oznaczenie 3 obejrzanych) i poprawne przekierowanie do watchlisty.
*   **TC2.2:** Próba przejścia do kolejnego kroku bez spełnienia wymagań (np. bez wybrania platformy lub dodania 3 filmów).
*   **TC2.3:** Użycie przycisku "Pomiń" na każdym z kroków i poprawne przekierowanie.
*   **TC2.4:** Weryfikacja, że stan onboardingu (np. wybrane platformy) jest zapisywany po przejściu do kolejnego kroku.

**4.3. Zarządzanie Listą Filmów (Watchlista)**
*   **TC3.1:** Dodanie nowego filmu do watchlisty poprzez wyszukiwarkę.
*   **TC3.2:** Usunięcie filmu z watchlisty (soft delete).
*   **TC3.3:** Oznaczenie filmu z watchlisty jako obejrzany (przeniesienie na listę obejrzanych).
*   **TC3.4 (Integracja):** Poprawne działanie sortowania (po dacie dodania, ocenie, roku produkcji).
*   **TC3.5 (Integracja):** Poprawne działanie filtrowania (ukrywanie/pokazywanie filmów niedostępnych na platformach użytkownika).
*   **TC3.6 (Bezpieczeństwo/IDOR):** Próba usunięcia lub modyfikacji filmu z watchlisty innego użytkownika poprzez API.

**4.4. Sugestie AI**
*   **TC4.1:** Pomyślne wygenerowanie sugestii dla użytkownika, który ma filmy na watchliście.
*   **TC4.2:** Wyświetlenie komunikatu o braku wystarczających danych dla nowego użytkownika bez filmów.
*   **TC4.3:** Weryfikacja działania mechanizmu cache'owania (drugie zapytanie w tym samym dniu powinno zwrócić te same dane bez wywołania API Gemini).
*   **TC4.4 (Obsługa błędów):** Symulacja błędu po stronie API Gemini i weryfikacja, czy aplikacja obsługuje go poprawnie (np. wyświetlając stosowny komunikat).

---

#### **5. Środowisko Testowe**

*   **Backend:** Testy jednostkowe i integracyjne będą uruchamiane z lokalnej maszyny deweloperskiej, łącząc się z dedykowaną, chmurową bazą danych deweloperską/testową hostowaną na Supabase (PostgreSQL). Konfiguracja dostępu do bazy danych została przygotowana. Kluczowe jest zapewnienie izolacji i spójności danych testowych, co zostanie osiągnięte poprzez wykorzystanie dostarczonych skryptów SQL (`integration_error_log_test_data.sql`).
*   **Frontend:** Testy jednostkowe i komponentów będą uruchamiane w środowisku `jsdom` za pomocą Vitest. Testy manualne i zautomatyzowane E2E będą przeprowadzane na lokalnie uruchomionej aplikacji (backend + frontend).
*   **Przeglądarki:** Główne testy manualne oraz zautomatyzowane testy Playwright będą przeprowadzane na najnowszych wersjach silników Chromium, Firefox i WebKit. Testy responsywności będą wykonywane przy użyciu narzędzi deweloperskich w przeglądarce oraz emulatorów Playwright.

---

#### **6. Narzędzia do Testowania**

*   **Backend:**
    *   Framework testowy: `pytest` z `pytest-django`
    *   Klient API: `rest_framework.test.APITestCase`
    *   Mockowanie: `unittest.mock`
    *   Analiza pokrycia: `pytest-cov`
*   **Frontend:**
    *   Framework testowy: `Vitest`
    *   Biblioteka do testowania komponentów: `React Testing Library`
    *   Mockowanie API: `axios-mock-adapter`
    *   Analiza pokrycia: `Vitest Coverage`
*   **Testy E2E:**
    *   `Playwright` - do automatyzacji kluczowych scenariuszy w przeglądarce.
*   **CI/CD:**
    *   `GitHub Actions` do automatycznego uruchamiania linterów i testów przy każdym pushu i pull requeście.
*   **Narzędzia pomocnicze:**
    *   `curl`, `test-api.sh` i `Postman` do manualnego testowania API.
    *   Narzędzia deweloperskie przeglądarek do debugowania frontendu i analizy wydajności.

---

#### **7. Harmonogram Testów**

Testowanie będzie procesem ciągłym, zintegrowanym z cyklem rozwojowym.
*   **Testy jednostkowe i integracyjne:** Będą pisane równolegle z rozwojem nowych funkcjonalności.
*   **Testy regresji:** Pełen zestaw zautomatyzowanych testów będzie uruchamiany automatycznie przed każdym mergem do głównego brancha.
*   **Testy manualne E2E:** Będą przeprowadzane przed każdym planowanym wdrożeniem na produkcję oraz ad-hoc w trakcie rozwoju.
*   **Testy automatyczne E2E (Playwright):** Rozwój testów rozpocznie się od zdefiniowania kluczowych scenariuszy i będzie kontynuowany iteracyjnie.

---

#### **8. Kryteria Akceptacji Testów**

*   **Kryterium wejścia:** Kod został zmergowany do brancha deweloperskiego/stagingowego i aplikacja jest pomyślnie zbudowana i uruchomiona w środowisku testowym.
*   **Kryterium wyjścia (zakończenia testów):**
    *   100% zautomatyzowanych testów jednostkowych i integracyjnych przechodzi pomyślnie.
    *   Pokrycie kodu testami (backend) utrzymuje się na poziomie > 90%.
    *   Wszystkie zidentyfikowane błędy krytyczne i blokujące zostały naprawione i zweryfikowane.
    *   Kluczowe scenariusze E2E (zarówno manualne, jak i zautomatyzowane) zostały przetestowane i zakończyły się sukcesem.
    *   Dokumentacja testowa jest aktualna.

---

#### **9. Role i Odpowiedzialności w Procesie Testowania**

*   **Deweloperzy:**
    *   Odpowiedzialni za pisanie testów jednostkowych i integracyjnych dla tworzonych przez siebie funkcjonalności.
    *   Naprawianie błędów zgłoszonych w procesie testowania.
*   **Inżynier QA (ja):**
    *   Tworzenie i utrzymanie planu testów.
    *   Projektowanie i wykonywanie scenariuszy testowych (manualnych i automatycznych E2E).
    *   Zarządzanie procesem zgłaszania i śledzenia błędów.
    *   Weryfikacja naprawionych błędów.
    *   Ostateczna akceptacja jakości przed wdrożeniem.

---

#### **10. Procedury Raportowania Błędów**

*   **Narzędzie:** Błędy będą zgłaszane i śledzone za pomocą `GitHub Issues`.
*   **Format zgłoszenia:** Każde zgłoszenie błędu powinno zawierać:
    *   **Tytuł:** Zwięzły opis problemu.
    *   **Środowisko:** Wersja aplikacji, przeglądarka, system operacyjny.
    *   **Kroki do reprodukcji:** Szczegółowa, numerowana lista kroków prowadzących do wystąpienia błędu.
    *   **Obserwowany rezultat:** Co się stało.
    *   **Oczekiwany rezultat:** Co powinno się stać.
    *   **Dowody:** Zrzuty ekranu, nagrania wideo, logi z konsoli.
    *   **Priorytet:** (Krytyczny, Wysoki, Średni, Niski).