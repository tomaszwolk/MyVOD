import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { patchUserMovie, deleteUserMovie } from "@/lib/api/movies";
import type { UserMovieDto } from "@/types/api.types";
import {
  findUserMovieById,
  removeUserMovieById,
  type UserMoviesInfiniteData,
} from "@/lib/userMoviesInfiniteUtils";

/**
 * Hook for marking movies as watched with optimistic updates.
 * Removes movie from watchlist immediately and shows toast on success/error.
 */
type MutationContext = {
  previousData?: UserMoviesInfiniteData;
};

export function useMarkAsWatched() {
  const queryClient = useQueryClient();
  const queryKey = ["user-movies", "watchlist"] as const;

  return useMutation<UserMovieDto, unknown, number, MutationContext>({
    mutationFn: async (id: number) => {
      return patchUserMovie(id, { action: 'mark_as_watched' });
    },
    onMutate: async (id: number) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData =
        queryClient.getQueryData<UserMoviesInfiniteData>(queryKey);

      // Optimistically remove the movie from watchlist
      queryClient.setQueryData<UserMoviesInfiniteData>(queryKey, (old) =>
        removeUserMovieById(old, id)
      );

      // Return a context object with the snapshotted value
      return { previousData };
    },
    onSuccess: (data) => {
      toast.success(`"${data.movie.primary_title}" oznaczono jako obejrzane`);
    },
    onError: (_, __, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      toast.error("Nie udało się oznaczyć filmu jako obejrzanego");
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

/**
 * Hook for deleting movies from watchlist with undo functionality.
 * Shows confirmation dialog and allows undoing the deletion.
 */
export function useDeleteFromWatchlist() {
  const queryClient = useQueryClient();
  const [deletedMovies, setDeletedMovies] = useState<Map<number, UserMovieDto>>(new Map());
  const queryKey = ["user-movies", "watchlist"] as const;

  const deleteMutation = useMutation<
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
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData =
        queryClient.getQueryData<UserMoviesInfiniteData>(queryKey);

      // Find the movie being deleted
      const movieToDelete = findUserMovieById(previousData, id);
      if (movieToDelete) {
        setDeletedMovies(prev => new Map(prev.set(id, movieToDelete)));
      }

      // Optimistically remove the movie from watchlist
      queryClient.setQueryData<UserMoviesInfiniteData>(queryKey, (old) =>
        removeUserMovieById(old, id)
      );

      // Return a context object with the snapshotted value
      return { previousData, movieToDelete };
    },
    onSuccess: (_, id) => {
      const deletedMovie = deletedMovies.get(id);
      if (deletedMovie) {
        toast.success(`"${deletedMovie.movie.primary_title}" usunięto z watchlisty`, {
          action: {
            label: "Cofnij",
            onClick: () => undoDelete(id),
          },
        });
      }
    },
    onError: (_, id, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      setDeletedMovies(prev => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
      toast.error("Nie udało się usunąć filmu z watchlisty");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const undoDelete = async (id: number) => {
    const deletedMovie = deletedMovies.get(id);
    if (!deletedMovie) return;

    try {
      // Restore the movie using PATCH with action: 'restore_to_watchlist'
      await patchUserMovie(id, { action: 'restore_to_watchlist' });

      // Remove from deleted movies
      setDeletedMovies(prev => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });

      toast.success(`"${deletedMovie.movie.primary_title}" przywrócono do watchlisty`);
    } catch {
      toast.error("Nie udało się cofnąć usunięcia");
    }
  };

  return {
    ...deleteMutation,
    undoDelete,
  };
}
