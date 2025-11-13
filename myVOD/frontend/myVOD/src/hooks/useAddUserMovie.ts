import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addUserMovie } from "@/lib/api/movies";
import type {
  AddUserMovieCommand,
  UserMovieDto,
  AddedMovieVM,
} from "@/types/api.types";

/**
 * Maps UserMovieDto to AddedMovieVM for the onboarding added movies list.
 */
function mapToAddedMovieVM(dto: UserMovieDto): AddedMovieVM {
  return {
    userMovieId: dto.id,
    tconst: dto.movie.tconst,
    primaryTitle: dto.movie.primary_title,
    startYear: dto.movie.start_year,
    posterUrl: dto.movie.poster_path,
    avgRating: dto.movie.avg_rating,
  };
}

/**
 * Custom hook for adding movies to user watchlist using TanStack Query.
 * Provides mutation state and helpers for the add movie process.
 *
 * @returns Mutation object with mutate, isPending, error, etc.
 */
export function useAddUserMovie() {
  const queryClient = useQueryClient();

  return useMutation<AddedMovieVM, unknown, AddUserMovieCommand>({
    mutationFn: async (command) => {
      const result = await addUserMovie(command);
      return mapToAddedMovieVM(result);
    },
    onSuccess: () => {
      // Invalidate user movies queries to refresh watchlist
      queryClient.invalidateQueries({ queryKey: ["user-movies"] });
    },
  });
}
