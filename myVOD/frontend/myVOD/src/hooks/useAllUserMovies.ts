import { useQuery } from "@tanstack/react-query";
import { fetchAllUserMovies } from "@/lib/api/movies";
import type { UserMovieDto } from "@/types/api.types";

/**
 * Custom hook for fetching ALL user movies (paginated under the hood).
 * Returns a simple array, not a paginated structure.
 *
 * @param status - Optional filter by status ('watchlist' or 'watched')
 * @param enabled - Whether the query should run (default: true)
 * @returns Query object with a simple array of data, isLoading, error, etc.
 */
export function useAllUserMovies(status?: 'watchlist' | 'watched', enabled: boolean = true) {
  return useQuery<UserMovieDto[], Error>({
    queryKey: ["user-movies-all", status ?? "all"],
    queryFn: () => fetchAllUserMovies(status),
    enabled,
    staleTime: 30_000,
  });
}
