import { useQuery } from "@tanstack/react-query";
import { getErrorLogs } from "@/lib/api/admin";
import type { ErrorLogsQuery } from "@/types/view/admin.types";

/**
 * Custom hook for fetching error logs.
 * Uses TanStack Query with staleTime of 30 seconds.
 * 
 * @param query - Query parameters (filters, pagination, sorting)
 * @returns Query object with data, isLoading, error, etc.
 */
export function useErrorLogs(query: ErrorLogsQuery = {}) {
  // Normalize query for consistent cache key
  const normalizedQuery: ErrorLogsQuery = {
    api_type: query.api_type && query.api_type.length > 0 ? [...query.api_type].sort() : undefined,
    date_from: query.date_from,
    date_to: query.date_to,
    user_id: query.user_id,
    page: query.page ?? 1,
    page_size: query.page_size ?? 50,
    sort: query.sort ?? "-occurred_at",
  };

  return useQuery({
    queryKey: ["admin-error-logs", normalizedQuery],
    queryFn: () => getErrorLogs(normalizedQuery),
    staleTime: 30 * 1000, // 30 seconds
  });
}

