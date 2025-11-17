import { useEffect } from "react";
import { useInView } from "@/hooks/useInView";
import { WatchedGrid } from "./WatchedGrid";
import { WatchedList } from "./WatchedList";
import { WatchedEmptyState } from "./WatchedEmptyState";
import { SkeletonList } from "../watchlist/SkeletonList";
import type {
  WatchedViewMode,
  WatchedMovieItemVM,
} from "@/types/view/watched.types";
import type { PlatformDto } from "@/types/api.types";

/**
 * Props for WatchedContent component.
 */
type WatchedContentProps = {
  items: WatchedMovieItemVM[];
  viewMode: WatchedViewMode;
  platforms: PlatformDto[];
  isLoading: boolean;
  isEmpty: boolean;
  onRestore: (id: number) => void;
  isRestoring: boolean;
  onDelete: (id: number) => void;
  isDeleting: boolean;
  onRate: (
    userMovieId: number,
    movieTitle: string,
    currentRating: number | null
  ) => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  fetchNextPage?: () => void;
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
  onRate,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: WatchedContentProps) {
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

  if (isEmpty) {
    return <WatchedEmptyState />;
  }

  const isListView = viewMode === "list";

  return (
    <>
      {isListView ? (
        <WatchedList
          items={items}
          platforms={platforms}
          onRestore={onRestore}
          isRestoring={isRestoring}
          onDelete={onDelete}
          isDeleting={isDeleting}
          onRate={onRate}
        />
      ) : (
        <WatchedGrid
          items={items}
          platforms={platforms}
          onRestore={onRestore}
          isRestoring={isRestoring}
          onDelete={onDelete}
          isDeleting={isDeleting}
          onRate={onRate}
        />
      )}
      <div ref={ref} className="h-10" />
      {isFetchingNextPage && (
        <SkeletonList viewMode={viewMode} count={isListView ? 1 : 3} />
      )}
    </>
  );
}
