import { SearchCombobox } from "./SearchCombobox";
import { ViewToggle } from "./ViewToggle";
import { SortDropdown } from "@/components/ui/SortDropdown";
import { FiltersBar } from "./FiltersBar";
import { SuggestAIButton } from "./SuggestAIButton";
import { MediaToolbar } from "@/components/library/MediaToolbar";
import type {
  ViewMode,
  SortOption,
  FiltersState,
} from "@/types/view/watchlist.types";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

/**
 * Props for WatchlistControlsBar component.
 */
type WatchlistControlsBarProps = {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sort: SortOption;
  onSortChange: (option: SortOption) => void;
  filters: FiltersState;
  onFiltersChange: (filters: FiltersState) => void;
  visibleCount: number;
  totalCount: number;
  hasUserPlatforms: boolean;
  onSuggest: () => void;
  isSuggestDisabled: boolean;
  nextAvailableAt?: Date | string | null;
  onAddToWatchlist: (tconst: string) => Promise<void> | void;
  onAddToWatched: (tconst: string) => Promise<void> | void;
  existingTconsts: string[];
  existingWatchedTconsts: string[];
  isFiltersOpen: boolean;
  onToggleFilters: () => void;
};

/**
 * Control bar for watchlist page with search, view toggle, sort, filters, and AI suggestions.
 * Responsive layout with Tailwind CSS.
 */
export function WatchlistControlsBar({
  viewMode,
  onViewModeChange,
  sort,
  onSortChange,
  filters,
  onFiltersChange,
  visibleCount,
  totalCount,
  hasUserPlatforms,
  onSuggest,
  isSuggestDisabled,
  nextAvailableAt,
  onAddToWatchlist,
  onAddToWatched,
  existingTconsts,
  existingWatchedTconsts,
  isFiltersOpen,
  onToggleFilters,
}: WatchlistControlsBarProps) {
  return (
    <MediaToolbar
      searchSlot={
        <SearchCombobox
          onAddToWatchlist={onAddToWatchlist}
          onAddToWatched={onAddToWatched}
          existingTconsts={existingTconsts}
          existingWatchedTconsts={existingWatchedTconsts}
        />
      }
      primaryActionsSlot={
        <SuggestAIButton
          onClick={onSuggest}
          disabled={isSuggestDisabled}
          nextAvailableAt={nextAvailableAt}
        />
      }
      viewControlsSlot={
        <>
          <ViewToggle value={viewMode} onChange={onViewModeChange} />
          <SortDropdown value={sort} onChange={onSortChange} />
          <Button variant="outline" onClick={onToggleFilters} className="gap-1">
            Filtry
            {isFiltersOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </>
      }
      secondaryControlsSlot={
        <FiltersBar
          filters={filters}
          onChange={onFiltersChange}
          visibleCount={visibleCount}
          totalCount={totalCount}
          hasUserPlatforms={hasUserPlatforms}
        />
      }
    />
  );
}
