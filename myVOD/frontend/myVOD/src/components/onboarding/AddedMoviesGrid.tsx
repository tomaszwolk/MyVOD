import { AddedMovieCard } from "./AddedMovieCard";
import { Badge } from "@/components/ui/badge";
import type { AddedMovieVM } from "@/types/api.types";

/**
 * Props for AddedMoviesGrid component.
 */
type AddedMoviesGridProps = {
  items: AddedMovieVM[];
  onRemove: (item: AddedMovieVM) => void;
  removingTconsts?: Set<string>;
};

/**
 * Responsive grid displaying added movies in the onboarding session.
 * Shows up to 3 movie cards in a responsive layout.
 */
export function AddedMoviesGrid({ items, onRemove, removingTconsts }: AddedMoviesGridProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">Brak dodanych filmów</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          Dodane filmy
        </h3>
        <Badge variant="secondary" data-testid="added-movies-counter">
          {items.length}/3
        </Badge>
      </div>

      {/* Responsive grid - 1 column on mobile, 2 on tablet, 3 on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div
            key={item.tconst}
            className="bg-card border rounded-lg p-3 shadow-sm"
          >
            <AddedMovieCard
              item={item}
              onRemove={() => onRemove(item)}
              isRemoving={removingTconsts?.has(item.tconst) ?? false}
            />
          </div>
        ))}

        {/* Fill empty slots up to 3 for visual consistency */}
        {Array.from({ length: Math.max(0, 3 - items.length) }).map((_, index) => (
          <div
            key={`empty-${index}`}
            className="bg-muted/30 border-2 border-dashed border-muted rounded-lg p-3 opacity-50"
            aria-hidden="true"
          >
            <div className="w-20 h-20 bg-muted rounded-lg mx-auto mb-2"></div>
            <div className="h-3 bg-muted rounded mb-1 mx-auto w-16"></div>
            <div className="h-3 bg-muted rounded mx-auto w-8"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
