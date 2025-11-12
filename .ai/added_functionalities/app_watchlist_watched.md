# Ulepszenia wizualne dla kart filmów w Watchlist / Watched

W ramach tej sesji wprowadzono szereg modyfikacji w komponentach `MovieCard.tsx` (dla `/app/watchlist`) i `UserMovieCard.tsx` (dla `/app/watched`), aby poprawić ich wygląd, czytelność i użyteczność. Zmiany objęły również inne komponenty w aplikacji, które współdzieliły logikę wyświetlania plakatów.

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

5.  **Refaktoryzacja `TMDBPoster`:**
    - Przeprowadzono refaktoryzację komponentu `TMDBPoster`, aby używał wzorca "render prop". Pozwoliło to na bardziej elastyczne zarządzanie wyglądem, w tym na warunkowe ustawianie tła (`bg-white` dla placeholderów, `bg-muted` dla prawdziwych plakatów).
    - Zaktualizowano wszystkie komponenty używające `TMDBPoster` (`MovieCard`, `UserMovieCard`, `SuggestionCard`, `MovieListItem`, `UserMovieRow`, `MovieRow`) do nowej składni.

6.  **Refaktoryzacja komponentów wyszukiwania:**
    - Zunifikowano komponenty `WatchedSearchCombobox` i `MovieSearchCombobox` w jeden, reużywalny `MovieSearchCombobox`, eliminując duplikację kodu i zapewniając spójne działanie w całym procesie onboardingu.

**Uwaga:** Widok listy (`MovieList` / `WatchedList`) został dostosowany do zmian w `TMDBPoster`, ale może wymagać dalszych poprawek wizualnych w przyszłości.

## Finalna struktura `div`-ów (dla widoku siatki)

Poniżej przedstawiono ostateczną, zagnieżdżoną strukturę komponentów po wszystkich modyfikacjach.

### `MovieCard.tsx` (Watchlista)

<article class="... flex flex-col">
|
|-- 1. (Render Prop z TMDBPoster)
| |-- DIV (Kontener plakatu, warunkowe tło)
| |-- <img /> (Plakat)
|
|-- 2. DIV (Treść, class="... p-4 flex flex-col flex-grow")
|
|-- <TooltipProvider>
| |-- <Tooltip>
| |
| |-- <TooltipTrigger>
| | |-- A. DIV (Górna Grupa)
| | |-- <h3> (Tytuł)
| | |-- <div> (Rok, Gatunki)
| | |-- <div> (Ocena)
| |
| |-- <TooltipContent>
| |-- <p> (Pełny tytuł)
| |-- <p> (Rok | Gatunek)
|
|-- B. DIV (Dolna Grupa, class="mt-auto ...")
|-- <div>
| |-- <AvailabilityIcons />
|
|-- <div> (Przyciski Akcji)
|-- <Button> ("Obejrzane")
|-- <Button> ("Usuń")



### `UserMovieCard.tsx` (Obejrzane)

<article class="... flex flex-col">
|
|-- 1. (Render Prop z TMDBPoster)
| |-- DIV (Kontener plakatu, warunkowe tło)
| |-- <img /> (Plakat)
|
|-- 2. DIV (Treść, class="... p-4 flex flex-col flex-grow")
|
|-- <TooltipProvider>
| |-- <Tooltip>
| |
| |-- <TooltipTrigger>
| | |-- A. DIV (Górna Grupa)
| | |-- <h3> (Tytuł)
| | |-- <div> (Rok, Gatunki)
| | |-- <div> (Ocena)
| |
| |-- <TooltipContent>
| |-- <p> (Pełny tytuł)
| |-- <p> (Rok | Gatunek)
|
|-- B. DIV (Dolna Grupa, class="mt-auto ...")
|-- <div>
| |-- <AvailabilityIcons />
|
|-- <div> (Data obejrzenia)
|
|-- <div> (Przyciski Akcji)
|-- <Button> ("Przywróć")
|-- <Button> ("Usuń")