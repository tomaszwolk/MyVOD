import { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SearchResultsList } from "./SearchResultsList";
import { useMovieSearch } from "@/hooks/useMovieSearch";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { SearchOptionVM } from "@/types/api.types";
import { Loader2 } from "lucide-react";

/**
 * Props for MovieSearchCombobox component.
 */
type MovieSearchComboboxProps = {
  disabledTconsts: Set<string>;
  onSelectOption: (item: SearchOptionVM) => void;
};

/**
 * Movie search combobox with autocomplete functionality.
 * Provides debounced search with keyboard navigation and ARIA accessibility.
 */
export function MovieSearchCombobox({
  disabledTconsts,
  onSelectOption,
}: MovieSearchComboboxProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebouncedValue(query, 450);

  const movieSearch = useMovieSearch(debouncedQuery);
  const { isLoading, error, metrics } = movieSearch;

  const results = useMemo(() => movieSearch.data ?? [], [movieSearch.data]);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(-1);
  }, [results]);

  // Reset active index and close popover when query changes
  useEffect(() => {
    if (query.length < 2) {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  }, [query]);

  const handleInputChange = (value: string) => {
    setQuery(value);
    setIsOpen(value.length >= 2);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((prev) => (prev + 1) % results.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((prev) => (prev - 1 + results.length) % results.length);
        break;
      case "Enter":
        event.preventDefault();
        if (activeIndex >= 0 && activeIndex < results.length) {
          const selectedItem = results[activeIndex];
          if (!disabledTconsts.has(selectedItem.tconst)) {
            handleSelectOption(selectedItem);
          }
        }
        break;
      case "Escape":
        event.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSelectOption = (item: SearchOptionVM) => {
    if (disabledTconsts.has(item.tconst)) return;

    onSelectOption(item);
    // Keep search results visible after adding a movie to allow adding multiple movies
    // Don't clear query, close popover, or reset active index
  };

  const activeId = activeIndex >= 0 ? `result-${results[activeIndex]?.tconst}` : undefined;

  return (
    <div className="relative">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Szukaj filmów..."
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              role="combobox"
              aria-expanded={isOpen}
              aria-haspopup="listbox"
              aria-autocomplete="list"
              aria-activedescendant={activeId}
              className="w-full"
              data-testid="movie-search-combobox"
            />
            {isLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-full p-0 bg-popover"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
          style={{ backgroundColor: 'var(--search-popover-background)' }}
        >
          {error ? (
            <div className="p-4 text-center text-destructive text-sm">
              Nie udało się pobrać wyników wyszukiwania. Spróbuj ponownie
            </div>
          ) : (
            <SearchResultsList
              items={results}
              activeIndex={activeIndex}
              onPick={handleSelectOption}
              disabledTconsts={disabledTconsts}
            />
          )}
        </PopoverContent>
      </Popover>

      {import.meta.env.DEV && metrics.lastDurationMs != null && (
        <p className="mt-2 text-xs text-muted-foreground">
          Ostatnie wyszukiwanie "{metrics.lastQuery}" trwało {Math.round(metrics.lastDurationMs)} ms • ukończone: {metrics.completedCount} • anulowane: {metrics.abortedCount}
        </p>
      )}
    </div>
  );
}
