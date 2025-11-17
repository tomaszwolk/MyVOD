import { SearchCombobox } from "../watchlist/SearchCombobox";
import { ViewToggle } from "../watchlist/ViewToggle";
import { SortDropdown } from "@/components/ui/SortDropdown";
import { Badge } from "@/components/ui/badge";
import { MediaToolbar } from "@/components/library/MediaToolbar";
import { SuggestAIButton } from "@/components/watchlist/SuggestAIButton";
import type { ViewMode, SortOption } from "@/types/view/watchlist.types";

/**
 * Props for OnVODToolbar component.
 */
type OnVODToolbarProps = {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sort: SortOption;
  onSortChange: (option: SortOption) => void;
  onSuggest: () => void;
  isSuggestDisabled: boolean;
  nextAvailableAt?: Date | string | null;
  visibleCount: number;
  totalCount: number;
};

/**
 * Toolbar for onVOD page with search, view toggle, and AI suggestions.
 * Similar to WatchedToolbar but without sorting and filters.
 */
export function OnVODToolbar({
  viewMode,
  onViewModeChange,
  sort,
  onSortChange,
  onSuggest,
  isSuggestDisabled,
  nextAvailableAt,
  visibleCount,
  totalCount,
}: OnVODToolbarProps) {
  return (
    <MediaToolbar
      searchSlot={
        <SearchCombobox
          onAddToWatchlist={() => Promise.resolve()} // No-op for onVOD
          onAddToWatched={() => Promise.resolve()} // No-op for onVOD
          existingTconsts={[]} // Empty for onVOD
          existingWatchedTconsts={[]} // Empty for onVOD
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
        <Badge variant="secondary" className="text-xs">
          Wyświetlane: {visibleCount}/{totalCount}
        </Badge>
      }
    />
  );
}
