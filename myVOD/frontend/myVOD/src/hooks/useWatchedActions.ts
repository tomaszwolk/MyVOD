import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { restoreUserMovie, deleteUserMovie } from "@/lib/api/movies";
import type { UserMovieDto } from "@/types/api.types";

/**
 * Hook for restoring movies from watched back to watchlist.
 * Removes movie from watched list and shows success/error toast.
 */
export function useRestoreToWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      return restoreUserMovie(id);
    },
    onMutate: async (id: number) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["user-movies", "watched"] });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(["user-movies", "watched"]);

      // Optimistically remove the movie from watched list
      queryClient.setQueryData(["user-movies", "watched"], (old: any[]) =>
        old ? old.filter((movie: any) => movie.id !== id) : []
      );

      // Return a context object with the snapshotted value
      return { previousData };
    },
    onSuccess: (data) => {
      toast.success(`"${data.movie.primary_title}" został przywrócony do watchlisty`);
    },
    onError: (_, __, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData) {
        queryClient.setQueryData(["user-movies", "watched"], context.previousData);
      }
      toast.error("Nie udało się przywrócić filmu. Spróbuj ponownie.");
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ["user-movies", "watched"] });
      // Optionally invalidate watchlist too
      queryClient.invalidateQueries({ queryKey: ["user-movies", "watchlist"] });
    },
  });
}

/**
 * Hook for deleting movies from watched history.
 * Hard delete (not reversible) - removes movie from watched list.
 * Shows success/error toast.
 */
export function useDeleteFromWatched() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      return deleteUserMovie(id);
    },
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ["user-movies", "watched"] });
      const previousData = queryClient.getQueryData<UserMovieDto[]>(["user-movies", "watched"]);
      
      // Find the movie being deleted for toast message
      const movieToDelete = previousData?.find(movie => movie.id === id);
      
      // Optimistically remove the movie from watched list
      queryClient.setQueryData<UserMovieDto[]>(["user-movies", "watched"], (old) =>
        old ? old.filter(movie => movie.id !== id) : []
      );
      
      return { previousData, movieToDelete };
    },
    onSuccess: (_, id, context) => {
      const movieTitle = context?.movieToDelete?.movie.primary_title || "Film";
      toast.success(`"${movieTitle}" usunięto z historii obejrzanych`);
    },
    onError: (_, __, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData) {
        queryClient.setQueryData(["user-movies", "watched"], context.previousData);
      }
      toast.error("Nie udało się usunąć filmu z historii obejrzanych");
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ["user-movies", "watched"] });
    },
  });
}
