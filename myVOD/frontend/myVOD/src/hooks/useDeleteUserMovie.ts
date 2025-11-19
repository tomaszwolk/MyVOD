import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteUserMovie } from "@/lib/api/movies";

/**
 * Custom hook for deleting user movies (soft delete).
 * Provides mutation state and helpers for the delete movie process.
 *
 * @returns Mutation object with mutate, isPending, error, etc.
 */
export function useDeleteUserMovie() {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, number>({
    mutationFn: async (id) => {
      return await deleteUserMovie(id);
    },
    onSuccess: () => {
      // Invalidate user movies queries to refresh watchlist
      queryClient.invalidateQueries({ queryKey: ["user-movies"] });
      queryClient.invalidateQueries({ queryKey: ["on-vod-movies"] });
    },
  });
}

