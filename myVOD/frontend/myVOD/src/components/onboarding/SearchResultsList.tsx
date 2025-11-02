import { SearchResultItem } from "./SearchResultItem";
import type { SearchOptionVM } from "@/types/api.types";

/**
 * Props for SearchResultsList component.
 */
type SearchResultsListProps = {
  items: SearchOptionVM[];
  activeIndex: number;
  onPick: (item: SearchOptionVM) => void;
  disabledTconsts: Set<string>;
};

/**
 * Scrollable list of search results with keyboard navigation support.
 * Displays up to 10 movie search results with proper ARIA attributes.
 */
export function SearchResultsList({
  items,
  onPick,
  disabledTconsts,
}: SearchResultsListProps) {
  if (items.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        Nie znaleziono filmów
      </div>
    );
  }

  return (
    <ul
      role="listbox"
      className="max-h-80 overflow-y-auto"
      aria-label="Movie search results"
      style={{ backgroundColor: 'var(--search-popover-background)' }}
    >
      {items.map((item) => (
        <SearchResultItem
          key={item.tconst}
          item={item}
          disabled={disabledTconsts.has(item.tconst)}
          onAdd={onPick}
        />
      ))}
    </ul>
  );
}
