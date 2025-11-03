import { UserMovieRow } from "./UserMovieRow";
import type { WatchedMovieItemVM } from "@/types/view/watched.types";
import type { PlatformDto } from "@/types/api.types";

/**
 * Props for WatchedList component.
 */
type WatchedListProps = {
  items: WatchedMovieItemVM[];
  platforms: PlatformDto[];
  onRestore: (id: number) => void;
  isRestoring: boolean;
  onDelete: (id: number) => void;
  isDeleting: boolean;
};

/**
 * List layout for displaying watched movies in row format.
 * Vertical stack of movie rows with consistent spacing.
 */
export function WatchedList({ items, platforms, onRestore, isRestoring, onDelete, isDeleting }: WatchedListProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <UserMovieRow
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
