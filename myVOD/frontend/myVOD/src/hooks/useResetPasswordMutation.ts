import { useMutation } from "@tanstack/react-query";
import { resetPasswordConfirm } from "@/lib/api/auth";
import type { ResetPasswordConfirmCommand } from "@/types/api.types";
import type { ResetPasswordConfirmResponse } from "@/lib/api/auth";

/**
 * Custom hook for confirming password reset with new password using TanStack Query.
 * Sets the new password using the validated reset token.
 *
 * @returns Mutation object with mutate, isPending, error, etc.
 */
export function useResetPasswordMutation() {
  return useMutation<ResetPasswordConfirmResponse, unknown, ResetPasswordConfirmCommand>({
    mutationFn: resetPasswordConfirm,
  });
}
