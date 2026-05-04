# Plan Wdrożenia: Mechanizm Synchronizacji Dostępności VOD (Streaming)

## Cel:
Stworzenie niezawodnego, uruchamianego na żądanie mechanizmu do pełnej synchronizacji dostępności filmów dla jednej lub wszystkich platform VOD, z wykorzystaniem darmowego API Watchmode. Mechanizm będzie odporny na timeouty HTTP dzięki zastosowaniu streamingu odpowiedzi i będzie dostarczał logi w czasie rzeczywistym do interfejsu administratora.

---

## Faza 1: Backend

### 1. Usługa `AvailabilitySyncService`
- **Lokalizacja:** `backend/services/availability_sync_service.py`
- **Klasa:** `AvailabilitySyncService`
- **Metody:**
    - **`sync_platform(self, platform_slug)`:**
        - **Typ:** Generator (używa `yield`).
        - **Logika:**
            1. Pobiera wszystkie tytuły z Watchmode API dla danego `platform_slug` (obsługując paginację).
            2. W pamięci tworzy dwa zbiory danych:
                - `api_watchmode_ids`: Zbiór (`set`) wszystkich `id` filmów z API.
                - `api_imdb_to_watchmode_map`: Słownik (`dict`) mapujący `imdb_id` na `watchmode_id`.
            3. Pobiera z lokalnej bazy (`movie_availability`) wszystkie `tconst` dla danej platformy, gdzie `is_available = true` do zbioru `db_tconsts`.
            4. Porównuje dane i `yield`-uje logi na każdym etapie.
            5. **Obsługa usunięć:** Dla `tconst` obecnych w `db_tconsts`, ale nie w `api_imdb_to_watchmode_map`, aktualizuje `movie_availability` ustawiając `is_available = false`.
            6. **Obsługa dodawania/aktualizacji:**
                - Iteruje po `api_imdb_to_watchmode_map`.
                - Wyszukuje film w tabeli `movie` po `imdb_id` (`tconst`).
                - Jeśli film istnieje, ale nie ma `watchmode_id`, uzupełnia je.
                - Używa `MovieAvailability.objects.update_or_create`, aby ustawić `is_available = true`.
        - **Zwraca (przez `yield`):** Kolejne linie logów tekstowych informujące o postępie.
    - **`sync_all_platforms(self)`:**
        - **Typ:** Generator (używa `yield`).
        - **Logika:**
            1. Pobiera listę wszystkich `platform_slug` z `settings.VOD_PLATFORMS`.
            2. W pętli, dla każdego `slug`, wywołuje `yield from self.sync_platform(platform_slug=slug)`.
            3. `yield`-uje dodatkowe logi informujące o rozpoczęciu/zakończeniu synchronizacji dla każdej platformy oraz o rozpoczęciu/zakończeniu całego procesu.

### 2. Widok API
- **Endpoint:** `POST /api/admin/tasks/trigger-availability-sync/`
- **Uprawnienia:** Dostępny tylko dla administratorów (`is_staff = true`).
- **Request Body:**
  ```json
  {
    "platform_slug": "netflix" 
  }
  ```
  lub
  ```json
  {
    "platform_slug": "__all__"
  }
  ```
- **Logika Widoku:**
    1. Pobiera `platform_slug` z ciała żądania.
    2. Jeśli `platform_slug == '__all__'`, wywołuje `service.sync_all_platforms()`.
    3. W przeciwnym razie, wywołuje `service.sync_platform(platform_slug)`.
    4. Wynikowy generator jest przekazywany do `django.http.StreamingHttpResponse`.
- **Odpowiedź:** `200 OK` z `Content-Type: text/plain`, zawierająca strumieniowane logi.

---

## Faza 2: Frontend

### 1. Modyfikacja Admin Dashboard
- **Lokalizacja:** `/app/admin/dashboard`
- **Nowy komponent:** `AvailabilitySyncSection.tsx`

### 2. Komponent `AvailabilitySyncSection.tsx`
- **Elementy UI:**
    - **Dropdown (`Select`):** Zawiera listę platform pobraną z `/api/platforms/` oraz dodatkową, statyczną opcję "Wszystkie Platformy" z wartością `__all__`.
    - **Przycisk (`Button`):** "Uruchom Synchronizację".
    - **Pole na logi:** Preformatowany blok tekstowy (`<pre>`), który będzie wyświetlał logi w czasie rzeczywistym.
- **Logika:**
    - **Stan:** Zarządzanie stanem ładowania (`isLoading`), aby blokować UI podczas synchronizacji.
    - **API Call:** Użycie natywnego **Fetch API** do wysłania żądania `POST`.
    - **Obsługa strumienia:**
        1. Po wysłaniu żądania, otwiera `response.body.getReader()` do czytania strumienia.
        2. W pętli odczytuje kolejne fragmenty (`chunk`) danych.
        3. Dekoduje je (UTF-8) i dopisuje do stanu, który jest wyświetlany w polu logów.
    - **UX:** Admin widzi na żywo postęp operacji. Po zakończeniu strumienia, interfejs jest odblokowywany i wyświetlany jest toast z podsumowaniem.
