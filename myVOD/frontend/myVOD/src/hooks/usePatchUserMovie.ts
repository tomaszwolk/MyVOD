import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patchUserMovie } from "@/lib/api/movies";
import type { UpdateUserMovieCommand, UserMovieDto, PaginatedResponse } from "@/types/api.types";
import { toast } from "sonner";

type PatchUserMovieParams = {
  id: number;
  command: UpdateUserMovieCommand;
};

/**
 * Custom hook for updating user movies (mark as watched or restore to watchlist).
 * Provides mutation state and helpers for the patch movie process.
 *
 * @returns Mutation object with mutate, isPending, error, etc.
 */
export function usePatchUserMovie() {
  const queryClient = useQueryClient();

  return useMutation<UserMovieDto, Error, PatchUserMovieParams>({
    mutationFn: ({ id, command }) => patchUserMovie(id, command),
    onMutate: async ({ id, command }) => {
      await queryClient.cancelQueries({ queryKey: ["on-vod-movies"] });
      await queryClient.cancelQueries({ queryKey: ["user-movies"] });

      const previousOnVODMovies = queryClient.getQueryData<PaginatedResponse<UserMovieDto>>(["on-vod-movies"]);
      const previousUserMovies = queryClient.getQueryData<PaginatedResponse<UserMovieDto>>(["user-movies"]);

      const optimisticUpdate = (movie: UserMovieDto) => {
        if (movie.id !== id) {
          return movie;
        }
        if (command.action === "mark_as_watched") {
          return { ...movie, watched_at: new Date().toISOString() };
        }
        if (command.action === "restore_to_watchlist") {
          return { ...movie, watched_at: null, watchlisted_at: new Date().toISOString() };
        }
        return movie;
      };

      if (previousOnVODMovies) {
        const updatedPages = previousOnVODMovies.pages.map((page) => ({
          ...page,
          results: page.results.map(optimisticUpdate),
        }));
        queryClient.setQueryData(["on-vod-movies"], { ...previousOnVODMovies, pages: updatedPages });
      }

      if (previousUserMovies) {
        const updatedPages = previousUserMovies.pages.map((page) => ({
            ...page,
            results: page.results.map(optimisticUpdate),
          }));
          queryClient.setQueryData(["user-movies"], { ...previousUserMovies, pages: updatedPages });
      }

      return { previousOnVODMovies, previousUserMovies };
    },
    onError: (_err, _vars, context) => {
        if (context?.previousOnVODMovies) {
          queryClient.setQueryData(["on-vod-movies"], context.previousOnVODMovies);
        }
        if (context?.previousUserMovies) {
            queryClient.setQueryData(["user-movies"], context.previousUserMovies);
        }
        toast.error("Nie udało się zaktualizować statusu filmu.");
    },
    onSuccess: (data, variables) => {
        if (variables.command.action === "mark_as_watched") {
          toast.success(`"${data.movie.primary_title}" oznaczono jako obejrzany`);
        } else if (variables.command.action === "restore_to_watchlist") {
          toast.success(`"${data.movie.primary_title}" przywrócono do watchlisty`);
        }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["user-movies"] });
      queryClient.invalidateQueries({ queryKey: ["on-vod-movies"] });
    },
  });
}

