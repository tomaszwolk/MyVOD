import { useQuery } from "@tanstack/react-query";
import { getAdminMetrics } from "@/lib/api/admin";

/**
 * Custom hook for fetching admin metrics.
 * Uses TanStack Query with staleTime of 10 minutes (data updated daily).
 * 
 * @returns Query object with data, isLoading, error, etc.
 */
export function useAdminMetrics() {
  return useQuery({
    queryKey: ["admin-metrics"],
    queryFn: getAdminMetrics,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}

