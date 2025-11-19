import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addUserMovie } from "@/lib/api/movies";
import type { CreateUserMovieCommand, UserMovieDto, PaginatedResponse } from "@/types/api.types";
import { toast } from "sonner";

export function useRateMovie() {
  const queryClient = useQueryClient();

  return useMutation<
    UserMovieDto,
    Error,
    { command: CreateUserMovieCommand }
  >({
    mutationFn: ({ command }) => addUserMovie(command),
    onMutate: async ({ command: ratedMovie }) => {
        // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
        await queryClient.cancelQueries({ queryKey: ["on-vod-movies"] });
        await queryClient.cancelQueries({ queryKey: ["user-movies", "watched"] });
  
        // Snapshot the previous value
        const previousOnVODMovies = queryClient.getQueryData<PaginatedResponse<UserMovieDto>>(["on-vod-movies"]);
        const previousWatchedMovies = queryClient.getQueryData<PaginatedResponse<UserMovieDto>>(["user-movies", "watched"]);
  
        // Optimistically update to the new value
        const optimisticUpdate = (movie: UserMovieDto) => 
            movie.movie.tconst === ratedMovie.tconst
            ? {
                ...movie,
                watched_at: new Date().toISOString(),
                user_rating: ratedMovie.rating ?? null,
              }
            : movie;

        if (previousOnVODMovies) {
          const updatedPages = previousOnVODMovies.pages.map((page) => ({
            ...page,
            results: page.results.map(optimisticUpdate),
          }));
          queryClient.setQueryData(["on-vod-movies"], (old: PaginatedResponse<UserMovieDto>) => ({ ...old, pages: updatedPages }));
        }

        if (previousWatchedMovies) {
            const updatedPages = previousWatchedMovies.pages.map((page) => ({
              ...page,
              results: page.results.map(optimisticUpdate),
            }));
            queryClient.setQueryData(["user-movies", "watched"], (old: PaginatedResponse<UserMovieDto>) => ({ ...old, pages: updatedPages }));
          }
  
        return { previousOnVODMovies, previousWatchedMovies };
      },
      onError: (_err, _vars, context) => {
        if (context?.previousOnVODMovies) {
          queryClient.setQueryData(["on-vod-movies"], context.previousOnVODMovies);
        }
        if (context?.previousWatchedMovies) {
            queryClient.setQueryData(["user-movies", "watched"], context.previousWatchedMovies);
        }
        toast.error("Nie udało się zapisać oceny.");
      },
    onSuccess: (data) => {
        toast.success(`Zapisano ocenę dla "${data.movie.primary_title}"`);
    },
    onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ["on-vod-movies"] });
        queryClient.invalidateQueries({ queryKey: ["user-movies"] });
    },
  });
}
