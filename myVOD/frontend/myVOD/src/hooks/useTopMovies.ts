import { useQuery } from "@tanstack/react-query";
import { getTopMovies } from "@/lib/api/admin";
import type { TopMoviesQuery } from "@/types/view/admin.types";

/**
 * Custom hook for fetching top movies.
 * Uses TanStack Query with staleTime of 2 minutes.
 * 
 * @param query - Query parameters (type and range)
 * @returns Query object with data, isLoading, error, etc.
 */
export function useTopMovies(query: TopMoviesQuery) {
  return useQuery({
    queryKey: ["admin-top-movies", query.type, query.range],
    queryFn: () => getTopMovies(query),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

