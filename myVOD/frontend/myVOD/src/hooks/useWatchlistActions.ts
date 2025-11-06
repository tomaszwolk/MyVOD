import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { patchUserMovie, deleteUserMovie } from "@/lib/api/movies";
import type { UserMovieDto } from "@/types/api.types";

/**
 * Hook for marking movies as watched with optimistic updates.
 * Removes movie from watchlist immediately and shows toast on success/error.
 */
export function useMarkAsWatched() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      return patchUserMovie(id, { action: 'mark_as_watched' });
    },
    onMutate: async (id: number) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["user-movies", "watchlist"] });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<UserMovieDto[]>(["user-movies", "watchlist"]);

      // Optimistically remove the movie from watchlist
      queryClient.setQueryData<UserMovieDto[]>(["user-movies", "watchlist"], (old) =>
        old ? old.filter(movie => movie.id !== id) : []
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
        queryClient.setQueryData(["user-movies", "watchlist"], context.previousData);
      }
      toast.error("Nie udało się oznaczyć filmu jako obejrzanego");
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ["user-movies", "watchlist"] });
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

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return deleteUserMovie(id);
    },
    onMutate: async (id: number) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["user-movies", "watchlist"] });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<UserMovieDto[]>(["user-movies", "watchlist"]);

      // Find the movie being deleted
      const movieToDelete = previousData?.find(movie => movie.id === id);
      if (movieToDelete) {
        setDeletedMovies(prev => new Map(prev.set(id, movieToDelete)));
      }

      // Optimistically remove the movie from watchlist
      queryClient.setQueryData<UserMovieDto[]>(["user-movies", "watchlist"], (old) =>
        old ? old.filter(movie => movie.id !== id) : []
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
        queryClient.setQueryData(["user-movies", "watchlist"], context.previousData);
      }
      setDeletedMovies(prev => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
      toast.error("Nie udało się usunąć filmu z watchlisty");
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
