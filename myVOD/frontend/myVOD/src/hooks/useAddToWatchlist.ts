import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { addUserMovie } from "@/lib/api/movies";
import type { AddUserMovieCommand, UserMovieDto } from "@/types/api.types";
import { isAxiosError } from "axios";

interface ApiErrorResponse {
  detail?: string;
  tconst?: string[];
}

/**
 * Custom hook for adding a movie to watchlist.
 * Handles per-item loading state and toast notifications.
 * Invalidates watchlist queries after successful addition.
 *
 * @returns Mutation object with mutateAsync and loading state
 */
export function useAddToWatchlist() {
  const queryClient = useQueryClient();

  return useMutation<UserMovieDto, unknown, AddUserMovieCommand>({
    mutationFn: (command) => addUserMovie(command),
    onSuccess: (data) => {
      // Invalidate watchlist queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
      queryClient.invalidateQueries({ queryKey: ["user-movies"] });
      queryClient.invalidateQueries({ queryKey: ["user-movies", "watchlist"] });
      toast.success(`"${data.movie.primary_title}" dodano do watchlisty`);
    },
    onError: (error) => {
      if (isAxiosError<ApiErrorResponse>(error)) {
        const status = error.response?.status;
        if (status === 409) {
          toast.info("Ten film jest już na Twojej watchliście");
        } else if (status === 401) {
          // 401 handled by interceptor - will redirect to login
          toast.error("Sesja wygasła. Zaloguj się ponownie.");
        } else {
          const detail = error.response?.data?.detail ?? error.response?.data?.tconst?.[0];
          toast.error(detail ?? "Nie udało się dodać filmu do watchlisty");
        }
      } else {
        toast.error("Nie udało się dodać filmu do watchlisty");
      }
    },
  });
}

