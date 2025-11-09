import { useQuery } from "@tanstack/react-query";
import { validateResetToken } from "@/lib/api/auth";
import type { ValidateResetTokenCommand } from "@/types/api.types";
import type { ValidateResetTokenResponse } from "@/lib/api/auth";

/**
 * Custom hook for validating password reset token using TanStack Query.
 * Checks if the reset token from email is valid and not expired.
 *
 * @param payload - UID and token from reset email URL
 * @param enabled - Whether to enable the query (default: false, should be enabled when component mounts with token)
 * @returns Query object with data, isLoading, error, etc.
 */
export function useValidateResetTokenQuery(
  payload: ValidateResetTokenCommand | null,
  enabled: boolean = false
) {
  return useQuery<ValidateResetTokenResponse, unknown>({
    queryKey: ["validateResetToken", payload],
    queryFn: () => validateResetToken(payload!),
    enabled: enabled && !!payload,
    retry: false, // Don't retry on failure for security
    staleTime: 0, // Always refetch
  });
}
