# Dokumentacja: Automatyczne Pobieranie Plakatów Filmowych

Data implementacji: 11 listopada 2025

## 1. Opis Funkcjonalności

Zaimplementowano mechanizm, który automatycznie i asynchronicznie pobiera adresy URL plakatów filmowych z zewnętrznego serwisu The Movie Database (TMDB). Funkcjonalność działa w tle, aby nie spowalniać interfejsu użytkownika.

Głównym celem jest wzbogacenie danych o filmach w naszej bazie danych o plakaty, które są kluczowym elementem wizualnym w aplikacji. Proces ten jest uruchamiany automatycznie, gdy użytkownik wchodzi w interakcję z filmami w różnych częściach aplikacji, takich jak:

*   Wyniki wyszukiwania
*   Watchlista
*   Historia obejrzanych filmów
*   Sugestie AI

Mechanizm sprawdza, czy dany film ma już przypisany plakat, a także czy od ostatniego sprawdzenia nie minęło więcej niż 30 dni, aby unikać zbędnych zapytań do zewnętrznego API.

## 2. Implementacja Techniczna

Rozwiązanie składa się z trzech głównych komponentów po stronie backendu:

### a) Klient TMDB API (`services/tmdb_client.py`)

Utworzono dedykowany serwis `TMDBClient`, który hermetyzuje całą logikę komunikacji z API TMDB. Jego główne zadania to:

*   Pobieranie `tmdb_id` filmu na podstawie jego identyfikatora z IMDb (`tconst`).
*   Pobieranie listy dostępnych plakatów dla danego `tmdb_id`.
*   Wybór najlepszego plakatu na podstawie preferencji językowych (priorytet: polski, angielski, a następnie dowolny inny).

### b) Zadanie Celery (`tasks/movie_tasks.py`)

Sercem mechanizmu jest asynchroniczne zadanie Celery o nazwie `update_movie_poster`.

*   Zadanie przyjmuje `tconst` filmu jako argument.
*   Pobiera obiekt filmu z bazy danych.
*   Korzysta z `tmdb_client`, aby uzyskać URL plakatu.
*   Zapisuje pozyskany URL w polu `poster_path` w tabeli `movie`.
*   Aktualizuje pole `poster_last_checked` obecną datą i godziną, aby system wiedział, kiedy ostatnio sprawdzano ten film.

### c) Integracja z Serializerami

Zadanie Celery jest wywoływane automatycznie z poziomu serializerów Django REST Framework (`MovieSerializer` i `MovieSearchResultSerializer`).

*   W metodzie `to_representation` każdego z tych serializerów dodano logikę, która dla każdego serializowanego obiektu filmu sprawdza, czy wymaga on aktualizacji plakatu.
*   Jeśli tak, wywoływane jest zadanie w tle za pomocą `.delay()`: `update_movie_poster.delay(movie.tconst)`.
*   Dzięki temu odpowiedź API jest wysyłana do użytkownika natychmiast, a proces pobierania plakatu odbywa się w tle, nie wpływając na odczuwalną wydajność aplikacji.

## 3. Konfiguracja Celery (`.env` i `settings.py`)

Wprowadzono elastyczną konfigurację Celery, która pozwala na łatwe przełączanie między trybem deweloperskim a produkcyjnym bez modyfikacji kodu.

### a) Zmienne Środowiskowe

Konfiguracja opiera się na dwóch zmiennych w pliku `.env`:

1.  `DEBUG`:
    *   `DEBUG=True`: Tryb deweloperski.
    *   `DEBUG=False`: Tryb produkcyjny.

2.  `CELERY_ACTIVE` (nowa zmienna):
    *   `CELERY_ACTIVE=False`: Ręcznie wyłącza asynchroniczne działanie Celery (nawet na produkcji).
    *   `CELERY_ACTIVE=True`: Włącza standardowe, asynchroniczne działanie Celery.

### b) Logika Działania

*   **Dla deweloperów (gdy `DEBUG=True` LUB `CELERY_ACTIVE=False`):**
    *   Celery działa w trybie **synchronicznym** (`CELERY_TASK_ALWAYS_EAGER = True`).
    *   Zadania są wykonywane natychmiast w tym samym procesie, co aplikacja.
    *   **Nie jest wymagane uruchamianie Redisa ani workera Celery.** To znacznie upraszcza pracę lokalną.

*   **Na produkcji (gdy `DEBUG=False` ORAZ `CELERY_ACTIVE=True`):**
    *   Celery działa w standardowym trybie **asynchronicznym**.
    *   Wymaga działającego serwera Redis jako brokera wiadomości oraz uruchomionych kontenerów `celery_worker` i `celery_beat`.

## 4. Architektura Celery w Docker Compose

Konfiguracja w pliku `docker-compose.yml` jest już w pełni przygotowana do obsługi nowego zadania i nie wymagała żadnych zmian.

*   **`celery_worker`**: To uniwersalny "pracownik" wykonujący zadania zlecane na bieżąco. Gdy serializer wysyła zadanie `update_movie_poster`, to właśnie ten serwis je odbiera z Redisa i realizuje. Jest on gotowy do obsługi dowolnej liczby różnych zadań.

*   **`celery_beat`**: To "harmonogram", który zleca zadania cykliczne (np. codziennie o północy). Nasze nowe zadanie pobierania plakatów nie jest cykliczne, więc `celery_beat` nie bierze w nim udziału.
