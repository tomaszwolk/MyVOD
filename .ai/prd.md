# Dokument wymagań produktu (PRD) - MyVOD

## 1. Przegląd produktu

MyVOD to aplikacja webowa wspierająca entuzjastów filmowych w zarządzaniu ich listą filmów do obejrzenia (watchlist) i odkrywaniu dostępności tych filmów na popularnych platformach VOD. Aplikacja rozwiązuje problem czasochłonnego przeszukiwania wielu platform streamingowych, umożliwiając użytkownikom szybkie sprawdzenie, które filmy z ich watchlisty są aktualnie dostępne na ich subskrypcjach.

Kluczowe funkcjonalności MVP:
- Zarządzanie osobistą watchlistą
- Wyszukiwanie filmów z rozbudowanym autocomplete
- Automatyczne sprawdzanie dostępności filmów na 5 głównych platformach VOD (Netflix, HBO Max, Disney+, Prime Video, Apple TV+)
- Oznaczanie filmów jako obejrzane z historią
- Personalizowane sugestie AI oparte na historii oglądania
- Prosty system kont z zarządzaniem preferencjami platform VOD

Grupy docelowe:
- Entuzjaści kina w wieku 25-40 lat poszukujący wysokiej jakości treści
- Nastolatkowie zainteresowani zarówno nowym kinem jak i klasykami
- Mężczyźni szukający filmów akcji, sci-fi oraz anime

Aplikacja jest przeznaczona wyłącznie na platformę webową w fazie MVP, z planami rozszerzenia na aplikacje mobilne w przyszłości.

## 2. Problem użytkownika

Główny problem:
Użytkownicy subskrybujący wiele platform VOD spędzają nadmiernie dużo czasu na przeszukiwaniu każdej platformy osobno, aby znaleźć interesujące ich filmy. To prowadzi do dwóch negatywnych skutków:
1. Frustracja i zmęczenie wyborem kończy się oglądaniem "bezpiecznych" rekomendacji sugerowanych przez algorytmy platform
2. Użytkownicy nie są świadomi, że filmy z ich watchlist (np. na IMDb.com) są już dostępne na ich subskrypcjach

Konsekwencje problemu:
- Marnowanie czasu na przeglądanie wielu platform
- Niewykorzystany potencjał subskrypcji VOD
- Brak centralnego miejsca do zarządzania watchlistą
- Trudność w śledzeniu, które filmy zostały już obejrzane
- Brak spersonalizowanych sugestii opartych na preferencjach użytkownika

Obecne rozwiązania alternatywne:
- Manualne przeszukiwanie każdej platformy osobno (czasochłonne)
- Korzystanie z watchlisty IMDb bez informacji o dostępności VOD (niepełne)
- Poleganie wyłącznie na rekomendacjach platform (ograniczone do jednej platformy)

MyVOD rozwiązuje te problemy poprzez:
- Centralizację watchlisty z widocznością dostępności na wszystkich platformach użytkownika
- Automatyczną aktualizację dostępności filmów
- Inteligentne sugestie AI uwzględniające preferencje i subskrypcje użytkownika
- Historię obejrzanych filmów dla lepszego śledzenia i rekomendacji

## 3. Wymagania funkcjonalne

### 3.1 Baza danych filmów (RF-001)

Opis: System przechowywania i zarządzania danymi filmów z IMDb

Szczegóły implementacji:
- Jednorazowy import danych z plików .tsv IMDb podczas setupu aplikacji
- Przechowywane pola: tconst (ID), primaryTitle, startYear, genres, averageRating, numVotes
- Filtrowanie tylko filmów (titleType = 'movie'), wykluczenie seriali
- Używanie wyłącznie tytułów oryginalnych (primaryTitle) bez lokalizacji
- Dokumentacja z przypomnieniem o aktualizacji bazy co 3 miesiące

Wymagania techniczne:
- Parsowanie formatu .tsv
- Walidacja danych podczas importu
- Indeksowanie dla szybkiego wyszukiwania

### 3.2 System autentykacji i kont użytkowników (RF-002)

Opis: Bezpieczny system rejestracji i logowania użytkowników

Funkcjonalności rejestracji:
- Rejestracja z wykorzystaniem adresu email i hasła
- Walidacja formatu email
- Wymagania dotyczące hasła (minimum 8 znaków, mix liter i cyfr)
- Haszowanie haseł PBKDF2 z salt (domyślne ustawienia Django)
- Pole email_verified w bazie (dla przyszłej implementacji weryfikacji)

Funkcjonalności logowania:
- Logowanie przez email i hasło
- Zarządzanie tokenami JWT (access i refresh tokens)
- Wylogowanie (usunięcie tokenów po stronie klienta)

Bezpieczeństwo:
- PBKDF2 (domyślne ustawienia Django) dla haszowania
- JSON Web Tokens (JWT) dla autentykacji API
- Ochrona przed atakami brute-force
- Brak funkcji "zapomniane hasło" w MVP (v1.1)

Zgodność z RODO:
- Możliwość hard delete konta użytkownika
- Usunięcie wszystkich danych osobowych użytkownika
- Confirm dialog przed usunięciem konta
- Informacja o nieodwracalności operacji

### 3.3 Profil użytkownika (RF-003)

Opis: Zarządzanie preferencjami i ustawieniami użytkownika

Funkcjonalności:
- Pole "Moje platformy" z checkboxami dla 5 platform VOD:
  - Netflix
  - HBO Max
  - Disney+
  - Prime Video
  - Apple TV+
- Możliwość wyboru wielu platform jednocześnie
- Zapis preferencji dla filtrowania wyników
- Wykorzystanie w sugestiach AI

Wymagania interfejsu:
- Intuicyjny wybór platform (checkboxy lub toggle)
- Wizualne logo platform dla łatwej identyfikacji
- Możliwość zmiany preferencji w dowolnym momencie

### 3.4 Wyszukiwarka filmów (RF-004)

Opis: Zaawansowana wyszukiwarka z autocomplete do znajdowania filmów

Funkcjonalności autocomplete:
- Wyszukiwanie w czasie rzeczywistym (live search)
- Limit 10 wyników w dropdown
- Każdy wynik zawiera:
  - Miniaturkę plakatu (50x75px)
  - Tytuł filmu
  - Rok produkcji w nawiasie
  - Ocenę IMDb
- Wyszukiwanie po tytule filmu
- Sortowanie wyników według trafności i oceny

Integracja z TMDB API:
- Pobieranie URL plakatów filmów
- Przechowywanie tylko URL w bazie danych
- Wykorzystanie CDN TMDB do wyświetlania obrazów
- Fallback: placeholder przy braku plakatu

Nice-to-have (niski priorytet MVP):
- Przeglądanie filmów po gatunkach
- Lista top-rated filmów z IMDb
- Filtrowanie wyników wyszukiwania

### 3.5 Zarządzanie watchlistą (RF-005)

Opis: Centralne miejsce do zarządzania filmami do obejrzenia

Funkcjonalności podstawowe:
- Dodawanie filmów przez wyszukiwarkę
- Usuwanie filmów z watchlisty (soft delete z flagą deleted_at)
- Confirm dialog przed usunięciem
- Komunikat przy próbie przekroczenia limitu

Widoki listy:
- Widok kafelkowy (domyślny):
  - Poster filmu
  - Tytuł
  - Rok produkcji
  - Ocena IMDb
  - Gatunki
  - Kolorowe ikony platform VOD z dostępnością
- Widok listowy (kompaktowy):
  - Wiersze z podstawowymi informacjami
  - Mniejsze ikony platform
  - Więcej filmów widocznych bez scrollowania

Funkcjonalności dodatkowe:
- Przełącznik między widokiem kafelkowym a listowym
- Responsywny design dla różnych rozmiarów ekranu

### 3.6 Integracja z Watchmode.com API (RF-006)

Opis: Automatyczne sprawdzanie dostępności filmów na platformach VOD

Funkcjonalności:
- Pobieranie informacji o dostępności dla każdego filmu na watchliście
- Sprawdzanie dostępności na 5 wybranych platformach
- Harmonogram aktualizacji: co tydzień w piątki o 18:00
- Zapisywanie timestampu ostatniego sprawdzenia (last_checked)
- Zapis stanu dostępności w bazie danych

Obsługa błędów:
- Przy błędzie API: wyświetlanie ostatniej znanej dostępności
- Komunikat "Stan z: [data]" przy nieaktualnych danych
- Logging błędów dla debugging
- Graceful degradation - aplikacja działa mimo błędów API

Wizualizacja dostępności:
- Kolorowe ikony platform, gdzie film jest dostępny
- Szary badge "Niedostępne na Twoich platformach" dla filmów bez dostępności
- Przycisk filtra "Ukryj niedostępne" do ukrywania niedostępnych filmów

### 3.7 Sortowanie i filtrowanie watchlisty (RF-007)

Opis: Narzędzia do organizacji i personalizacji widoku watchlisty

Opcje sortowania:
- Data dodania (domyślne, najnowsze pierwsze)
- Ocena IMDb (malejąco, najwyższe pierwsze)
- Rok produkcji (malejąco lub rosnąco)

Opcje filtrowania:
- "Tylko dostępne na moich platformach" (pokazuje filmy dostępne na wybranych platformach użytkownika)
- "Ukryj niedostępne" (ukrywa filmy z szarym badge'm)

Wymagania UX:
- Natychmiastowe zastosowanie filtrów bez przeładowania strony
- Wizualne oznaczenie aktywnych filtrów
- Zapamiętanie preferencji sortowania w sesji

### 3.8 Oznaczanie filmów jako obejrzane (RF-008)

Opis: System śledzenia historii oglądanych filmów

Funkcjonalności:
- Checkbox lub przycisk "check" przy każdym filmie na watchliście
- Po zaznaczeniu: automatyczne przeniesienie do zakładki "Obejrzane"
- Automatyczne zapisanie daty zaznaczenia jako obejrzany
- Brak limitu dla liczby obejrzanych filmów
- Możliwość przeglądania historii obejrzanych

Zakładka "Obejrzane":
- Oddzielny widok dla obejrzanych filmów
- Te same opcje wyświetlania (kafelki/lista)
- Sortowanie według daty obejrzenia (domyślnie najnowsze)
- Możliwość przywrócenia filmu do watchlisty (odznaczenie)

Nice-to-have v1.1:
- Edycja daty obejrzenia
- Dodanie osobistej oceny 1-10
- Notatki do filmu

### 3.9 Sugestie AI (RF-009)

Opis: Personalizowane rekomendacje filmów wykorzystujące Gemini-flash-lite

Funkcjonalności:
- Przycisk "Zasugeruj filmy" widoczny na watchliście
- Limit: 1 zapytanie na 24 godziny per użytkownik
- Cache sugestii przez 24 godziny
- Generowanie 5 personalizowanych sugestii
- Każda sugestia zawiera:
  - Tytuł filmu
  - Rok produkcji
  - Uzasadnienie (1-2 zdania)
  - Informację o dostępności na platformach użytkownika

Prompt dla AI:
"Na podstawie obejrzanych filmów: [lista filmów z gatunkami] i obecnej watchlisty: [lista filmów], zasugeruj 5 filmów dostępnych na: [platformy użytkownika]. Dla każdego podaj tytuł, rok i 1-2 zdaniowe uzasadnienie."

Przykład uzasadnienia:
"Ponieważ podobał Ci się Inception i Interstellar, polecamy Tenet - sci-fi o manipulacji czasem od Christophera Nolana"

Zarządzanie limitami:
- Komunikat o limicie przy próbie drugiego zapytania w ciągu 24h
- Wyświetlenie czasu do następnej dostępnej sugestii
- Cache per użytkownik (nie globalne)

Obsługa edge cases:
- Brak obejrzanych filmów (cold start): sugestie oparte tylko na watchliście
- Pusta watchlista: sugestie oparte tylko na obejrzanych
- Brak obu: komunikat z prośbą o dodanie filmów

### 3.10 Onboarding nowych użytkowników (RF-010)

Opis: Proces wprowadzenia nowych użytkowników do aplikacji

Struktura 3-stopniowa:
1. Krok 1: "Wybierz swoje platformy VOD"
   - Checkboxy dla 5 platform
   - Komunikat zachęcający do wyboru minimum 1 platformy
   - Przycisk "Skip" dla pominięcia

2. Krok 2: "Dodaj przynajmniej 3 filmy do watchlisty"
   - Wyszukiwarka filmów z autocomplete
   - Licznik dodanych filmów (bez limitu górnego)
   - Użytkownik może dodać dowolną liczbę filmów
   - Wymagane minimum 3 filmy do przejścia dalej
   - Przycisk "Skip" dla pominięcia

3. Krok 3: "Oznacz przynajmniej 3 filmy które już widziałeś"
   - Wyszukiwarka filmów
   - Bezpośrednie dodanie do zakładki "Obejrzane"
   - Licznik oznaczonych filmów (bez limitu górnego)
   - Użytkownik może oznaczyć dowolną liczbę filmów
   - Wymagane minimum 3 filmy do przejścia dalej
   - Dynamiczny tytuł: po dodaniu 3 filmów zmienia się na "Idź dalej lub dodaj kolejne filmy"
   - Przycisk "Skip" dla pominięcia

Wymagania UX:
- Progressbar pokazujący postęp (Krok 1/3, 2/3, 3/3)
- Możliwość powrotu do poprzedniego kroku
- Brak wymuszania completion - każdy krok można pominąć
- Po zakończeniu: przekierowanie do głównej strony z watchlistą
- Onboarding wyświetlany tylko przy pierwszym logowaniu

### 3.11 Analytics i metryki (RF-011)

Opis: System śledzenia zachowań użytkowników i metryk produktu

Metryki per użytkownik:
- Liczba filmów na watchliście
- Liczba filmów obejrzanych
- Liczba sugestii AI dodanych do watchlisty (flag: added_from_ai_suggestion)
- Data rejestracji
- Data ostatniego logowania

Metryki globalne:
- Retention 7-day: procent użytkowników logujących się 7 dni po rejestracji
- Retention 30-day: procent użytkowników logujących się 30 dni po rejestracji
- Procent użytkowników z minimum 10 filmami (watchlist + obejrzane)
- Procent użytkowników korzystających z funkcji AI
- Procent użytkowników dodających sugestie AI

Implementacja:
- Prosty logging do bazy danych (tabela events)
- Dashboard w admin panel z wizualizacją metryk
- Aktualizacja dashboardu codziennie
- Export danych do CSV dla głębszej analizy

Dashboard admin panel:
- Wykres retention (7-day, 30-day)
- Wykres wzrostu liczby użytkowników
- Top 10 najczęściej dodawanych filmów
- Procent użycia funkcji AI
- Średnia liczba filmów per użytkownik

### 3.12 Zarządzanie danymi użytkownika (RF-012)

Opis: Funkcje zarządzania danymi zgodne z RODO

Usuwanie z watchlisty:
- Przycisk "Usuń z watchlisty" przy każdym filmie
- Confirm dialog: "Czy na pewno chcesz usunąć [tytuł] z watchlisty?"
- Soft delete z flagą deleted_at
- Zachowanie danych dla analytics
- Możliwość przywrócenia (funkcja dla v1.1)

Usuwanie konta:
- Przycisk "Usuń konto" w ustawieniach profilu
- Confirm dialog z mocnym ostrzeżeniem:
  "To działanie jest nieodwracalne. Wszystkie Twoje dane (watchlista, obejrzane filmy, preferencje) zostaną trwale usunięte. Czy na pewno chcesz kontynuować?"
- Hard delete wszystkich danych użytkownika:
  - Konto użytkownika
  - Watchlista
  - Obejrzane filmy
  - Preferencje
  - Historia sugestii AI
- Zgodność z RODO - prawo do bycia zapomnianym
- Wylogowanie i przekierowanie do strony głównej

## 4. Granice produktu

### 4.1 Co wchodzi w zakres MVP

Funkcjonalności:
- Baza danych filmów z IMDb (jednorazowy import)
- Wyszukiwarka z autocomplete
- Zarządzanie watchlistą
- Integracja z Watchmode.com API
- System kont (email + hasło)
- Profil użytkownika z preferencjami platform VOD
- Oznaczanie filmów jako obejrzane
- Sugestie AI (Gemini-flash-lite)
- Onboarding nowych użytkowników
- Basic analytics i dashboard admin
- Usuwanie danych (RODO compliance)

Ograniczenia MVP:
- Tylko filmy (titleType = 'movie')
- Tylko tytuły oryginalne (primaryTitle)
- Limit 1 sugestia AI dziennie
- 5 platform VOD (Netflix, HBO Max, Disney+, Prime Video, Apple TV+)
- Cotygodniowa aktualizacja dostępności VOD
- Brak weryfikacji email
- Brak funkcji "zapomniane hasło"
- Tylko aplikacja webowa
- Jednorazowy import danych IMDb z manualnym przypomnieniem o aktualizacji

### 4.2 Co NIE wchodzi w zakres MVP

Funkcjonalności odłożone na przyszłość:
- Seriale (wersja v1.1)
- Lokalizacja tytułów filmów (v1.1)
- Weryfikacja email (v1.1)
- Funkcja "zapomniane hasło" (v1.1)
- Ocena filmów 1-10 i notatki (v1.1)
- Edycja daty obejrzenia (v1.1)
- Więcej niż 5 platform VOD (v1.1+)
- Częstsza aktualizacja dostępności (daily/realtime) (v1.1+)
- Zaawansowany system rekomendacji (v2.0)
- Automatyczny import bazy IMDb (v2.0)
- Współdzielenie watchlist z innymi użytkownikami (v2.0)
- Aplikacje mobilne (iOS, Android) (v2.0)
- Import watchlist z IMDb.com (v2.0)
- Import obejrzanych filmów z IMDb.com (v2.0)
- Wybór kraju dla dostępności VOD (v2.0)
- Integracje z social media (v2.0)
- Trailers i recenzje filmów (v2.0)
- Powiadomienia push o nowej dostępności (v2.0)
- System premium/subscription (do określenia)

### 4.3 Założenia projektowe

Techniczne:
- Stack technologiczny zostanie określony w osobnym dokumencie
- Autentykacja oparta o JSON Web Tokens (JWT) - stateless, bez tradycyjnych sesji
- Dostęp do Watchmode.com API (wymaga rejestracji i API key)
- Dostęp do TMDB API (darmowe dla non-commercial)
- Dostęp do Google Gemini-flash-lite (wymaga Google Cloud account)
- Pliki .tsv IMDb są dostępne i w odpowiednim formacie

Biznesowe:
- Brak określonego budżetu dla MVP (zostanie ustalony po testach)
- Brak timeline (zostanie dodany później)
- Brak planu monetyzacji w MVP
- Target rynek prawdopodobnie Polska/Europa (RODO compliance)
- Aplikacja non-commercial w fazie MVP (licencja TMDB)

Użytkownika:
- Użytkownicy mają subskrypcje do co najmniej jednej platformy VOD
- Użytkownicy znają tytuły oryginalne filmów lub mogą je zidentyfikować
- Użytkownicy korzystają z przeglądarek wspierających nowoczesne standardy web
- Użytkownicy mają dostęp do internetu

### 4.4 Zależności i ryzyka

Zewnętrzne API:
1. Watchmode.com API
   - Zależność: krytyczna dla core functionality
   - Ryzyko: dostępność, limity, koszty przy skalowaniu
   - Mitigation: graceful degradation, cache ostatniej dostępności

2. TMDB API
   - Zależność: średnia (plakaty poprawiają UX ale nie są krytyczne)
   - Ryzyko: limity API, zmiana warunków
   - Mitigation: placeholder przy braku plakatu, cache URL

3. Google Gemini-flash-lite
   - Zależność: niska (funkcja nice-to-have)
   - Ryzyko: koszty, limity, dostępność
   - Mitigation: limit 1 zapytanie/dzień, cache 24h

Dane:
- Pliki IMDb .tsv mogą zmieniać format
- Jednorazowy import wymaga manualnej aktualizacji co 3 miesiące

Prawne:
- Zgodność z RODO (rynek europejski)
- Terms of Service dla TMDB API (non-commercial)
- Privacy policy dla użytkowników

### 4.5 Nierozwiązane kwestie wymagające dalszej decyzji

1. Stack technologiczny (frontend, backend, baza danych)
2. Timeline projektu (rozpoczęcie, milestones, launch)
3. Budżet operacyjny (API costs, hosting, infrastruktura)
4. Szczegóły Watchmode.com API (limity, koszty, wspierane regiony)
5. Plan skalowania (oczekiwana liczba użytkowników, premium model)
6. Rynek docelowy (globalny vs regionalny, język interfejsu)
7. Szczegóły admin panel (dostęp, funkcje, moderacja)
8. Strategia testowania (unit, integration, e2e, beta testing)
9.  Plan monetyzacji (freemium, subscription, ads)

## 5. Historyjki użytkowników

### 5.1 Rejestracja i autentykacja

US-001: Rejestracja nowego użytkownika
Jako nowy użytkownik chcę zarejestrować się w aplikacji, aby móc korzystać z funkcji zarządzania watchlistą.

Kryteria akceptacji:
- System wyświetla formularz rejestracji z polami: email, hasło, powtórz hasło
- Walidacja email sprawdza poprawny format (zawiera @, domenę)
- Walidacja hasła wymaga minimum 8 znaków, mix liter i cyfr
- Pole "powtórz hasło" musi być identyczne z polem "hasło"
- Komunikat błędu wyświetla się przy niepoprawnej walidacji
- Po prawidłowej rejestracji hasło jest hashowane (PBKDF2)
- Użytkownik NIE jest automatycznie zalogowany po rejestracji; loguje się przez endpoint /api/token/ (JWT)
- Użytkownik jest przekierowany do procesu onboardingu
- Pole email_verified jest ustawione na false w bazie danych

US-002: Logowanie użytkownika
Jako zarejestrowany użytkownik chcę zalogować się do aplikacji, aby uzyskać dostęp do mojej watchlisty.

Kryteria akceptacji:
- System wyświetla formularz logowania z polami: email, hasło
- System sprawdza czy email istnieje w bazie danych
- System porównuje podane hasło z zahaszowanym hasłem w bazie
- Komunikat błędu "Nieprawidłowy email lub hasło" przy błędnych danych
- Po prawidłowym logowaniu użytkownik jest przekierowany do swojej watchlisty
- Tokeny JWT (access i refresh) są generowane i zwracane klientowi
- Klient zapisuje tokeny w local storage lub bezpiecznym storage
- Data ostatniego logowania jest aktualizowana w bazie danych

US-003: Wylogowanie użytkownika
Jako zalogowany użytkownik chcę wylogować się z aplikacji, aby zabezpieczyć moje konto na współdzielonym urządzeniu.

Kryteria akceptacji:
- Przycisk "Wyloguj" jest widoczny w interfejsie (menu/header)
- Po kliknięciu tokeny JWT są usuwane z local storage po stronie klienta
- Refresh token jest dodawany do blacklisty (włączone)
- Użytkownik jest przekierowany do strony logowania
- Próba dostępu do chronionej strony po wylogowaniu przekierowuje do logowania

### 5.2 Onboarding

US-004: Onboarding - Wybór platform VOD
Jako nowy użytkownik podczas pierwszego logowania chcę wybrać moje platformy VOD, aby otrzymywać spersonalizowane informacje o dostępności.

Kryteria akceptacji:
- System wyświetla ekran onboardingu z tytułem "Wybierz swoje platformy VOD" (Krok 1/3)
- Wyświetlane są checkboxy dla 5 platform: Netflix, HBO Max, Disney+, Prime Video, Apple TV+
- Każda platforma ma logo dla łatwej identyfikacji
- Użytkownik może wybrać minimum 0, maksimum 5 platform
- Przycisk "Dalej" jest zawsze aktywny
- Przycisk "Skip" pozwala pominąć krok
- Po kliknięciu "Dalej" lub "Skip" użytkownik przechodzi do Kroku 2
- Wybory są zapisywane w profilu użytkownika

US-005: Onboarding - Dodanie pierwszych filmów
Jako nowy użytkownik chcę dodać pierwsze filmy do watchlisty, aby poznać funkcjonalność aplikacji.

Kryteria akceptacji:
- System wyświetla ekran z tytułem "Dodaj przynajmniej 3 filmy do watchlisty" (Krok 2/3)
- Wyświetlana jest wyszukiwarka z autocomplete
- Licznik pokazuje postęp: "Dodane: X" (bez limitu górnego)
- Użytkownik może dodać dowolną liczbę filmów (minimum 3 wymagane do przejścia dalej)
- Każdy dodany film pojawia się na liście poniżej wyszukiwarki
- Przycisk "Dalej" jest aktywny dopiero po dodaniu minimum 3 filmów
- Przycisk "Skip" pozwala pominąć krok
- Po kliknięciu "Dalej" lub "Skip" użytkownik przechodzi do Kroku 3
- Dodane filmy są zapisywane na watchliście użytkownika

US-006: Onboarding - Oznaczenie obejrzanych filmów
Jako nowy użytkownik chcę oznaczyć filmy które już widziałem, aby system mógł generować lepsze sugestie AI.

Kryteria akceptacji:
- System wyświetla ekran z dynamicznym tytułem:
  - "Oznacz przynajmniej 3 filmy które już widziałeś" (gdy użytkownik ma mniej niż 3 filmy)
  - "Idź dalej lub dodaj kolejne filmy" (gdy użytkownik ma już 3+ filmów)
- Wyświetlana jest wyszukiwarka z autocomplete
- Licznik pokazuje postęp: "Oznaczone: X" (bez limitu górnego)
- Użytkownik może oznaczyć dowolną liczbę filmów (minimum 3 wymagane do przejścia dalej)
- Każdy oznaczony film pojawia się na liście poniżej wyszukiwarki
- Przycisk "Zakończ" jest aktywny dopiero po oznaczeniu minimum 3 filmów
- Przycisk "Skip" pozwala pominąć krok
- Po kliknięciu "Zakończ" lub "Skip" użytkownik przechodzi do głównej strony
- Oznaczone filmy są zapisywane w zakładce "Obejrzane" z datą dzisiejszą
- Onboarding nie jest wyświetlany przy kolejnych logowaniach

US-007: Pomijanie onboardingu
Jako nowy użytkownik w pośpiechu chcę pominąć onboarding, aby od razu zacząć korzystać z aplikacji.

Kryteria akceptacji:
- Każdy krok onboardingu ma widoczny przycisk "Skip"
- Kliknięcie "Skip" na Kroku 1 lub 2 przenosi do następnego kroku
- Kliknięcie "Skip" na Kroku 3 kończy onboarding i przenosi do aplikacji
- Żadne dane nie są zapisywane przy pomijaniu kroków
- Użytkownik ląduje na pustej watchliście
- Brak błędów przy pustych danych (brak platform, filmów, obejrzanych)

### 5.3 Profil użytkownika

US-008: Edycja platform VOD w profilu
Jako użytkownik chcę zmienić moje platformy VOD w profilu, aby dostosować aplikację do moich aktualnych subskrypcji.

Kryteria akceptacji:
- Strona profilu zawiera sekcję "Moje platformy VOD"
- Wyświetlane są checkboxy dla 5 platform z aktualnym stanem (zaznaczone/odznaczone)
- Użytkownik może zaznaczyć/odznaczyć dowolną liczbę platform
- Przycisk "Zapisz zmiany" zapisuje aktualizacje w bazie danych
- Komunikat "Zapisano zmiany" pojawia się po sukcesie
- Zmiany wpływają natychmiast na filtrowanie i sugestie AI
- Watchlista jest odświeżana z nowymi ikonami dostępności

### 5.4 Wyszukiwanie filmów

US-009: Wyszukiwanie filmu z autocomplete
Jako użytkownik chcę wyszukać film po tytule, aby dodać go do mojej watchlisty.

Kryteria akceptacji:
- Wyszukiwarka jest widoczna na stronie głównej
- Po wpisaniu minimum 2 znaków rozpoczyna się wyszukiwanie
- Dropdown z wynikami pojawia się poniżej pola wyszukiwania
- Maksymalnie 10 wyników jest wyświetlanych
- Każdy wynik zawiera: miniaturkę plakatu (50x75px), tytuł, rok w nawiasie, ocenę IMDb
- Wyniki są sortowane według trafności i oceny
- Placeholder pojawia się przy braku plakatu
- Kliknięcie na wynik dodaje film do watchlisty
- Komunikat potwierdzający dodanie pojawia się krótko (toast/snackbar)

US-010: Wyszukiwanie filmu nieistniejącego w bazie
Jako użytkownik chcę wyszukać film który nie istnieje w bazie, aby otrzymać odpowiednią informację.

Kryteria akceptacji:
- Po wpisaniu zapytania system przeszukuje bazę danych
- Jeśli brak wyników, wyświetlany jest komunikat "Nie znaleziono filmów"
- Sugestia alternatywna: "Spróbuj wpisać tytuł oryginalny filmu"
- Dropdown pozostaje otwarty z komunikatem
- Brak możliwości dodania filmu spoza bazy IMDb (zgodnie z MVP scope)

### 5.5 Zarządzanie watchlistą

US-012: Przeglądanie watchlisty w widoku kafelkowym
Jako użytkownik chcę zobaczyć moją watchlistę w widoku kafelkowym, aby wizualnie ocenić moje filmy.

Kryteria akceptacji:
- Widok kafelkowy jest domyślnym widokiem watchlisty
- Każdy kafelek zawiera: poster filmu, tytuł, rok, ocenę IMDb, gatunki
- Kolorowe ikony platform VOD pokazują gdzie film jest dostępny
- Szary badge "Niedostępne na Twoich platformach" dla filmów niedostępnych
- Responsywny grid (3-4 kafelki per rząd na desktop, 1-2 na mobile)
- Checkbox/przycisk "Obejrzane" w rogu kafelka
- Przycisk "Usuń" (ikona kosza) w rogu kafelka

US-013: Przeglądanie watchlisty w widoku listowym
Jako power user chcę przełączyć się na widok listowy, aby zobaczyć więcej filmów jednocześnie.

Kryteria akceptacji:
- Przełącznik widoku (ikony grid/list) jest widoczny nad watchlistą
- Kliknięcie przełącza między widokiem kafelkowym a listowym
- Widok listowy wyświetla filmy w wierszach
- Każdy wiersz zawiera: małą miniaturę plakatu, tytuł, rok, ocenę, gatunki, ikony platform
- Więcej filmów widocznych bez scrollowania niż w widoku kafelkowym
- Przyciski "Obejrzane" i "Usuń" są widoczne w wierszu
- Preferowany widok jest zapamiętywany w sesji

US-014: Sortowanie watchlisty
Jako użytkownik chcę sortować moją watchlistę, aby łatwiej znaleźć interesujące mnie filmy.

Kryteria akceptacji:
- Dropdown "Sortuj" jest widoczny nad watchlistą
- Opcje sortowania: "Data dodania (najnowsze)", "Ocena IMDb (najwyższe)", "Rok produkcji"
- Domyślne sortowanie: "Data dodania (najnowsze)"
- Kliknięcie opcji natychmiast zmienia kolejność filmów
- Brak przeładowania strony (sortowanie po stronie klienta)
- Aktualnie wybrana opcja jest wizualnie zaznaczona
- Sortowanie działa zarówno w widoku kafelkowym jak i listowym

US-015: Filtrowanie watchlisty - tylko dostępne filmy
Jako użytkownik chcę zobaczyć tylko filmy dostępne na moich platformach, aby szybko wybrać co obejrzeć dziś.

Kryteria akceptacji:
- Checkbox "Tylko dostępne na moich platformach" jest widoczny nad watchlistą
- Domyślnie checkbox jest odznaczony (pokazywane wszystkie filmy)
- Po zaznaczeniu checkbox ukrywane są filmy z szarym badge'm "Niedostępne"
- Licznik "Wyświetlane: X/Y" pokazuje ile filmów jest widocznych
- Jeśli żaden film nie jest dostępny, komunikat: "Brak filmów dostępnych na Twoich platformach"
- Jeśli użytkownik nie wybrał platform, komunikat: "Wybierz platformy w profilu"
- Stan checkboxa jest zapamiętywany w sesji

US-016: Ukrywanie niedostępnych filmów
Jako użytkownik chcę ukryć filmy niedostępne przyciskiem filtra, aby skupić się na tym co mogę obejrzeć.

Kryteria akceptacji:
- Przycisk "Ukryj niedostępne" jest widoczny nad watchlistą
- Przycisk jest aktywny tylko gdy są filmy niedostępne na watchliście
- Po kliknięciu filmy z szarym badge'm są ukrywane
- Tekst przycisku zmienia się na "Pokaż wszystkie"
- Ponowne kliknięcie przywraca wszystkie filmy
- Licznik filmów jest aktualizowany
- Działa niezależnie od innych filtrów

US-017: Usuwanie filmu z watchlisty
Jako użytkownik chcę usunąć film z mojej watchlisty.

Kryteria akceptacji:
- Przycisk "Usuń" (ikona kosza) jest widoczny przy każdym filmie
- Po kliknięciu pojawia się confirm dialog: "Czy na pewno chcesz usunąć [tytuł] z watchlisty?"
- Opcje w dialogu: "Usuń" i "Anuluj"
- Kliknięcie "Anuluj" zamyka dialog bez zmian
- Kliknięcie "Usuń" usuwa film z widoku (soft delete z flagą deleted_at)
- Toast/snackbar: "Film został usunięty z watchlisty"
- Film pozostaje w bazie danych dla analytics

US-018: Pusta watchlista
Jako nowy użytkownik chcę zobaczyć pustą watchlistę, aby otrzymać instrukcję co zrobić dalej.

Kryteria akceptacji:
- Przy braku filmów wyświetlany jest komunikat: "Twoja watchlista jest pusta"
- Tekst pomocniczy: "Użyj wyszukiwarki powyżej aby dodać pierwsze filmy"
- Ikona/ilustracja pustego stanu (empty state)
- Wyszukiwarka jest widoczna i aktywna

### 5.6 Dostępność filmów na platformach VOD

US-019: Wyświetlanie dostępności filmów z Watchmode API
Jako użytkownik chcę zobaczyć na których platformach są dostępne filmy z mojej watchlisty, aby wiedzieć gdzie mogę je obejrzeć.

Kryteria akceptacji:
- Każdy film na watchliście wyświetla ikony platform VOD gdzie jest dostępny
- Ikony są kolorowe dla platform gdzie film jest dostępny
- Ikony są szare/niewidoczne dla platform gdzie film nie jest dostępny
- Tylko platformy wybrane w profilu użytkownika są brane pod uwagę dla badge'a
- Film dostępny na co najmniej jednej platformie użytkownika: kolorowe ikony
- Film niedostępny na żadnej platformie użytkownika: szary badge "Niedostępne na Twoich platformach"
- Tooltip/hover na ikonie pokazuje nazwę platformy

US-020: Aktualizacja dostępności filmów
Jako system chcę automatycznie aktualizować dostępność filmów co tydzień, aby użytkownicy mieli aktualne dane.

Kryteria akceptacji:
- Scheduled job uruchamia się każdy piątek o 18:00
- Job pobiera dostępność dla wszystkich filmów na wszystkich watchlistach użytkowników
- Timestamp "last_checked" jest aktualizowany dla każdego filmu
- Stan dostępności jest zapisywany w bazie danych
- W przypadku błędu API job kontynuuje dla pozostałych filmów
- Błędy są logowane dla debugging
- Email/notyfikacja do admina przy powtarzających się błędach (nice-to-have)

US-021: Obsługa błędu Watchmode API
Jako użytkownik chcę zobaczyć ostatnią znaną dostępność gdy API nie działa, aby nadal móc korzystać z aplikacji.

Kryteria akceptacji:
- Gdy API zwraca błąd, system używa ostatniej znanej dostępności z bazy
- Komunikat "Stan z: [data]" jest wyświetlany przy ikonach platform
- Data jest w czytelnym formacie (np. "Stan z: 3 października 2025")
- Ikony platform pokazują ostatni znany stan
- Jeśli brak danych w bazie (nowy film): komunikat "Dostępność nieznana"
- Aplikacja działa normalnie mimo błędu API

US-022: Film bez danych w Watchmode API
Jako użytkownik chcę dodać film który nie ma danych w Watchmode, aby otrzymać odpowiednią informację.

Kryteria akceptacji:
- Film można dodać do watchlisty nawet jeśli Watchmode nie ma danych
- Przy filmie wyświetlany jest komunikat "Dostępność nieznana"
- Szary badge nie jest wyświetlany (nie mylić z niedostępnością)
- Film może być filtrowany opcją "Ukryj z nieznaną dostępnością" (nice-to-have)
- Timestamp "last_checked" jest zapisywany pomimo braku danych

### 5.7 Oznaczanie filmów jako obejrzane

US-023: Oznaczenie filmu jako obejrzany
Jako użytkownik chcę oznaczyć film jako obejrzany, aby przenieść go do historii.

Kryteria akceptacji:
- Checkbox/przycisk "Obejrzane" jest widoczny przy każdym filmie na watchliście
- Po kliknięciu film znika z watchlisty
- Film pojawia się w zakładce "Obejrzane"
- Data obejrzenia jest automatycznie zapisywana jako data dzisiejsza
- Toast/snackbar: "Film został oznaczony jako obejrzany"
- Operacja jest natychmiastowa (brak przeładowania strony)

US-024: Przeglądanie zakładki Obejrzane
Jako użytkownik chcę zobaczyć historię moich obejrzanych filmów, aby przypomnieć sobie co oglądałem.

Kryteria akceptacji:
- Zakładka "Obejrzane" jest widoczna w głównej nawigacji
- Zakładka wyświetla wszystkie filmy oznaczone jako obejrzane
- Domyślne sortowanie: data obejrzenia (najnowsze pierwsze)
- Te same widoki dostępne: kafelkowy i listowy
- Każdy film pokazuje datę obejrzenia
- Brak limitu liczby filmów w zakładce "Obejrzane"
- Filmy zachowują informacje o dostępności VOD

US-025: Przywrócenie filmu z Obejrzanych do watchlisty
Jako użytkownik chcę odznaczyć film jako obejrzany, aby przenieść go z powrotem na watchlistę.

Kryteria akceptacji:
- Checkbox/przycisk "Przywróć do watchlisty" jest widoczny w zakładce "Obejrzane"
- Po kliknięciu film znika z zakładki "Obejrzane"
- Film pojawia się na watchliście
- Data obejrzenia jest usuwana z bazy
- Toast/snackbar: "Film został przywrócony do watchlisty"

US-026: Pusta zakładka Obejrzane
Jako nowy użytkownik chcę zobaczyć pustą zakładkę Obejrzane, aby zrozumieć jej przeznaczenie.

Kryteria akceptacji:
- Przy braku filmów wyświetlany jest komunikat: "Nie oznaczyłeś jeszcze żadnych filmów jako obejrzane"
- Tekst pomocniczy: "Filmy oznaczone jako obejrzane pojawią się tutaj"
- Ikona/ilustracja pustego stanu (empty state)
- Link "Przejdź do watchlisty" przekierowuje do watchlisty

### 5.8 Sugestie AI

US-027: Generowanie sugestii AI
Jako użytkownik chcę otrzymać personalizowane sugestie filmów od AI, aby odkryć nowe ciekawe tytuły.

Kryteria akceptacji:
- Przycisk "Zasugeruj filmy" jest widoczny na watchliście
- Po kliknięciu wyświetlany jest loader/spinner z komunikatem "Generuję sugestie..."
- System pobiera: listę obejrzanych filmów (z gatunkami), watchlistę, platformy użytkownika
- Prompt jest wysyłany do Gemini-flash-lite API
- System otrzymuje 5 sugestii z tytułem, rokiem i uzasadnieniem
- Sugestie są wyświetlane w osobnej sekcji/modal
- Każda sugestia zawiera: plakat (TMDB), tytuł, rok, uzasadnienie (1-2 zdania), ikony dostępności
- Przycisk "Dodaj do watchlisty" przy każdej sugestii
- Sugestie są cache'owane na 24 godziny
- Flag "added_from_ai_suggestion" jest ustawiana przy dodaniu z sugestii

US-028: Limit sugestii AI
Jako użytkownik po wygenerowaniu sugestii chcę kliknąć ponownie tego samego dnia, aby otrzymać informację o limicie.

Kryteria akceptacji:
- Po użyciu funkcji raz dziennie przycisk "Zasugeruj filmy" jest disabled
- Tooltip/komunikat: "Możesz otrzymać nowe sugestie za [X] godzin"
- Licznik czasu do następnej dostępności jest dynamiczny
- Po 24 godzinach przycisk staje się aktywny
- Cache sugestii jest czyszczony po 24 godzinach
- Limit jest per użytkownik (nie globalny)

US-029: Sugestie AI - cold start (brak obejrzanych filmów)
Jako nowy użytkownik bez obejrzanych filmów chcę otrzymać sugestie AI, aby odkryć filmy dopasowane do mojej watchlisty.

Kryteria akceptacji:
- Przycisk "Zasugeruj filmy" jest aktywny nawet bez obejrzanych filmów
- Prompt zawiera tylko watchlistę (bez obejrzanych)
- AI generuje sugestie oparte na filmach z watchlisty
- Komunikat informacyjny: "Sugestie oparte na Twojej watchliście. Oznacz filmy jako obejrzane dla lepszych rekomendacji."
- 5 sugestii jest wyświetlanych normalnie
- Uzasadnienia odnoszą się do filmów z watchlisty

US-030: Sugestie AI - pusta watchlista i brak obejrzanych
Jako użytkownik bez watchlisty i obejrzanych chcę kliknąć "Zasugeruj filmy", aby otrzymać odpowiednią informację.

Kryteria akceptacji:
- Przycisk "Zasugeruj filmy" jest disabled lub ukryty
- Komunikat: "Dodaj filmy do watchlisty lub oznacz jako obejrzane, aby otrzymać personalizowane sugestie"
- Link "Wyszukaj filmy" przekierowuje do wyszukiwarki
- Brak zapytania do Gemini API (oszczędność kosztów)

US-031: Dodawanie sugestii AI do watchlisty
Jako użytkownik chcę dodać film z sugestii AI do watchlisty, aby obejrzeć go później.

Kryteria akceptacji:
- Przycisk "Dodaj do watchlisty" jest widoczny przy każdej sugestii
- Po kliknięciu film jest dodawany do watchlisty z flagą "added_from_ai_suggestion"
- Toast/snackbar: "Film dodany do watchlisty"
- Przycisk zmienia się na "Dodano" i jest disabled
- Film pojawia się na watchliście w standardowym widoku

US-032: Błąd Gemini API
Jako użytkownik chcę kliknąć "Zasugeruj filmy" gdy API nie działa, aby otrzymać odpowiednią informację.

Kryteria akceptacji:
- Po błędzie API wyświetlany jest komunikat błędu
- Komunikat: "Nie udało się wygenerować sugestii. Spróbuj ponownie później."
- Przycisk "Spróbuj ponownie" pozwala na natychmiastową próbę (nie liczy się do limitu dziennego)
- Błąd jest logowany dla debugging
- Użytkownik może normalnie korzystać z reszty aplikacji

### 5.9 Admin panel i analytics

US-033: Dashboard analytics dla admina
Jako administrator chcę zobaczyć dashboard z metrykami, aby monitorować zdrowie produktu.

Kryteria akceptacji:
- Admin panel jest dostępny pod dedykowaną URL (np. /admin)
- Wymaga autoryzacji (admin role)
- Dashboard wyświetla metryki:
  - Całkowita liczba użytkowników
  - Nowi użytkownicy (dziś, 7 dni, 30 dni)
  - Retention 7-day (procent)
  - Retention 30-day (procent)
  - Procent użytkowników z minimum 10 filmami
  - Procent użytkowników korzystających z AI
  - Procent użytkowników dodających sugestie AI
  - Średnia liczba filmów per użytkownik
- Wykresy wizualizują dane (line chart dla retention, bar chart dla użytkowników)
- Dashboard jest aktualizowany codziennie o północy

US-034: Top filmy w analytics
Jako administrator chcę zobaczyć top 10 najczęściej dodawanych filmów, aby zrozumieć preferencje użytkowników.

Kryteria akceptacji:
- Sekcja "Top 10 filmów" w admin panel
- Lista wyświetla: tytuł filmu, rok, liczba dodań
- Sortowanie malejące według liczby dodań
- Opcja przełączenia na "Top 10 obejrzanych filmów"
- Opcja zmiany timeframe (7 dni, 30 dni, cały czas)
- Export danych do CSV

US-035: Logi błędów w admin panel
Jako administrator chcę zobaczyć logi błędów API, aby diagnozować problemy z integracjami.

Kryteria akceptacji:
- Sekcja "Logi błędów" w admin panel
- Tabela z: timestamp, typ API (Watchmode/TMDB/Gemini), komunikat błędu, user_id (jeśli dotyczy)
- Filtrowanie po typie API i dacie
- Sortowanie według daty (najnowsze pierwsze)
- Paginacja (50 wpisów per strona)
- Możliwość wyszukiwania po user_id
- Export logów do CSV

### 5.10 Zarządzanie danymi i RODO

US-036: Usunięcie konta użytkownika
Jako użytkownik chcę usunąć moje konto, aby moje dane zostały trwale usunięte (RODO compliance).

Kryteria akceptacji:
- Przycisk "Usuń konto" jest widoczny w ustawieniach profilu
- Po kliknięciu pojawia się confirm dialog z mocnym ostrzeżeniem
- Ostrzeżenie: "To działanie jest nieodwracalne. Wszystkie Twoje dane (watchlista, obejrzane filmy, preferencje) zostaną trwale usunięte. Czy na pewno chcesz kontynuować?"
- Opcje: "Tak, usuń moje konto" i "Anuluj"
- Kliknięcie "Anuluj" zamyka dialog bez zmian
- Kliknięcie "Tak, usuń" wykonuje hard delete wszystkich danych użytkownika:
  - Rekord użytkownika
  - Watchlista
  - Obejrzane filmy
  - Preferencje platform
  - Historia sugestii AI
  - Cache sugestii
  - Logi analytics dla tego użytkownika
- Tokeny JWT są unieważnione (dodane do blacklisty)
- Tokeny są usuwane z local storage po stronie klienta
- Użytkownik jest przekierowany do strony głównej z komunikatem "Konto zostało usunięte"

US-037: Soft delete filmu - zachowanie dla analytics
Jako system chcę wykonać soft delete filmu z watchlisty, aby zachować dane dla analytics.

Kryteria akceptacji:
- Przy usunięciu filmu z watchlisty rekord nie jest usuwany z bazy
- Flaga "deleted_at" jest ustawiana na timestamp
- Film nie pojawia się w watchliście użytkownika
- Dane analytics nadal mają dostęp do historii dodań/usunięć
- Admin panel może analizować pattern usuwania filmów
- Rekord pozostaje w bazie danych na stałe (lub do hard delete konta)

### 5.11 Edge cases i error handling

US-038: Poster filmu niedostępny w TMDB
Jako użytkownik chcę zobaczyć film bez plakatu w TMDB, aby nadal móc go dodać do watchlisty.

Kryteria akceptacji:
- Gdy TMDB nie ma plakatu dla filmu, wyświetlany jest placeholder
- Placeholder zawiera: tytuł filmu, rok, ikona filmu
- Placeholder ma ten sam rozmiar co normalny plakat
- Film można normalnie dodać do watchlisty
- Film jest w pełni funkcjonalny (dostępność VOD, AI suggestions)
- Autocomplete wyświetla placeholder w wynikach wyszukiwania

US-039: Błąd TMDB API
Jako użytkownik chcę zobaczyć film gdy TMDB API nie działa, aby nadal móc korzystać z aplikacji.

Kryteria akceptacji:
- Przy błędzie TMDB API plakaty nie są ładowane
- Placeholder jest wyświetlany zamiast plakatu
- Komunikat nie jest wyświetlany użytkownikowi (graceful degradation)
- Funkcjonalność aplikacji nie jest zakłócona
- Błąd jest logowany dla admina
- Po przywróceniu API plakaty ładują się normalnie (cache URL)

US-040: Gemini API zwraca mniej niż 5 sugestii
Jako użytkownik chcę otrzymać sugestie AI gdy API zwraca mniej niż 5, aby nadal otrzymać wartość.

Kryteria akceptacji:
- System akceptuje 1-5 sugestii od Gemini API
- Jeśli otrzymano mniej niż 5, wszystkie są wyświetlane
- Komunikat: "Znaleziono [X] sugestii dla Ciebie"
- Brak komunikatu błędu (to nie jest błąd)
- Jeśli otrzymano 0 sugestii: komunikat "Nie znaleziono sugestii. Spróbuj ponownie później."
- Limit dzienny nadal obowiązuje nawet przy 0 sugestiach

US-041: Użytkownik bez wybranych platform VOD
Jako użytkownik bez wybranych platform chcę przeglądać watchlistę, aby zobaczyć odpowiednią informację o dostępności.

Kryteria akceptacji:
- Wszystkie filmy na watchliście nie mają ikon platform (brak wybranych platform)
- Komunikat nad watchlistą: "Wybierz swoje platformy VOD w profilu, aby zobaczyć dostępność filmów"
- Link "Przejdź do profilu" przekierowuje do ustawień platform
- Filmy można normalnie dodawać, usuwać, oznaczać jako obejrzane
- Sugestie AI nadal działają (brak filtrowania po platformach)
- Filtr "Tylko dostępne na moich platformach" jest disabled

US-042: Próba dodania filmu już istniejącego na watchliście
Jako użytkownik chcę dodać film który już jest na mojej watchliście, aby otrzymać odpowiednią informację.

Kryteria akceptacji:
- System sprawdza czy film już istnieje na watchliście przed dodaniem
- Jeśli film istnieje: komunikat "Ten film jest już na Twojej watchliście"
- Film nie jest dodawany ponownie (brak duplikatów)
- Użytkownik pozostaje na tej samej stronie
- Opcja: "Przejdź do watchlisty" w komunikacie

US-043: Token JWT wygasł
Jako zalogowany użytkownik po wygaśnięciu access tokena chcę wykonać akcję, aby zostać bezpiecznie przekierowanym do logowania lub automatycznie odświeżyć token.

Kryteria akceptacji:
- Po wygaśnięciu access tokena próba akcji zwraca błąd 401 Unauthorized
- System próbuje automatycznie odświeżyć token używając refresh tokena
- Jeśli refresh token jest ważny, nowy access token jest otrzymany i akcja jest powtarzana
- Jeśli refresh token wygasł lub jest nieważny, użytkownik jest przekierowany do dedykowanej strony błędu autoryzacji (`/error/unauthorized`)
- Strona błędu zawiera przycisk "Zaloguj ponownie" z zachowaniem return-to URL
- Komunikat: "Twoja sesja wygasła. Zaloguj się ponownie."
- Po zalogowaniu użytkownik wraca do poprzedniej strony (jeśli możliwe)
- Brak utraty danych z formularzy (jeśli możliwe)

## 6. Metryki sukcesu

### 6.1 Kryterium sukcesu 1: Zaangażowanie użytkowników w watchlistę

Cel: 80% użytkowników posiada minimum 10 filmów łącznie (watchlist + obejrzane)

Metoda pomiaru:
- Zapytanie SQL zliczające użytkowników z ≥10 filmami (suma watchlist i obejrzanych) podzielone przez wszystkich zarejestrowanych użytkowników
- Formuła: (liczba użytkowników z ≥10 filmami / całkowita liczba użytkowników) × 100%

Implementacja:
- Automatyczne obliczenie codziennie o północy
- Wyświetlenie w admin dashboard jako procent i liczby absolutne
- Wykres trendu w czasie (30 dni)

Interpretacja:
- Wysoka wartość (≥80%) wskazuje, że użytkownicy aktywnie korzystają z aplikacji i zarządzają dużą bazą filmów
- Niska wartość (<60%) może wskazywać na problemy z onboardingiem lub wartością aplikacji
- Średnia wartość (60-79%) wymaga analizy - czy użytkownicy osiągają 10 filmów i przestają dodawać, czy nie osiągają w ogóle

Czynniki wpływające:
- Obejrzane filmy pomagają osiągnąć próg 10
- Onboarding zachęcający do dodania 3+3 filmów wspiera cel

### 6.2 Kryterium sukcesu 2: Adopcja funkcji AI

Cel: 25% użytkowników dodaje do watchlisty filmy rekomendowane przez AI

Metoda pomiaru:
- Tracking poprzez flagę "added_from_ai_suggestion" w bazie danych
- Zapytanie SQL zliczające użytkowników, którzy dodali ≥1 film z flaga=true
- Formuła: (liczba użytkowników z filmami z AI / liczba użytkowników, którzy użyli funkcji AI) × 100%

Implementacja:
- Flaga "added_from_ai_suggestion" jest ustawiana przy dodaniu filmu z sugestii
- Dashboard pokazuje:
  - Procent użytkowników dodających filmy z AI
  - Liczba filmów dodanych z AI (globalnie)
  - Średnia liczba filmów z AI per użytkownik
  - Procent użytkowników klikających "Zasugeruj filmy" (adoption rate)

Interpretacja:
- Wysoka wartość (≥25%) wskazuje, że AI dostarcza wartościowe sugestie
- Niska wartość (<15%) może wskazywać na:
  - Słabą jakość sugestii AI
  - Brak relevancji rekomendacji
  - Problemy z UX funkcji AI
  - Niedostateczną widoczność funkcji

Metryki pomocnicze:
- Procent użytkowników klikających "Zasugeruj filmy" (conversion funnel)
- Średnia liczba sugestii dodanych per użytkownik korzystający z AI
- Retention użytkowników korzystających z AI vs nie korzystających

### 6.3 Kryterium sukcesu 3: Retention 7-day

Cel: 40% retention po 7 dniach od rejestracji

Metoda pomiaru:
- Cohort analysis: użytkownicy logujący się ponownie 7 dni po rejestracji
- Formuła: (liczba użytkowników aktywnych w dniu 7 / liczba użytkowników zarejestrowanych w dniu 0) × 100%

Implementacja:
- Tracking daty rejestracji i wszystkich logowań
- Dashboard z cohort table:
  - Rzędy: cohort rejestracji (tydzień)
  - Kolumny: dni od rejestracji (0, 1, 3, 7, 14, 30)
  - Wartości: procent retention
- Heatmap wizualizacja retentionu

Interpretacja:
- Wysoka wartość (≥40%) wskazuje, że aplikacja dostarcza wartość i użytkownicy wracają
- Niska wartość (<25%) wskazuje na problemy:
  - Słaba wartość produktu
  - Brak funkcji przywracających użytkowników (push notifications, email)
  - Problemy z onboardingiem
  - Buggy experience

Czynniki wpływające:
- Jakość onboardingu (czy użytkownicy zrozumieli wartość)
- Dostępność filmów na platformach użytkownika
- Częstotliwość aktualizacji VOD (raz w tygodniu może być za rzadko)

### 6.4 Kryterium sukcesu 4: Retention 30-day

Cel: 20% retention po 30 dniach od rejestracji

Metoda pomiaru:
- Cohort analysis: użytkownicy logujący się ponownie 30 dni po rejestracji
- Formuła: (liczba użytkowników aktywnych w dniu 30 / liczba użytkowników zarejestrowanych w dniu 0) × 100%

Implementacja:
- Ten sam system cohort analysis co retention 7-day
- Dashboard z długoterminowym trendem retention

Interpretacja:
- Wysoka wartość (≥20%) wskazuje na długoterminową wartość produktu
- Niska wartość (<10%) wskazuje na problemy z długoterminowym engagementem
- 30-day retention jest naturalnie niższy niż 7-day (spadek zaangażowania w czasie)

Czynniki wpływające:
- Czy użytkownicy rzeczywiście oglądają filmy z watchlisty
- Czy watchlista jest regularnie aktualizowana
- Czy sugestie AI zachęcają do powrotu
- Brak powiadomień o nowej dostępności filmów

### 6.5 Kryterium sukcesu 5: Engagement - Oznaczanie filmów jako obejrzane

Cel: Średnio 2 filmy oznaczone jako obejrzane per użytkownik miesięcznie

Metoda pomiaru:
- Suma filmów oznaczonych jako obejrzane w danym miesiącu / liczba aktywnych użytkowników w tym miesiącu
- Aktywny użytkownik = zalogował się przynajmniej raz w miesiącu

Implementacja:
- Tracking daty oznaczenia filmu jako obejrzany
- Dashboard pokazuje:
  - Średnia miesięczna (current month)
  - Trend w czasie (wykres 6 miesięcy)
  - Rozkład: ile użytkowników oznaczyło 0, 1, 2, 3+ filmów

Interpretacja:
- Wysoka wartość (≥2) wskazuje, że użytkownicy faktycznie oglądają filmy z watchlisty (core value)
- Niska wartość (<1) wskazuje, że watchlista staje się "wish list" bez realizacji
- Wartość =0 dla większości użytkowników wskazuje na problem z core value proposition

Czynniki wpływające:
- Czy filmy są dostępne na platformach użytkownika
- Jak często użytkownicy sprawdzają watchlistę
- Czy UX oznaczania jako obejrzany jest intuicyjny
- Dostępność czasu wolnego użytkowników (zewnętrzny czynnik)

### 6.6 Metryki pomocnicze (Nice-to-track)

Metryki dodatkowe dla głębszej analizy:

1. Time to First Film Added
   - Czas od rejestracji do dodania pierwszego filmu
   - Cel: <5 minut (wskazuje na dobry onboarding)

2. Average Watchlist Size
   - Średnia liczba filmów na watchliście per użytkownik

3. Churn Rate
   - Procent użytkowników nieaktywnych przez 30+ dni
   - Wskazuje na problemy z retentionem

4. API Usage Costs
   - Koszt Watchmode, TMDB, Gemini per użytkownik miesięcznie
   - Kluczowe dla określenia budżetu i monetyzacji

5. Search Queries
   - Liczba wyszukiwań per użytkownik
   - Jakie tytuły są najczęściej wyszukiwane (ale nie dodane)
   - Wskazuje na missing content lub UX problems

6. Platform Preferences
   - Rozkład wybranych platform VOD
   - Najczęstsze kombinacje platform
   - Wskazuje na target audience

7. AI Suggestion Quality
   - Procent sugestii AI które są dodawane (acceptance rate)
   - Średnia: ile z 5 sugestii jest dodawanych
   - Wskazuje na jakość rekomendacji

### 6.7 Dashboard dla tracking metryk sukcesu

Sekcja 1: Overview
- Celownik dla każdego z 5 głównych kryteriów (gauge showing progress to goal)
- Status: green (achieved), yellow (close), red (needs attention)

Sekcja 2: Retention
- Cohort table z heatmap
- Line chart retention w czasie

Sekcja 3: Engagement
- Bar chart: rozkład liczby filmów per użytkownik
- Line chart: filmy obejrzane per miesiąc (trend)

Sekcja 4: AI Adoption
- Funnel chart: użytkownicy → kliknęli AI → dodali film z AI
- Conversion rates dla każdego kroku

Sekcja 5: Growth
- Line chart: nowi użytkownicy (daily, weekly, monthly)
- Cumulative users growth


## 7. Planowane nowe funkcjonalności.

### 7.1 Funkcjonalności jakie planuje się po implementacji podstawowych funkcji MVP:
7.1.1 Dodanie filtrowania dostępnych filmów na konkretnych platformach:
- na wysokości menu gdzie jest wybór podstron Watchlist, obejrzane, Profil, Admin z prawej strony przy krawędzi znajdują się ikony wyboru platform
- ikony wyboru platform zawierają: wszystkie dostępne platformy (po dodaniu nowych platform powinny same się pojawiać nowe, nie hardcodowane)
- przycisk wyboru wszystkich platform / odznaczenia wszystkich platform - maksymalnie z prawej strony
- przycisk "Ukryj niedostępne" zamienić na "Na moich platformach" - do uzgodnienia

7.1.2 Pobieranie i zapisywanie ocen obejrzanych filmów.
- sprawdzić możliwość automatycznego pobierania listy obejrzanych filmów i ich ocen (np raz dziennie)
- możliwość ręcznego odświeżenia listy

7.1.3 Możliwość pobierania automatycznego watchlisty oraz obejrzanych filmów z IMDB:
- wymaga to podania nazwy użytkownika z IMDB
- ustawienia list jako publiczne
- nazwę użytkownika IMDB można podać podczas onboardingu lub w profilu
- w profilu po podaniu nazwy użytkownika jest możliwość odświeżenia list

7.1.4 Możliwość zalogowania jako mock user.
- dla nowych użytkowników, by sprawdzić jak działa aplikacja dodana zostanie opcja "Zaloguj jako ..."
- typy użytkowników: fan anime, fan kina akcji, romantyk, entyzjasta horrorów, fan komedii

7.1.5 Reset hasła na stronie głównej. Forgot Password?
---

Koniec dokumentu PRD

