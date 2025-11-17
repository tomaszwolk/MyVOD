import { useInfiniteQuery } from "@tanstack/react-query";
import { listUserMovies } from "@/lib/api/movies";

/**
 * Custom hook for fetching user movies with optional status filter.
 * Uses TanStack Query for caching and state management with infinite scrolling.
 *
 * @param status - Optional filter by status ('watchlist' or 'watched')
 * @param enabled - Whether the query should run (default: true)
 * @returns Query object with data, isLoading, error, etc.
 */
export function useListUserMovies(
  status?: "watchlist" | "watched",
  enabled: boolean = true
) {
  return useInfiniteQuery({
    queryKey: ["user-movies", status ?? "all"],
    queryFn: ({ pageParam = 1 }) => listUserMovies({ status, page: pageParam }),
    enabled,
    staleTime: 30_000, // Consider data fresh for 30 seconds
    // Prevent refetching when query is disabled to avoid internal checks on undefined data
    refetchOnMount: enabled,
    refetchOnWindowFocus: enabled,
    refetchOnReconnect: enabled,
    // Ensure data structure is always valid even when query is disabled
    // This prevents TanStack Query from checking undefined.length internally
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
      // TanStack Query may check allPages.length internally before calling this function
      // So we need to handle the case when allPages is undefined
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
      operation: "get_user_movies_with_availability",
    },
  });
}
