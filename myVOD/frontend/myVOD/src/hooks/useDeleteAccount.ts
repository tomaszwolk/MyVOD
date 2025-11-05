import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { deleteAccount } from "@/lib/api/auth";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

/**
 * Custom hook for deleting user account (RODO-compliant).
 * Clears authentication tokens and redirects to home page on success.
 *
 * @returns Mutation object with mutate, isPending, error, etc.
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient();
  const { logout } = useAuth();
  const navigate = useNavigate();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      return await deleteAccount();
    },
    onSuccess: () => {
      // Clear all cached queries
      queryClient.clear();
      
      // Clear authentication tokens
      logout();
      
      // Redirect to login page
      navigate("/auth/login", { replace: true });
      
      // Show success toast (may not be visible due to redirect, but included for completeness)
      toast.success("Konto zostało usunięte");
    },
    onError: (error: Error) => {
      // Check for authentication errors (401/403)
      if (
        error.message.includes("401") ||
        error.message.includes("403") ||
        error.message.includes("Unauthorized") ||
        error.message.includes("Forbidden")
      ) {
        // Treat as session loss - clear locally and redirect
        queryClient.clear();
        logout();
        navigate("/auth/login", { replace: true });
        toast.error("Sesja wygasła. Zaloguj się ponownie.");
        return;
      }
      
      // For server errors (5xx) or network errors
      toast.error("Nie udało się usunąć konta. Spróbuj ponownie później.");
    },
  });
}

