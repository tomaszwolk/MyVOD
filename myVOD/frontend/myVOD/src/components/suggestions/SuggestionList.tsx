import { memo } from "react";
import { SuggestionCard } from "./SuggestionCard";
import type { AISuggestionCardVM } from "@/types/view/suggestions.types";
import type { PlatformDto } from "@/types/api.types";

/**
 * Props for SuggestionList component.
 */
type SuggestionListProps = {
  items: AISuggestionCardVM[];
  onAdd: (tconst: string) => Promise<void>;
  addedSet: Set<string>;
  watchlistTconstSet: Set<string>;
  isAddingByTconst: Record<string, boolean>;
  platforms: PlatformDto[];
};

/**
 * Grid layout displaying list of suggestion cards.
 * Responsive: 1-2 columns on mobile, 3-4 on desktop.
 */
export const SuggestionList = memo<SuggestionListProps>(function SuggestionList({
  items,
  onAdd,
  addedSet,
  watchlistTconstSet,
  isAddingByTconst,
  platforms,
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div 
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
      role="list"
      aria-label="Lista sugestii filmów od AI"
    >
      {items.map((item) => {
        const isAlreadyOnWatchlist = watchlistTconstSet.has(item.tconst);
        const isAdded = addedSet.has(item.tconst);
        const isAdding = isAddingByTconst[item.tconst] || false;

        return (
          <div key={item.tconst} role="listitem">
            <SuggestionCard
              item={item}
              isAlreadyOnWatchlist={isAlreadyOnWatchlist || isAdded}
              isAdding={isAdding}
              onAdd={() => onAdd(item.tconst)}
              platforms={platforms}
            />
          </div>
        );
      })}
    </div>
  );
});

