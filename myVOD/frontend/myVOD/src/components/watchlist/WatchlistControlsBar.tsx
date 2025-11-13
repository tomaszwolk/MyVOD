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
