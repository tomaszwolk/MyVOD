import { useMutation } from "@tanstack/react-query";
import { forgotPassword } from "@/lib/api/auth";
import type { ForgotPasswordCommand, ForgotPasswordResponse } from "@/lib/api/auth";

/**
 * Custom hook for initiating password reset process using TanStack Query.
 * Sends password reset email to the user.
 *
 * @returns Mutation object with mutate, isPending, error, etc.
 */
export function useForgotPasswordMutation() {
  return useMutation<ForgotPasswordResponse, unknown, ForgotPasswordCommand>({
    mutationFn: forgotPassword,
  });
}
