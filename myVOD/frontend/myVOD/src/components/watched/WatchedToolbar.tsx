import { WatchedViewToggle } from "./WatchedViewToggle";
import { WatchedSortDropdown } from "./WatchedSortDropdown";
import { SearchCombobox } from "../watchlist/SearchCombobox";
import { MediaToolbar } from "@/components/library/MediaToolbar";
import { SuggestAIButton } from "@/components/watchlist/SuggestAIButton";
import { WatchedFiltersBar } from "./WatchedFiltersBar";
import type { WatchedViewMode, WatchedSortKey } from "@/types/view/watched.types";

/**
 * Props for WatchedToolbar component.
 */
type WatchedToolbarProps = {
  viewMode: WatchedViewMode;
  onViewModeChange: (mode: WatchedViewMode) => void;
  sortKey: WatchedSortKey;
  onSortKeyChange: (key: WatchedSortKey) => void;
  onAddToWatchlist: (tconst: string) => Promise<void> | void;
  onAddToWatched: (tconst: string) => Promise<void> | void;
  existingWatchlistTconsts: string[];
  existingWatchedTconsts: string[];
  onSuggest: () => void;
  isSuggestDisabled: boolean;
  nextAvailableAt?: Date | string | null;
  hideUnavailable: boolean;
  onToggleHideUnavailable: () => void;
  visibleCount: number;
  totalCount: number;
  hasUserPlatforms: boolean;
};

/**
 * Toolbar for watched movies page with view toggle and sort dropdown.
 * Responsive layout with Tailwind CSS.
 */
export function WatchedToolbar({
  viewMode,
  onViewModeChange,
  sortKey,
  onSortKeyChange,
  onAddToWatchlist,
  onAddToWatched,
  existingWatchlistTconsts,
  existingWatchedTconsts,
  onSuggest,
  isSuggestDisabled,
  nextAvailableAt,
  hideUnavailable,
  onToggleHideUnavailable,
  visibleCount,
  totalCount,
  hasUserPlatforms,
}: WatchedToolbarProps) {
  return (
    <MediaToolbar
      searchSlot={
        <SearchCombobox
          onAddToWatchlist={onAddToWatchlist}
          onAddToWatched={onAddToWatched}
          existingTconsts={existingWatchlistTconsts}
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
          <WatchedViewToggle
            value={viewMode}
            onChange={onViewModeChange}
          />
          <WatchedSortDropdown
            value={sortKey}
            onChange={onSortKeyChange}
          />
        </>
      }
      secondaryControlsSlot={
        <WatchedFiltersBar
          hideUnavailable={hideUnavailable}
          onToggle={onToggleHideUnavailable}
          visibleCount={visibleCount}
          totalCount={totalCount}
          hasUserPlatforms={hasUserPlatforms}
        />
      }
    />
  );
}
