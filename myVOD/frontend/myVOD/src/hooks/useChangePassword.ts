import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { changePassword } from "@/lib/api/auth";
import type { ChangePasswordCommand } from "@/lib/api/auth";

interface ChangePasswordErrorResponse {
  current_password?: string[];
  new_password?: string[];
}

interface ChangePasswordApiError extends Error {
  response?: {
    data: ChangePasswordErrorResponse;
  };
}

/**
 * Custom hook for changing user password.
 * Provides mutation state and helpers for password change process.
 *
 * @returns Mutation object with mutate, isPending, error, etc.
 */
export function useChangePassword() {
  return useMutation<
    { message: string },
    Error,
    ChangePasswordCommand
  >({
    mutationFn: async (payload: ChangePasswordCommand) => {
      return await changePassword(payload);
    },
    onSuccess: () => {
      toast.success("Hasło zostało zmienione");
    },
    onError: (error: Error) => {
      // Check for specific error cases
      const errorMessage = error.message || "";
      
      if (errorMessage.includes("400") || errorMessage.includes("Bad Request")) {
        // Try to extract specific error message from response
        const responseData = (error as ChangePasswordApiError).response?.data;
        if (responseData?.current_password) {
          toast.error("Nieprawidłowe obecne hasło");
          return;
        }
        if (responseData?.new_password) {
          const passwordErrors = Array.isArray(responseData.new_password)
            ? responseData.new_password[0]
            : responseData.new_password;
          toast.error(passwordErrors || "Nowe hasło nie spełnia wymagań");
          return;
        }
        toast.error("Nie udało się zmienić hasła. Sprawdź wprowadzone dane.");
        return;
      }
      
      if (errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
        toast.error("Sesja wygasła. Zaloguj się ponownie.");
        return;
      }
      
      // For other errors (5xx, network, etc.)
      toast.error("Wystąpił błąd podczas zmiany hasła. Spróbuj ponownie później.");
    },
  });
}

