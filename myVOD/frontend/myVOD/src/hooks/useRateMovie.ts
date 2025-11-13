import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patchUserMovie } from "@/lib/api/movies";
import type { UpdateUserMovieCommand, UserMovieDto } from "@/types/api.types";

export function useRateMovie() {
  const queryClient = useQueryClient();

  return useMutation<
    UserMovieDto,
    Error,
    { id: number; command: UpdateUserMovieCommand }
  >({
    mutationFn: ({ id, command }) => patchUserMovie(id, command),
    onSuccess: () => {
      // Invalidate watched movies query to refetch with new rating
      queryClient.invalidateQueries({ queryKey: ["user-movies", "watched"] });
    },
  });
}
