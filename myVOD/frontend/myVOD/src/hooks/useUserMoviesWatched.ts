import { useQuery } from "@tanstack/react-query";
import { listUserMovies } from "@/lib/api/movies";
import type { PlatformDto } from "@/types/api.types";
import type { WatchedSortKey } from "@/types/view/watched.types";
import { processWatchedData } from "@/lib/watched-selectors";

/**
 * Props for useUserMoviesWatched hook.
 */
type UseUserMoviesWatchedProps = {
  sortKey: WatchedSortKey;
  userPlatforms: PlatformDto[];
};

/**
 * Custom hook for fetching and processing watched movies data.
 * Combines data fetching with sorting and filtering logic.
 *
 * @param props - Hook parameters
 * @returns Processed watched movies data with loading states
 */
export function useUserMoviesWatched({
  sortKey,
  userPlatforms,
}: UseUserMoviesWatchedProps) {
  // Map sortKey to API ordering parameter
  const getOrdering = (sortKey: WatchedSortKey): string | undefined => {
    switch (sortKey) {
      case "watched_at_desc":
        return "-watched_at";
      case "user_rating_desc":
        return "-user_rating";
      case "imdb_rating_desc":
        return "-tconst__avg_rating";
      default:
        return undefined;
    }
  };

  const query = useQuery({
    queryKey: ["user-movies-watched", sortKey],
    queryFn: () =>
      listUserMovies({
        status: "watched",
        ordering: getOrdering(sortKey),
        page: 1,
      }),
    staleTime: 30_000, // Consider data fresh for 30 seconds
  });

  const processedData = processWatchedData(
    query.data?.results,
    userPlatforms,
    sortKey,
    false, // hideUnavailable - not used in this hook
    { showOnlyAvailable: false }
  );

  return {
    items: processedData.items,
    isEmpty: processedData.items.length === 0,
    isLoading: query.isLoading,
    error: query.error,
  };
}
