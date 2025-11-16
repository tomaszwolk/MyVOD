import { useEffect } from "react";
import { useInView } from "@/hooks/useInView";
import { MovieGrid } from "./MovieGrid";
import { MovieList } from "./MovieList";
import { EmptyState } from "./EmptyState";
import { SkeletonList } from "./SkeletonList";
import type { ViewMode, WatchlistItemVM } from "@/types/view/watchlist.types";
import type { PlatformDto } from "@/types/api.types";

/**
 * Props for WatchlistContent component.
 */
type WatchlistContentProps = {
  items: WatchlistItemVM[];
  viewMode: ViewMode;
  isLoading: boolean;
  platforms: PlatformDto[];
  onMarkWatched: (id: number) => void;
  onDelete: (id: number) => void;
  onAddToWatchlist: (tconst: string) => Promise<void> | void;
  onAddToWatched: (tconst: string) => Promise<void> | void;
  existingTconsts: string[];
  existingWatchedTconsts: string[];
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  fetchNextPage?: () => void;
};

/**
 * Main content component for watchlist.
 * Manages different view modes, loading states, and empty states.
 * Delegates rendering to appropriate sub-components.
 */
export function WatchlistContent({
  items,
  viewMode,
  isLoading,
  platforms,
  onMarkWatched,
  onDelete,
  onAddToWatchlist,
  onAddToWatched,
  existingTconsts,
  existingWatchedTconsts,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: WatchlistContentProps) {
  const { ref, inView } = useInView({
    threshold: 0,
    triggerOnce: false,
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage && fetchNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);


  if (isLoading && items.length === 0) {
    return <SkeletonList viewMode={viewMode} count={12} />;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        onAddToWatchlist={onAddToWatchlist}
        onAddToWatched={onAddToWatched}
        existingTconsts={existingTconsts}
        existingWatchedTconsts={existingWatchedTconsts}
      />
    );
  }

  const isListView = viewMode === "list";

  return (
    <>
      {isListView ? (
        <MovieList
          items={items}
          platforms={platforms}
          onMarkWatched={onMarkWatched}
          onDelete={onDelete}
        />
      ) : (
        <MovieGrid
          items={items}
          platforms={platforms}
          onMarkWatched={onMarkWatched}
          onDelete={onDelete}
        />
      )}
      <div ref={ref} className="h-10" />
      {isFetchingNextPage && (
        <SkeletonList viewMode={viewMode} count={isListView ? 1 : 3} />
      )}
    </>
  );
}
