import { useQuery } from "@tanstack/react-query";
import { getAISuggestions } from "@/lib/api/movies";
import type { AISuggestionsDto } from "@/types/api.types";

/**
 * Custom hook for fetching AI-powered movie suggestions.
 * Uses TanStack Query for caching and state management.
 * Implements cache policy based on expires_at timestamp.
 *
 * @param options - Configuration options including debug flag
 * @returns Query object with data, isLoading, error, etc.
 */
type UseAISuggestionsOptions = {
  debug?: boolean;
  enabled?: boolean;
};

interface ApiError extends Error {
  response?: {
    status?: number;
  };
}

export function useAISuggestions(options: UseAISuggestionsOptions = {}) {
  const { debug = false, enabled = true } = options;

  return useQuery<AISuggestionsDto, Error>({
    queryKey: ["ai-suggestions", { debug }],
    queryFn: () => getAISuggestions({ debug }),
    enabled,
    staleTime: (query) => {
      // If we have expires_at, calculate staleTime until expiration
      const data = query.state.data;
      if (data?.expires_at) {
        const expiresAt = new Date(data.expires_at).getTime();
        const now = Date.now();
        const timeUntilExpiry = expiresAt - now;
        // Return time until expiry, or 0 if already expired
        return Math.max(0, timeUntilExpiry);
      }
      // Default: 10 minutes if no expires_at
      return 10 * 60 * 1000;
    },
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: (failureCount, error: ApiError) => {
      // Don't retry on 404 (no suggestions available) or 429 (rate limited)
      if (error?.response?.status === 404 || error?.response?.status === 429) {
        return false;
      }
      // Retry other errors up to 2 times
      return failureCount < 2;
    },
    meta: {
      // Custom metadata for error logging
      integration: 'gemini',
      operation: 'get_suggestions',
    },
  });
}
