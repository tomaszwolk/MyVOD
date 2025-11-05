import { MovieCard } from "./MovieCard";
import type { WatchlistItemVM } from "@/types/view/watchlist.types";
import type { PlatformDto } from "@/types/api.types";

/**
 * Props for MovieGrid component.
 */
type MovieGridProps = {
  items: WatchlistItemVM[];
  platforms: PlatformDto[];
  onMarkWatched: (id: number) => void;
  onDelete: (id: number) => void;
};

/**
 * Grid layout for displaying movies in card format.
 * Responsive grid with different column counts for different screen sizes.
 */
export function MovieGrid({ items, platforms, onMarkWatched, onDelete }: MovieGridProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div data-testid="watchlist-grid" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {items.map((item) => (
        <MovieCard
          key={item.id}
          item={item}
          platforms={platforms}
          onMarkWatched={onMarkWatched}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
