import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addUserMovie } from "@/lib/api/movies";
import type {
  CreateUserMovieCommand,
  UserMovieDto,
  PaginatedResponse,
} from "@/types/api.types";
import { toast } from "sonner";
import { isAxiosError } from "axios";

/**
 * Custom hook for adding movies to user lists using TanStack Query.
 * Handles adding to watchlist and marking as watched.
 * Manages optimistic updates for a responsive UI.
 *
 * @returns Mutation object with mutate, isPending, error, etc.
 */
export function useAddUserMovie() {
  const queryClient = useQueryClient();

  return useMutation<UserMovieDto, Error, CreateUserMovieCommand>({
    mutationFn: addUserMovie,
    onMutate: async (newMovie) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["on-vod-movies"] });

      // Snapshot the previous value
      const previousOnVODMovies = queryClient.getQueryData<
        PaginatedResponse<UserMovieDto>
      >(["on-vod-movies"]);

      // Optimistically update to the new value
      if (previousOnVODMovies) {
        const updatedPages = previousOnVODMovies.pages.map((page) => ({
          ...page,
          results: page.results.map((movie) =>
            movie.movie.tconst === newMovie.tconst
              ? {
                  ...movie,
                  watchlisted_at: newMovie.action !== 'mark_as_watched' ? new Date().toISOString() : null,
                  watched_at: newMovie.action === 'mark_as_watched' ? new Date().toISOString() : null,
                  user_rating: newMovie.rating ?? null,
                }
              : movie
          ),
        }));
        
        queryClient.setQueryData(
          ["on-vod-movies"],
          (old: PaginatedResponse<UserMovieDto>) => ({
            ...old,
            pages: updatedPages,
          })
        );
      }

      return { previousOnVODMovies };
    },
    onError: (err, _newMovie, context) => {
      if (context?.previousOnVODMovies) {
        queryClient.setQueryData(
          ["on-vod-movies"],
          context.previousOnVODMovies
        );
      }
      if (isAxiosError(err) && err.response?.status === 409) {
        toast.info("Ten film jest już na Twojej liście.");
      } else {
        toast.error("Nie udało się dodać filmu. Spróbuj ponownie.");
      }
    },
    onSuccess: (data) => {
        if (data.watched_at) {
          toast.success(`"${data.movie.primary_title}" dodano do obejrzanych`);
        } else {
          toast.success(`"${data.movie.primary_title}" dodano do watchlisty`);
        }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["on-vod-movies"] });
      queryClient.invalidateQueries({ queryKey: ["user-movies"] });
    },
  });
}
