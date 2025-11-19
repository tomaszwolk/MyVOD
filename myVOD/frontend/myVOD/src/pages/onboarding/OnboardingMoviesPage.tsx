import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { MovieSearchCombobox } from "@/components/onboarding/MovieSearchCombobox";
import { AddedMoviesList } from "@/components/onboarding/AddedMoviesList";
import { OnboardingFooterNav } from "@/components/onboarding/OnboardingFooterNav";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAddUserMovie } from "@/hooks/useAddUserMovie";
import { useRateMovie } from "@/hooks/useRateMovie";
import {
  getNextOnboardingPath,
  useOnboardingStatus,
} from "@/hooks/useOnboardingStatus";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { deleteUserMovie } from "@/lib/api/movies";
import type { AddedMovieVM, SearchOptionVM } from "@/types/api.types";
import { RatingModal } from "@/components/watched/RatingModal";

interface ApiError extends Error {
  status?: number;
}

// Extend AddedMovieVM to include status
interface OnboardingMovieVM extends AddedMovieVM {
  status: "watchlisted" | "watched";
  user_rating?: number | null;
}

/**
 * Onboarding page for adding movies to watchlist or marking them as watched.
 * Step 2 of 2 in the onboarding flow.
 */
export function OnboardingMoviesPage() {
  const navigate = useNavigate();
  const [added, setAdded] = useState<OnboardingMovieVM[]>([]);
  const [addedSet, setAddedSet] = useState<Set<string>>(new Set());
  const [removingTconsts, setRemovingTconsts] = useState<Set<string>>(
    new Set()
  );
  const [query, setQuery] = useState("");
  const hasPrefilledFromWatchlistRef = useRef(false);
  const errorSectionRef = useRef<HTMLDivElement>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [ratingModalState, setRatingModalState] = useState<{
    open: boolean;
    movie: SearchOptionVM | null;
  }>({ open: false, movie: null });

  const addUserMovieMutation = useAddUserMovie();
  const rateMovieMutation = useRateMovie();
  const { progress, watchlistMovies } = useOnboardingStatus();
  const queryClient = useQueryClient();

  const REQUIRED_MOVIES = 3;

  // Prefill with existing watchlist movies
  useEffect(() => {
    if (hasPrefilledFromWatchlistRef.current || !watchlistMovies) return;

    const prefilled = watchlistMovies
      .slice(0, REQUIRED_MOVIES)
      .map<OnboardingMovieVM>((movie) => ({
        userMovieId: movie.id,
        tconst: movie.movie.tconst,
        primaryTitle: movie.movie.primary_title,
        startYear: movie.movie.start_year,
        genres: movie.movie.genres,
        avgRating: movie.movie.avg_rating,
        posterUrl: movie.movie.poster_path,
        status: "watchlisted", // Assume prefilled are watchlisted
      }));

    setAdded(prefilled);
    setAddedSet(new Set(prefilled.map((movie) => movie.tconst)));
    if (prefilled.length >= REQUIRED_MOVIES) {
      setValidationError(null);
    }
    hasPrefilledFromWatchlistRef.current = true;
  }, [watchlistMovies]);

  const handleApiError = (error: unknown, tconst: string) => {
    const apiError = error as ApiError;
    setAdded((prev) => prev.filter((movie) => movie.tconst !== tconst));
    setAddedSet((prev) => {
      const newSet = new Set(prev);
      newSet.delete(tconst);
      return newSet;
    });

    if (apiError?.status === 409) {
      setAddedSet((prev) => new Set(prev).add(tconst));
      toast.info("Ten film jest już na Twojej liście");
    } else {
      toast.error("Wystąpił błąd. Spróbuj ponownie później.");
    }
  };

  const handleAddToWatchlist = async (searchOption: SearchOptionVM) => {
    if (addedSet.has(searchOption.tconst)) return;

    const optimisticMovie: OnboardingMovieVM = {
      ...searchOption,
      userMovieId: null,
      status: "watchlisted",
    };
    setAdded((prev) => [...prev, optimisticMovie]);
    setAddedSet((prev) => new Set(prev).add(searchOption.tconst));

    try {
      const savedMovie = await addUserMovieMutation.mutateAsync({
        tconst: searchOption.tconst,
      });
      setAdded((prev) =>
        prev.map((m) =>
          m.tconst === savedMovie.tconst
            ? { ...savedMovie, status: "watchlisted" }
            : m
        )
      );
      toast.success(`"${savedMovie.movie.primary_title}" dodano do watchlisty`);
    } catch (error) {
      handleApiError(error, searchOption.tconst);
    }
  };

  const handleMarkAsWatched = async (searchOption: SearchOptionVM) => {
    if (addedSet.has(searchOption.tconst)) return;

    const optimisticMovie: OnboardingMovieVM = {
      ...searchOption,
      userMovieId: null,
      status: "watched",
    };
    setAdded((prev) => [...prev, optimisticMovie]);
    setAddedSet((prev) => new Set(prev).add(searchOption.tconst));

    try {
      const savedMovie = await addUserMovieMutation.mutateAsync({
        tconst: searchOption.tconst,
        action: "mark_as_watched",
      });
      setAdded((prev) =>
        prev.map((m) =>
          m.tconst === savedMovie.tconst
            ? { ...savedMovie, status: "watched" }
            : m
        )
      );
      toast.success(
        `"${savedMovie.movie.primary_title}" oznaczono jako obejrzany`
      );
    } catch (error) {
      handleApiError(error, searchOption.tconst);
    }
  };

  const handleRate = (movie: SearchOptionVM) => {
    if (addedSet.has(movie.tconst)) return;
    setRatingModalState({ open: true, movie });
  };

  const handleRateSubmit = async (rating: number) => {
    const movieToRate = ratingModalState.movie;
    if (!movieToRate) return;

    setRatingModalState({ open: false, movie: null });

    const optimisticMovie: OnboardingMovieVM = {
      ...movieToRate,
      userMovieId: null,
      status: "watched",
      user_rating: rating,
    };
    setAdded((prev) => [...prev, optimisticMovie]);
    setAddedSet((prev) => new Set(prev).add(movieToRate.tconst));

    try {
      const savedMovie = await rateMovieMutation.mutateAsync({
        command: {
          tconst: movieToRate.tconst,
          rating,
        },
      });
      setAdded((prev) =>
        prev.map((m) =>
          m.tconst === savedMovie.tconst
            ? {
                ...savedMovie,
                status: "watched",
                user_rating: savedMovie.user_rating,
              }
            : m
        )
      );
      toast.success(
        `Oceniono "${savedMovie.movie.primary_title}" na ${rating}/10`
      );
    } catch (error) {
      handleApiError(error, movieToRate.tconst);
    }
  };

  const handleRemoveMovie = async (movie: OnboardingMovieVM) => {
    if (removingTconsts.has(movie.tconst)) {
      return;
    }

    setRemovingTconsts((prev) => {
      const updated = new Set(prev);
      updated.add(movie.tconst);
      return updated;
    });

    try {
      if (movie.userMovieId) {
        await deleteUserMovie(movie.userMovieId);
      }

      setAdded((prev) => prev.filter((item) => item.tconst !== movie.tconst));
      setAddedSet((prev) => {
        const updated = new Set(prev);
        updated.delete(movie.tconst);
        return updated;
      });

      await queryClient.invalidateQueries({ queryKey: ["user-movies"] });

      toast.success(`"${movie.primaryTitle}" został usunięty z watchlisty`);
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError?.status === 401 || apiError?.status === 403) {
        navigate("/auth/login");
        return;
      }

      if (apiError?.status && apiError.status >= 500) {
        toast.error("Wystąpił błąd serwera. Spróbuj ponownie później");
      } else {
        toast.error("Nie udało się usunąć filmu");
      }
    } finally {
      setRemovingTconsts((prev) => {
        const updated = new Set(prev);
        updated.delete(movie.tconst);
        return updated;
      });
    }
  };

  const handleSkip = () => {
    // Skip to the next incomplete onboarding step (or main app if finished)
    const nextPath = getNextOnboardingPath(progress, { fromStep: "add" });
    setValidationError(null);
    navigate(nextPath, { replace: true });
  };

  const handleNext = () => {
    if (added.length < REQUIRED_MOVIES) {
      setValidationError(
        `Dodaj przynajmniej ${REQUIRED_MOVIES} filmy, aby przejść dalej.`
      );
      errorSectionRef.current?.focus();
      return;
    }

    const nextPath = getNextOnboardingPath(progress, { fromStep: "add" });
    navigate(nextPath, { replace: true });
  };

  const headerActions = <ThemeToggle key="theme-toggle" />;

  return (
    <OnboardingLayout
      title="Dodaj filmy do watchlisty"
      headerActions={headerActions}
    >
      <div data-testid="onboarding-step-2">
        <ProgressBar current={2} total={2} className="mt-2" />

        <OnboardingHeader
          title="Dodaj lub oznacz filmy"
          hint="Dodaj filmy do watchlisty, oznacz jako obejrzane lub oceń, abyśmy mogli lepiej dopasować rekomendacje."
          className="mt-4"
        />

        <div className="space-y-8">
          {/* Movie search combobox */}
          <div className="max-w-lg mx-auto mt-6">
            <MovieSearchCombobox
              value={query}
              onChange={setQuery}
              onAddToWatchlist={handleAddToWatchlist}
              onMarkAsWatched={handleMarkAsWatched}
              onRate={handleRate}
              selectedTconsts={addedSet}
              placeholder="Szukaj filmów..."
              ariaLabel="Dodaj lub oznacz film"
            />
          </div>

          {/* Added movies grid */}
          <div className="max-w-lg mx-auto">
            <AddedMoviesList
              items={added}
              onRemove={handleRemoveMovie}
              removingTconsts={removingTconsts}
            />
          </div>

          {/* Footer navigation */}
          <div className="pt-4">
            <OnboardingFooterNav
              onSkip={handleSkip}
              onNext={handleNext}
              nextButtonText="Zakończ"
            />
          </div>
        </div>

        {validationError && (
          <Alert
            variant="destructive"
            ref={errorSectionRef}
            tabIndex={-1}
            className="mt-6"
          >
            <AlertTitle>Brakuje filmów</AlertTitle>
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        )}

        <RatingModal
          isOpen={ratingModalState.open}
          onClose={() => setRatingModalState({ open: false, movie: null })}
          onSubmit={handleRateSubmit}
          movieTitle={ratingModalState.movie?.primaryTitle || ""}
          currentRating={null}
        />
      </div>
    </OnboardingLayout>
  );
}
