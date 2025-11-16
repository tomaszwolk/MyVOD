import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { restoreUserMovie, deleteUserMovie } from "@/lib/api/movies";
import type { UserMovieDto } from "@/types/api.types";
import {
  removeUserMovieById,
  findUserMovieById,
  type UserMoviesInfiniteData,
} from "@/lib/userMoviesInfiniteUtils";

/**
 * Hook for restoring movies from watched back to watchlist.
 * Removes movie from watched list and shows success/error toast.
 */
export function useRestoreToWatchlist() {
  const queryClient = useQueryClient();
  const watchedKey = ["user-movies", "watched"] as const;

  return useMutation<UserMovieDto, unknown, number, { previousData?: UserMoviesInfiniteData }>({
    mutationFn: async (id: number) => {
      return restoreUserMovie(id);
    },
    onMutate: async (id: number) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: watchedKey });

      // Snapshot the previous value
      const previousData =
        queryClient.getQueryData<UserMoviesInfiniteData>(watchedKey);

      // Optimistically remove the movie from watched list
      queryClient.setQueryData<UserMoviesInfiniteData>(watchedKey, (old) =>
        removeUserMovieById(old, id)
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
        queryClient.setQueryData(watchedKey, context.previousData);
      }
      toast.error("Nie udało się przywrócić filmu. Spróbuj ponownie.");
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: watchedKey });
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
  const watchedKey = ["user-movies", "watched"] as const;

  return useMutation<
    void,
    unknown,
    number,
    {
      previousData?: UserMoviesInfiniteData;
      movieToDelete?: UserMovieDto;
    }
  >({
    mutationFn: async (id: number) => {
      return deleteUserMovie(id);
    },
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: watchedKey });
      const previousData =
        queryClient.getQueryData<UserMoviesInfiniteData>(watchedKey);
      
      // Find the movie being deleted for toast message
      const movieToDelete = findUserMovieById(previousData, id);
      
      // Optimistically remove the movie from watched list
      queryClient.setQueryData<UserMoviesInfiniteData>(watchedKey, (old) =>
        removeUserMovieById(old, id)
      );
      
      return { previousData, movieToDelete };
    },
    onSuccess: (_, _id, context) => {
      const movieTitle = context?.movieToDelete?.movie.primary_title || "Film";
      toast.success(`"${movieTitle}" usunięto z historii obejrzanych`);
    },
    onError: (_, __, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData) {
        queryClient.setQueryData(watchedKey, context.previousData);
      }
      toast.error("Nie udało się usunąć filmu z historii obejrzanych");
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: watchedKey });
    },
  });
}
