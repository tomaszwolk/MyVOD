import { UserMovieCard } from "./UserMovieCard";
import type { WatchedMovieItemVM } from "@/types/view/watched.types";
import type { PlatformDto } from "@/types/api.types";

/**
 * Props for WatchedGrid component.
 */
type WatchedGridProps = {
  items: WatchedMovieItemVM[];
  platforms: PlatformDto[];
  onRestore: (id: number) => void;
  isRestoring: boolean;
  onDelete: (id: number) => void;
  isDeleting: boolean;
};

/**
 * Grid layout for displaying watched movies in card format.
 * Responsive grid with different column counts for different screen sizes.
 */
export function WatchedGrid({ items, platforms, onRestore, isRestoring, onDelete, isDeleting }: WatchedGridProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4" data-testid="watched-grid">
      {items.map((item) => (
        <UserMovieCard
          key={item.id}
          item={item}
          platforms={platforms}
          onRestore={onRestore}
          isRestoring={isRestoring}
          onDelete={onDelete}
          isDeleting={isDeleting}
        />
      ))}
    </div>
  );
}
