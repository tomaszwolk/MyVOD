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
          const updatedResults = previousOnVODMovies.results.map(optimisticUpdate);
          queryClient.setQueryData(["on-vod-movies"], { ...previousOnVODMovies, results: updatedResults });
        }

        if (previousWatchedMovies) {
          const updatedResults = previousWatchedMovies.results.map(optimisticUpdate);
          queryClient.setQueryData(["user-movies", "watched"], { ...previousWatchedMovies, results: updatedResults });
        }
  
        return { previousOnVODMovies, previousWatchedMovies };
      },
      onError: (_err, _vars, context) => {
        const ctx = context as { previousOnVODMovies?: PaginatedResponse<UserMovieDto>; previousWatchedMovies?: PaginatedResponse<UserMovieDto> };
        if (ctx?.previousOnVODMovies) {
          queryClient.setQueryData(["on-vod-movies"], ctx.previousOnVODMovies);
        }
        if (ctx?.previousWatchedMovies) {
            queryClient.setQueryData(["user-movies", "watched"], ctx.previousWatchedMovies);
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
