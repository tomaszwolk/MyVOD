# Ulepszenia wizualne dla kart filmów w Watchlist / Watched

W ramach tej sesji wprowadzono szereg modyfikacji w komponentach `MovieCard.tsx` (dla `/app/watchlist`) i `UserMovieCard.tsx` (dla `/app/watched`), aby poprawić ich wygląd, czytelność i użyteczność.

## Podsumowanie wprowadzonych zmian

1.  **Poprawione wyrównanie treści:**
    - Zastosowano Flexbox, aby podzielić treść karty na dwie grupy: górną (tytuł, meta-dane, ocena) i dolną (ikony dostępności, przyciski).
    - Górna grupa jest zawsze wyrównana do góry, a dolna do dołu, co zapewnia spójny wygląd kart, niezależnie od długości tytułu.

2.  **Tooltip dla długich tytułów:**
    - Dodano tooltip, który pojawia się po najechaniu myszką na górną sekcję karty.
    - Tooltip wyświetla pełną, nieprzyciętą nazwę filmu oraz jego rok produkcji i gatunki, co rozwiązuje problem nieczytelności długich tytułów.

3.  **Naprawa podwójnych tooltipów:**
    - Usunięto zbędny atrybut `title` z ikon platform VOD, co wyeliminowało problem pojawiania się dwóch tooltipów (jednego domyślnego przeglądarki i jednego stylizowanego) w tym samym czasie.

4.  **Zmiana wskaźnika dostępności:**
    - Usunięto nakładkę z napisem "Niedostępny" z plakatu filmu.
    - Zamiast tego, plakietka "Dostępność nieznana" (pojawiająca się w miejscu ikon VOD) została przestylizowana na ten sam czerwony, ostrzegawczy kolor, co zapewnia spójność wizualną.

5.  **Usunięcie efektu `hover`:**
    - Naprawiono problem, w którym czerwona plakietka "Dostępność nieznana" zmieniała tło po najechaniu myszką, stając się nieczytelna. Efekt `hover` został usunięty dla tej konkretnej plakietki.

## Finalna struktura `div`-ów

Poniżej przedstawiono ostateczną, zagnieżdżoną strukturę komponentów po wszystkich modyfikacjach.

### `MovieCard.tsx` (Watchlista)
