import { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useMovieSearch } from "@/hooks/useMovieSearch";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { TMDBPoster } from "@/components/TMDBPoster";
import type { SearchOptionVM } from "@/types/api.types";
import { Loader2, BookmarkPlus, Eye, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Props for OnboardingMovieActions component.
 */
type OnboardingMovieActionsProps = {
  movie: SearchOptionVM;
  onAddToWatchlist: (movie: SearchOptionVM) => void;
  onMarkAsWatched: (movie: SearchOptionVM) => void;
  onRate: (movie: SearchOptionVM) => void;
  ariaLabelPrefix: string;
};

/**
 * Component with actions for a movie in the onboarding search results.
 */
function OnboardingMovieActions({
  movie,
  onAddToWatchlist,
  onMarkAsWatched,
  onRate,
  ariaLabelPrefix,
}: OnboardingMovieActionsProps) {
  return (
    <div className="flex-shrink-0 flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          onAddToWatchlist(movie);
        }}
        aria-label={`${ariaLabelPrefix} ${movie.primaryTitle} to watchlist`}
        title="Dodaj do watchlisty"
      >
        <BookmarkPlus className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          onMarkAsWatched(movie);
        }}
        aria-label={`${ariaLabelPrefix} ${movie.primaryTitle} as watched`}
        title="Oznacz jako obejrzany"
      >
        <Eye className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          onRate(movie);
        }}
        aria-label={`Rate ${movie.primaryTitle}`}
        title="Oceń film"
      >
        <Star className="h-5 w-5" />
      </Button>
    </div>
  );
}

/**
 * Props for MovieSearchCombobox component.
 */
type MovieSearchComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  onAddToWatchlist: (movie: SearchOptionVM) => void;
  onMarkAsWatched: (movie: SearchOptionVM) => void;
  onRate: (movie: SearchOptionVM) => void;
  disabled?: boolean;
  selectedTconsts: Set<string>;
  placeholder?: string;
  ariaLabel?: string;
  testId?: string;
};

/**
 * Movie search combobox for marking movies as watched.
 * Provides debounced search with keyboard navigation and ARIA accessibility.
 */
export function MovieSearchCombobox({
  value,
  onChange,
  onAddToWatchlist,
  onMarkAsWatched,
  onRate,
  disabled = false,
  selectedTconsts,
  placeholder = "Szukaj filmów...",
  ariaLabel = "Wyszukaj film",
  testId = "movie-search-combobox",
}: MovieSearchComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebouncedValue(value, 450);

  const movieSearch = useMovieSearch(debouncedQuery);
  const { isLoading, error, metrics } = movieSearch;

  const results = useMemo(() => movieSearch.data ?? [], [movieSearch.data]);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(-1);
  }, [results]);

  // Reset active index and close popover when query changes
  useEffect(() => {
    if (value.length < 2) {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  }, [value]);

  const handleInputChange = (newValue: string) => {
    onChange(newValue);
    setIsOpen(newValue.length >= 2 && !disabled);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0 || disabled) return;

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
          if (!selectedTconsts.has(selectedItem.tconst)) {
            // Default action on Enter is to add to watchlist
            onAddToWatchlist(selectedItem);
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

  const handleSelectOption = (movie: SearchOptionVM) => {
    if (disabled || selectedTconsts.has(movie.tconst)) return;

    // This function is now only for click events on the list item itself
    onAddToWatchlist(movie);
  };

  const activeId =
    activeIndex >= 0 ? `result-${results[activeIndex]?.tconst}` : undefined;

  return (
    <div className="relative">
      <Popover open={isOpen && !disabled} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              ref={inputRef}
              type="text"
              placeholder={disabled ? "Osiągnięto limit" : placeholder}
              value={value}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              role="combobox"
              aria-expanded={isOpen && !disabled}
              aria-haspopup="listbox"
              aria-autocomplete="list"
              aria-activedescendant={activeId}
              className="w-full"
              data-testid={testId}
            />
            {isLoading && !disabled && (
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
        >
          {error ? (
            <div className="p-4 text-center text-destructive text-sm">
              Nie udało się pobrać wyników wyszukiwania. Spróbuj ponownie
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Nie znaleziono filmów
            </div>
          ) : (
            <ul
              role="listbox"
              aria-label="Movie search results"
              className="max-h-[300px] overflow-y-auto"
              data-testid="search-results-list"
            >
              {results.map((movie, index) => {
                const isSelected = selectedTconsts.has(movie.tconst);
                const isActive = index === activeIndex;

                return (
                  <li
                    key={movie.tconst}
                    id={`result-${movie.tconst}`}
                    role="option"
                    aria-selected={isActive}
                    aria-disabled={isSelected}
                    className={`flex items-center gap-3 p-3 cursor-pointer ${
                      isActive ? "bg-accent" : "hover:bg-accent"
                    } ${isSelected ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={() => handleSelectOption(movie)}
                    tabIndex={isSelected ? -1 : 0}
                  >
                    {/* Poster */}
                    <TMDBPoster
                      src={movie.posterUrl}
                      alt={`${movie.primaryTitle} poster`}
                      width={50}
                      height={75}
                      className="w-full h-full object-cover"
                    >
                      {({ isPlaceholder, imgProps }) => (
                        <div
                          className={cn(
                            "flex-shrink-0 w-[50px] h-[75px] rounded overflow-hidden",
                            isPlaceholder ? "bg-white" : "bg-muted"
                          )}
                        >
                          <img
                            {...imgProps}
                            alt={`${movie.primaryTitle} poster`}
                            width={50}
                            height={75}
                            loading="lazy"
                          />
                        </div>
                      )}
                    </TMDBPoster>

                    {/* Movie info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate">
                        {movie.primaryTitle}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {movie.startYear && <span>{movie.startYear}</span>}
                        {movie.avgRating && (
                          <>
                            <span>•</span>
                            <span>⭐ {movie.avgRating}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    {!isSelected && (
                      <OnboardingMovieActions
                        movie={movie}
                        onAddToWatchlist={onAddToWatchlist}
                        onMarkAsWatched={onMarkAsWatched}
                        onRate={onRate}
                        ariaLabelPrefix="Onboarding action"
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </PopoverContent>
      </Popover>

      {import.meta.env.DEV && metrics.lastDurationMs != null && (
        <p className="mt-2 text-xs text-muted-foreground">
          Ostatnie wyszukiwanie "{metrics.lastQuery}" trwało{" "}
          {Math.round(metrics.lastDurationMs)} ms • ukończone:{" "}
          {metrics.completedCount} • anulowane: {metrics.abortedCount}
        </p>
      )}
    </div>
  );
}
