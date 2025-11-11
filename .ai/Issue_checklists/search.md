# Search Performance Summary

## Zrealizowane działania

- Odchudziliśmy odpowiedź `GET /api/movies/`: usunięcie `availability` z serializerów i rezygnacja z `prefetch_related('availability_entries')` ograniczyły liczbę zapytań i rozmiar payloadu.
- Dodaliśmy po stronie backendu oraz frontendu podstawową telemetrię czasów wyszukiwania (m.in. debounce, `AbortController`, logowanie czasu zapytań w dev-buildzie).
- Wdrożyliśmy migrację `movies.0002_movie_primary_title_trgm_index`, która aktywuje rozszerzenia `pg_trgm`/`unaccent` i tworzy indeks GIN `movie_primary_title_trgm_idx`.
- W serwisie wyszukiwania zastosowaliśmy dynamiczny próg `similarity__gt` zależny od długości zapytania oraz ograniczyliśmy queryset do niezbędnych pól (`tconst`, `primary_title`, `start_year`, `avg_rating`, `poster_path`, `num_votes`) z rankingiem opartym kolejno o similarity → `num_votes` (NULL trafiają na koniec) → `avg_rating` → `start_year`.
- Rozszerzyliśmy API o pole `num_votes` (na potrzeby sortowania popularności) i zaktualizowaliśmy testy jednostkowe/serializację.
- Dodaliśmy warstwę cache (Redis z fallbackiem do `LocMemCache`), konfigurowalny TTL (`MOVIE_SEARCH_CACHE_TIMEOUT`) oraz obsługę błędów cache.
- Rozbudowaliśmy logowanie w `search_movies` o telemetryczny payload (`cache hit/miss`, próg similarity, czasy DB/serializacji/cache, liczba wyników, liczba zapytań w trybie DEBUG).

## Testy

- `python manage.py migrate`
- `python manage.py check_movie_search_index --search "Matrix"`
- `python manage.py test services.tests.test_movie_search_service`

## Rekomendacje produkcyjne

- **Redis**: włączyć trwałość (snapshoty RDB lub AOF) i monitoring; uruchomić jako usługę systemową lub kontener z restart policy. Rozważyć osobny cache TTL dla środowisk produkcyjnych (np. 120 s) poprzez `MOVIE_SEARCH_CACHE_TIMEOUT`.
- **Logi**: rozszerzyć konfigurację `LOGGING` o `FileHandler` lub wysyłkę do centralnego systemu (ELK/Datadog). Zapewnić rotację i indeksowanie po polu `movie_search`.
- **Observability**: dodać alerty na niedostępność Redis (timeouty w logach), monitorować rozmiar cache i czas wykonywania zapytań. Warto rozważyć eksport metryk do Prometheusa (np. liczniki cache hit/miss).
- **Ranking**: na bazie `num_votes` i telemetrycznych danych ocenić potrzebę dalszych zmian sortowania (popularność vs. similarity) i ewentualnych wag sezonowych.

## Kolejne kroki

- Obserwować wpływ nowych progów similarity oraz cache na obciążenie Postgresa i czasy odpowiedzi; w razie potrzeby dostroić wartości progów lub TTL cache.
- Przygotować scenariusze testowe dla realnych danych, aby potwierdzić stabilność wyników i ewentualnie dopracować ranking z użyciem `num_votes`.