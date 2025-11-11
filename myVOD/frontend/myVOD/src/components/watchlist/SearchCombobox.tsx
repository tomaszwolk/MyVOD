import { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMovieSearch } from "@/hooks/useMovieSearch";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { Loader2, Search } from "lucide-react";
import { TMDBPoster } from "@/components/TMDBPoster";
import { SearchNoResultsItem } from "@/components/SearchNoResultsItem";
import type { SearchOptionVM } from "@/types/api.types";

/**
 * Props for SearchCombobox component.
 */
type SearchComboboxProps = {
  onAddToWatchlist: (tconst: string) => Promise<void> | void;
  onAddToWatched: (tconst: string) => Promise<void> | void;
  existingTconsts: string[];
  existingWatchedTconsts: string[];
};

/**
 * Search combobox for adding movies to watchlist.
 * Provides debounced search with autocomplete functionality.
 */
export function SearchCombobox({ onAddToWatchlist, onAddToWatched, existingTconsts, existingWatchedTconsts }: SearchComboboxProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [pendingTconst, setPendingTconst] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebouncedValue(query, 250);

  const movieSearch = useMovieSearch(debouncedQuery);
  const results = useMemo(() => movieSearch.data ?? [], [movieSearch.data]);
  const { isLoading, error } = movieSearch;

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(-1);
  }, [results]);

  // Reset popover and active index when query changes
  useEffect(() => {
    if (query.length < 2) {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  }, [query]);

  const closeAndReset = () => {
    setQuery("");
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const executeAction = async (
    action: () => Promise<void> | void,
    options: { shouldReset?: boolean } = {}
  ) => {
    const { shouldReset = true } = options;
    try {
      const maybePromise = action();
      if (maybePromise instanceof Promise) {
        await maybePromise;
      }
      if (shouldReset) {
        closeAndReset();
      }
    } catch {
      // Error feedback is handled by the caller (toast notifications).
    } finally {
      setPendingTconst(null);
    }
  };

  const handleAddToWatchlist = async (result: SearchOptionVM) => {
    if (pendingTconst) {
      return;
    }

    if (existingTconsts.includes(result.tconst)) {
      return;
    }

    setPendingTconst(result.tconst);
    await executeAction(() => onAddToWatchlist(result.tconst), { shouldReset: false });
  };

  const handleAddToWatched = async (result: SearchOptionVM) => {
    if (pendingTconst) {
      return;
    }

    if (existingWatchedTconsts.includes(result.tconst)) {
      return;
    }

    setPendingTconst(result.tconst);
    await executeAction(() => onAddToWatched(result.tconst), { shouldReset: false });
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (value.length >= 2) {
      setIsOpen(true);
    }
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
          if (!existingTconsts.includes(selectedItem.tconst)) {
            void handleAddToWatchlist(selectedItem);
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

  const activeId = activeIndex >= 0 ? `result-${results[activeIndex]?.tconst}` : undefined;

  return (
    <div className="relative">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Szukaj filmu..."
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10 pr-4 text-foreground placeholder:text-muted-foreground"
              role="combobox"
              aria-expanded={isOpen}
              aria-haspopup="listbox"
              aria-autocomplete="list"
              aria-activedescendant={activeId}
              aria-label="Wyszukaj film"
              data-testid="header-movie-search"
            />
            {isLoading && (
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
              </div>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-full p-0 text-foreground border border-border shadow-lg"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
          style={{ 
            width: inputRef.current?.offsetWidth,
            backgroundColor: 'var(--search-popover-background)'
          }}
        >
          {error ? (
            <div className="p-4 text-center text-destructive text-sm">
              Nie udało się pobrać wyników wyszukiwania. Spróbuj ponownie
            </div>
          ) : null}

          {!error && results.length === 0 && query.length >= 2 && !isLoading && (
            <SearchNoResultsItem query={query} />
          )}

          {results.length > 0 && (
            <div
              className="max-h-60 overflow-y-auto divide-y divide-border"
              style={{ backgroundColor: 'var(--search-popover-background)' }}
              role="listbox"
              data-testid="search-results-list"
            >
              {results.slice(0, 10).map((result, index) => {
                const isActive = index === activeIndex;
                const isOnWatchlist = existingTconsts.includes(result.tconst);
                const isPending = pendingTconst === result.tconst;
                const isWatched = existingWatchedTconsts.includes(result.tconst);

                return (
                  <div
                    key={result.tconst}
                    id={`result-${result.tconst}`}
                    role="option"
                    aria-selected={isActive}
                    className={`flex flex-col gap-3 p-3 transition-colors ${
                      isActive ? "bg-accent/80" : "hover:bg-accent/40"
                    }`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(-1)}
                    onClick={(event) => {
                      // Ignorujemy kliknięcia w obszar tła – reagują tylko przyciski
                      event.preventDefault();
                    }}
                    aria-busy={isPending}
                    data-testid={`search-result-item-${result.tconst}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-18 bg-muted rounded flex-shrink-0">
                        <TMDBPoster
                          src={result.posterUrl}
                          alt={result.primaryTitle}
                          width={48}
                          height={72}
                          className="w-full h-full object-cover rounded"
                        />
                      </div>
                      <div className="flex flex-1 flex-col justify-between self-stretch min-w-0">
                        <div>
                          <div className="font-medium text-sm truncate text-foreground">
                            {result.primaryTitle}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {result.startYear && `${result.startYear}`} • 
                            ⭐ {result.avgRating ? `${result.avgRating}/10` : "Brak oceny"}
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="whitespace-nowrap"
                            disabled={isOnWatchlist || isPending}
                            aria-label={isOnWatchlist ? "Film jest już na watchliście" : `Dodaj ${result.primaryTitle} do watchlist`}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              void handleAddToWatchlist(result);
                            }}
                            onMouseDown={(event) => event.preventDefault()}
                          >
                            + do watchlist
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="whitespace-nowrap"
                            disabled={isPending || isWatched}
                            aria-label={isWatched ? "Film jest już na liście obejrzanych" : `Dodaj ${result.primaryTitle} do obejrzanych`}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              void handleAddToWatched(result);
                            }}
                            onMouseDown={(event) => event.preventDefault()}
                          >
                            + do obejrzane
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
