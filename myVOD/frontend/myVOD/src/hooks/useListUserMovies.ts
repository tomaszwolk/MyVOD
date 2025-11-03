import { useQuery } from "@tanstack/react-query";
import { listUserMovies } from "@/lib/api/movies";
import type { UserMovieDto } from "@/types/api.types";

/**
 * Custom hook for fetching user movies with optional status filter.
 * Uses TanStack Query for caching and state management.
 *
 * @param status - Optional filter by status ('watchlist' or 'watched')
 * @param enabled - Whether the query should run (default: true)
 * @returns Query object with data, isLoading, error, etc.
 */
export function useListUserMovies(status?: 'watchlist' | 'watched', enabled: boolean = true) {
  return useQuery<UserMovieDto[], Error>({
    queryKey: ["user-movies", status ?? "all"],
    queryFn: () => listUserMovies(status),
    enabled,
    staleTime: 30_000, // Consider data fresh for 30 seconds
    meta: {
      // Custom metadata for error logging - availability data comes from backend
      integration: 'watchmode',
      operation: 'get_user_movies_with_availability',
    },
  });
}

