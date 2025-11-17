import { useInfiniteQuery } from "@tanstack/react-query";
import { listOnVODMovies } from "@/lib/api/movies";
import { usePlatformFilterStore } from "@/stores/platformFilterStore";

/**
 * Custom hook for fetching movies available on VOD platforms with platform filtering.
 * Uses TanStack Query for caching and state management with infinite scrolling.
 * Automatically subscribes to platform filter changes.
 *
 * @param enabled - Whether the query should run (default: true)
 * @returns Query object with data, isLoading, error, etc.
 */
export function useOnVODMoviesQuery(enabled: boolean = true) {
  const selectedPlatformIds = usePlatformFilterStore((state) => state.getSelectedPlatformIdsArray());

  return useInfiniteQuery({
    queryKey: ["on-vod-movies", selectedPlatformIds],
    queryFn: ({ pageParam = 1 }) =>
      listOnVODMovies({
        platformIds: selectedPlatformIds.length > 0 ? selectedPlatformIds : undefined,
        page: pageParam
      }),
    enabled,
    staleTime: 30_000, // Consider data fresh for 30 seconds
    // Prevent refetching when query is disabled to avoid internal checks on undefined data
    refetchOnMount: enabled,
    refetchOnWindowFocus: enabled,
    refetchOnReconnect: enabled,
    // Ensure data structure is always valid even when query is disabled
    select: (data) => {
      // Always return valid structure, even if data is undefined
      if (!data || !data.pages || !Array.isArray(data.pages)) {
        return { pages: [], pageParams: [] };
      }
      return data;
    },
    getPreviousPageParam: () => undefined, // We don't support backward pagination
    getNextPageParam: (lastPage, allPages) => {
      // Early return if query is disabled or hasn't executed - allPages will be undefined
      if (!allPages || !Array.isArray(allPages)) {
        return undefined;
      }

      // Early return if lastPage is invalid
      if (!lastPage || typeof lastPage !== "object") {
        return undefined;
      }

      // Check if lastPage has the expected PaginatedResponse structure
      if (!("next" in lastPage) || !("results" in lastPage)) {
        return undefined;
      }

      // If there's no next page URL, we're done
      if (!lastPage.next || typeof lastPage.next !== "string") {
        return undefined;
      }

      try {
        // HACK: Use HTTPS to construct URL, as the backend might be behind a proxy
        const url = new URL(lastPage.next.replace(/^http:/, "https:"));
        const nextPage = url.searchParams.get("page");
        return nextPage ? parseInt(nextPage, 10) : undefined;
      } catch (error) {
        // If URL parsing fails, return undefined to stop pagination
        console.error("Failed to parse next page URL:", error);
        return undefined;
      }
    },
    initialPageParam: 1,
    meta: {
      // Custom metadata for error logging - availability data comes from backend
      integration: "watchmode",
      operation: "get_on_vod_movies",
    },
  });
}
