import { WatchedGrid } from "./WatchedGrid";
import { WatchedList } from "./WatchedList";
import { WatchedEmptyState } from "./WatchedEmptyState";
import { SkeletonList } from "../watchlist/SkeletonList";
import type { WatchedViewMode, WatchedMovieItemVM } from "@/types/view/watched.types";

/**
 * Props for WatchedContent component.
 */
type WatchedContentProps = {
  items: WatchedMovieItemVM[];
  viewMode: WatchedViewMode;
  platforms: import("../api.types").PlatformDto[];
  isLoading: boolean;
  isEmpty: boolean;
  onRestore: (id: number) => void;
  isRestoring: boolean;
  onDelete: (id: number) => void;
  isDeleting: boolean;
};

/**
 * Main content component for watched movies.
 * Manages different view modes, loading states, and empty states.
 * Delegates rendering to appropriate sub-components.
 */
export function WatchedContent({
  items,
  viewMode,
  platforms,
  isLoading,
  isEmpty,
  onRestore,
  isRestoring,
  onDelete,
  isDeleting,
}: WatchedContentProps) {
  // Show skeleton during loading
  if (isLoading) {
    return <SkeletonList viewMode={viewMode} count={12} />;
  }

  // Show empty state when no items
  if (isEmpty) {
    return <WatchedEmptyState />;
  }

  // Render appropriate view mode
  if (viewMode === "grid") {
    return (
      <WatchedGrid
        items={items}
        platforms={platforms}
        onRestore={onRestore}
        isRestoring={isRestoring}
        onDelete={onDelete}
        isDeleting={isDeleting}
      />
    );
  }

  return (
    <WatchedList
      items={items}
      platforms={platforms}
      onRestore={onRestore}
      isRestoring={isRestoring}
      onDelete={onDelete}
      isDeleting={isDeleting}
    />
  );
}
