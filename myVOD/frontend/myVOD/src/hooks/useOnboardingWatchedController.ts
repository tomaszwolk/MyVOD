import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addUserMovie,
  patchUserMovie,
  deleteUserMovie,
  listUserMovies,
} from "@/lib/api/movies";
import { useRateMovie } from "@/hooks/useRateMovie";
import type { SearchOptionVM, UserMovieDto } from "@/types/api.types";
import type {
  OnboardingSelectedItem,
  OnboardingWatchedViewModel,
  SelectedSource,
} from "@/types/view/onboarding-watched.types";
import {
  getNextOnboardingPath,
  useOnboardingStatus,
} from "@/hooks/useOnboardingStatus";

interface ApiError extends Error {
  status?: number;
}

/**
 * Controller hook for the Onboarding Watched Page.
 * Manages the complex flow of marking movies as watched during onboarding.
 *
 * Flow for picking a movie:
 * 1. Try POST /api/user-movies (add to watchlist)
 *    - If 201: Success, got userMovieId
 *    - If 409: Already on watchlist, need to lookup userMovieId
 * 2. PATCH /api/user-movies/:id with action='mark_as_watched'
 *    - If 200: Success, movie marked as watched
 *    - If 400 "already watched": Success (treat as success, lookup userMovieId from watched list)
 *
 * @returns Controller object with state and handlers
 */
export function useOnboardingWatchedController() {
  const navigate = useNavigate();
  const REQUIRED_SELECTED = 3;

  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selected, setSelected] = useState<OnboardingSelectedItem[]>([]);
  const hasPrefilledFromWatchedRef = useRef(false);

  const { progress, watchedMovies } = useOnboardingStatus();

  // Mutation for adding movie to watchlist
  const addUserMovieMutation = useMutation({
    mutationFn: addUserMovie,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-movies"] });
    },
  });

  // Prefill selection with already watched movies (if available)
  useEffect(() => {
    if (hasPrefilledFromWatchedRef.current) {
      return;
    }

    if (!watchedMovies || watchedMovies.length === 0) {
      return;
    }

    const prefilledItems = watchedMovies
      .slice(0, REQUIRED_SELECTED)
      .map<OnboardingSelectedItem>((movie) => ({
        tconst: movie.movie.tconst,
        primary_title: movie.movie.primary_title,
        start_year: movie.movie.start_year,
        genres: movie.movie.genres,
        poster_path: movie.movie.poster_path,
        avg_rating: movie.movie.avg_rating,
        user_rating: movie.user_rating,
        userMovieId: movie.id,
        source: "preexisting_watched",
        status: "success",
      }));

    setSelected(prefilledItems);
    hasPrefilledFromWatchedRef.current = true;
  }, [watchedMovies, REQUIRED_SELECTED]);

  // Mutation for patching user movie
  const patchUserMovieMutation = useMutation({
    mutationFn: ({
      id,
      command,
    }: {
      id: number;
      command: { action: "mark_as_watched" | "restore_to_watchlist" };
    }) => patchUserMovie(id, command),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-movies"] });
    },
  });

  // Mutation for rating movies
  const rateMovieMutation = useRateMovie();

  // Mutation for deleting user movie
  const deleteUserMovieMutation = useMutation({
    mutationFn: deleteUserMovie,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-movies"] });
    },
  });

  /**
   * Picks a movie from search results and marks it as watched.
   * Handles the complex flow: POST → (409→lookup) → PATCH
   */
  const pick = async (movie: SearchOptionVM) => {
    // Guard: check if already selected in this session
    if (selected.some((item) => item.tconst === movie.tconst)) {
      toast.info("Ten film został już wybrany");
      return;
    }

    // Create temporary item with loading state
    const tempItem: OnboardingSelectedItem = {
      tconst: movie.tconst,
      primary_title: movie.primaryTitle,
      start_year: movie.startYear,
      genres: null, // New movies from search don't have genres yet
      poster_path: movie.posterUrl,
      avg_rating: movie.avgRating,
      user_rating: null, // New movies don't have user rating yet
      userMovieId: null,
      source: "newly_created", // Will be updated based on API response
      status: "loading",
    };

    setSelected((prev) => [...prev, tempItem]);

    try {
      let userMovieId: number | null = null;
      let source: SelectedSource = "newly_created";

      try {
        const result: UserMovieDto = await addUserMovieMutation.mutateAsync({
          tconst: movie.tconst,
          mark_as_watched: true,
        });

        userMovieId = result.id;

        if (result.watchlisted_at) {
          source = "preexisting_watchlist";
        } else {
          source = "newly_created";
        }

        setSelected((prev) =>
          prev.map((item) =>
            item.tconst === movie.tconst
              ? { ...item, userMovieId, source, status: "success" }
              : item
          )
        );

        toast.success(`"${movie.primaryTitle}" oznaczono jako obejrzany`);
      } catch (error) {
        const apiError = error as ApiError;
        if (apiError?.status === 409) {
          const watched: UserMovieDto[] = await listUserMovies("watched");
          const existingWatched = watched.find(
            (m) => m.movie.tconst === movie.tconst
          );

          if (existingWatched) {
            userMovieId = existingWatched.id;
            source = "preexisting_watched";

            setSelected((prev) =>
              prev.map((item) =>
                item.tconst === movie.tconst
                  ? { ...item, userMovieId, source, status: "success" }
                  : item
              )
            );

            toast.info(
              `"${movie.primaryTitle}" był już oznaczony jako obejrzany`
            );
          } else {
            throw new Error(
              "Nie znaleziono filmu na liście obejrzanych mimo 409"
            );
          }
        } else {
          throw error;
        }
      }
    } catch (error) {
      const apiError = error as ApiError;
      // Remove item from selected on error
      setSelected((prev) =>
        prev.filter((item) => item.tconst !== movie.tconst)
      );

      // Show error toast
      if (apiError?.status === 400) {
        toast.error("Nie udało się oznaczyć filmu");
      } else if (apiError?.status && apiError.status >= 500) {
        toast.error("Wystąpił błąd serwera. Spróbuj ponownie później");
      } else {
        toast.error(
          apiError?.message || "Wystąpił błąd podczas oznaczania filmu"
        );
      }

      console.error("Error in pick flow:", error);
    }
  };

  /**
   * Undoes the selection of a movie.
   * - If newly_created: DELETE (removes from watchlist)
   * - If preexisting_watchlist or preexisting_watched: PATCH restore_to_watchlist
   */
  const undo = async (item: OnboardingSelectedItem) => {
    if (!item.userMovieId) {
      // No userMovieId - just remove from UI
      setSelected((prev) => prev.filter((i) => i.tconst !== item.tconst));
      return;
    }

    // Set loading state
    setSelected((prev) =>
      prev.map((i) =>
        i.tconst === item.tconst ? { ...i, status: "loading" } : i
      )
    );

    try {
      if (item.source === "newly_created") {
        // Delete the movie (soft delete)
        await deleteUserMovieMutation.mutateAsync(item.userMovieId);
        toast.success("Anulowano oznaczenie filmu");
      } else {
        // Restore to watchlist
        await patchUserMovieMutation.mutateAsync({
          id: item.userMovieId,
          command: { action: "restore_to_watchlist" },
        });
        toast.success("Film przywrócono do watchlisty");
      }

      // Remove from selected
      setSelected((prev) => prev.filter((i) => i.tconst !== item.tconst));
    } catch (error) {
      const apiError = error as ApiError;
      // Restore success state on error
      setSelected((prev) =>
        prev.map((i) =>
          i.tconst === item.tconst ? { ...i, status: "success" } : i
        )
      );

      // Show error toast
      if (apiError?.status && apiError.status >= 500) {
        toast.error("Wystąpił błąd serwera. Spróbuj ponownie później");
      } else {
        toast.error("Nie udało się cofnąć operacji");
      }

      console.error("Error in undo:", error);
    }
  };

  /**
   * Rates a movie that is already marked as watched.
   */
  const rateMovie = async (userMovieId: number, rating: number) => {
    if (!userMovieId) {
      toast.error("Nie można ocenić filmu");
      return;
    }

    try {
      await rateMovieMutation.mutateAsync({
        id: userMovieId,
        command: { action: "rate_movie", rating },
      });

      // Update the rating in local state
      setSelected((prev) =>
        prev.map((item) =>
          item.userMovieId === userMovieId
            ? { ...item, user_rating: rating }
            : item
        )
      );

      toast.success("Ocena została zapisana");
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError?.status && apiError.status >= 500) {
        toast.error("Wystąpił błąd serwera. Spróbuj ponownie później");
      } else {
        toast.error("Nie udało się zapisać oceny");
      }
      console.error("Error rating movie:", error);
    }
  };

  /**
   * Finishes the onboarding and navigates to the main app.
   */
  const finish = () => {
    setIsSubmitting(true);

    // Navigate to main app (soft guard allows this)
    toast.success("Onboarding zakończony!");
    const destination = getNextOnboardingPath(progress, {
      fromStep: "watched",
    });
    navigate(destination, { replace: true });
  };

  /**
   * Skips this step and finishes the onboarding.
   */
  const skip = () => {
    setIsSubmitting(true);

    // Navigate to main app (soft guard allows this)
    const destination = getNextOnboardingPath(progress, {
      fromStep: "watched",
    });
    navigate(destination, { replace: true });
  };

  // Build view model
  const viewModel: OnboardingWatchedViewModel = {
    query,
    isSubmitting,
    selected,
    requiredSelected: REQUIRED_SELECTED,
  };

  return {
    viewModel,
    setQuery,
    pick,
    undo,
    rateMovie,
    finish,
    skip,
  };
}
