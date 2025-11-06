import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { MovieSearchCombobox } from "@/components/onboarding/MovieSearchCombobox";
import { AddedMoviesGrid } from "@/components/onboarding/AddedMoviesGrid";
import { OnboardingFooterNav } from "@/components/onboarding/OnboardingFooterNav";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAddUserMovie } from "@/hooks/useAddUserMovie";
import { getNextOnboardingPath, useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { deleteUserMovie } from "@/lib/api/movies";
import type { AddedMovieVM, SearchOptionVM } from "@/types/api.types";

interface ApiError extends Error {
  status?: number;
}

/**
 * Onboarding page for adding movies to watchlist.
 * Step 2 of 3 in the onboarding flow.
 * Allows users to search and add unlimited movies to their watchlist, but requires at least 3.
 */
export function OnboardingAddPage() {
  const navigate = useNavigate();
  const [added, setAdded] = useState<AddedMovieVM[]>([]);
  const [addedSet, setAddedSet] = useState<Set<string>>(new Set());
  const [removingTconsts, setRemovingTconsts] = useState<Set<string>>(new Set());
  const hasPrefilledFromWatchlistRef = useRef(false);
  const errorSectionRef = useRef<HTMLDivElement>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const addUserMovieMutation = useAddUserMovie();
  const { progress, watchlistMovies } = useOnboardingStatus();
  const queryClient = useQueryClient();

  const REQUIRED_MOVIES = 3;

  // Prefill with existing watchlist movies (if available)
  useEffect(() => {
    if (hasPrefilledFromWatchlistRef.current) {
      return;
    }

    if (!watchlistMovies || watchlistMovies.length === 0) {
      return;
    }

    const prefilled = watchlistMovies
      .slice(0, REQUIRED_MOVIES)
      .map<AddedMovieVM>((movie) => ({
        userMovieId: movie.id,
        tconst: movie.movie.tconst,
        primaryTitle: movie.movie.primary_title,
        startYear: movie.movie.start_year,
        posterUrl: movie.movie.poster_path,
      }));

    setAdded(prefilled);
    setAddedSet(new Set(prefilled.map((movie) => movie.tconst)));
    if (prefilled.length >= REQUIRED_MOVIES) {
      setValidationError(null);
    }
    hasPrefilledFromWatchlistRef.current = true;
  }, [watchlistMovies, REQUIRED_MOVIES]);

  const handleAddMovie = async (searchOption: SearchOptionVM) => {
    // Prevent adding if duplicate in session
    if (addedSet.has(searchOption.tconst)) {
      return;
    }

    try {
      // Add to pending state immediately for UI feedback
      const tempAddedMovie: AddedMovieVM = {
        userMovieId: null,
        tconst: searchOption.tconst,
        primaryTitle: searchOption.primaryTitle,
        startYear: searchOption.startYear,
        posterUrl: searchOption.posterUrl,
      };

      setAdded(prev => {
        const updated = [...prev, tempAddedMovie];
        if (updated.length >= REQUIRED_MOVIES) {
          setValidationError(null);
        }
        return updated;
      });
      setAddedSet(prev => new Set(prev).add(searchOption.tconst));

      // Call API
      const savedMovie = await addUserMovieMutation.mutateAsync({ tconst: searchOption.tconst });

      setAdded(prev =>
        prev.map(movie =>
          movie.tconst === searchOption.tconst ? savedMovie : movie
        )
      );

      // Success toast
      toast.success(`"${searchOption.primaryTitle}" został dodany do Twojej watchlisty`);

    } catch (error) {
      const apiError = error as ApiError;
      // Remove from state on error
      setAdded(prev => prev.filter(movie => movie.tconst !== searchOption.tconst));
      setAddedSet(prev => {
        const newSet = new Set(prev);
        newSet.delete(searchOption.tconst);
        return newSet;
      });

      // Handle different error types
      if (apiError?.status === 409) {
        // Movie already on watchlist - disable in session and show info toast
        setAddedSet(prev => new Set(prev).add(searchOption.tconst));
        toast.info("Ten film jest już na Twojej watchliście");
      } else if (apiError?.status === 400) {
        // Invalid tconst or movie not found
        toast.error("Nie udało się dodać filmu");
      } else if (apiError?.status && apiError.status >= 500) {
        // Server error
        toast.error("Wystąpił błąd serwera. Spróbuj ponownie później");
      } else {
        // Other errors (network, etc.)
        toast.error("Wystąpił błąd podczas dodawania filmu");
      }

    }
  };

  const handleRemoveMovie = async (movie: AddedMovieVM) => {
    if (removingTconsts.has(movie.tconst)) {
      return;
    }

    setRemovingTconsts(prev => {
      const updated = new Set(prev);
      updated.add(movie.tconst);
      return updated;
    });

    try {
      if (movie.userMovieId) {
        await deleteUserMovie(movie.userMovieId);
      }

      setAdded(prev => prev.filter(item => item.tconst !== movie.tconst));
      setAddedSet(prev => {
        const updated = new Set(prev);
        updated.delete(movie.tconst);
        return updated;
      });

      await queryClient.invalidateQueries({ queryKey: ["user-movies"] });

      toast.success(`"${movie.primaryTitle}" został usunięty z watchlisty`);
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError?.status === 401 || apiError?.status === 403) {
        navigate('/auth/login');
        return;
      }

      if (apiError?.status && apiError.status >= 500) {
        toast.error("Wystąpił błąd serwera. Spróbuj ponownie później");
      } else {
        toast.error("Nie udało się usunąć filmu");
      }
    } finally {
      setRemovingTconsts(prev => {
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
      setValidationError(`Dodaj przynajmniej ${REQUIRED_MOVIES} filmy, aby przejść dalej.`);
      errorSectionRef.current?.focus();
      return;
    }

    const nextPath = getNextOnboardingPath(progress, { fromStep: "add" });
    navigate(nextPath, { replace: true });
  };

  const headerActions = (
    <ThemeToggle key="theme-toggle" />
  );

  return (
    <OnboardingLayout title="Dodaj filmy do watchlisty" headerActions={headerActions}>
      <div data-testid="onboarding-step-2">
        <ProgressBar current={2} total={3} />

      <OnboardingHeader
        title="Dodaj przynajmniej 3 filmy do watchlisty"
        hint="Wyszukaj filmy i dodaj je do swojej watchlisty, aby rozpocząć"
      />

      <div className="space-y-8">
        {/* Movie search combobox */}
        <div className="max-w-md mx-auto">
          <MovieSearchCombobox
            disabledTconsts={addedSet}
            onSelectOption={handleAddMovie}
          />
        </div>

        {/* Added movies grid */}
        <div className="max-w-lg mx-auto">
          <AddedMoviesGrid
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
          />
        </div>
      </div>

      {validationError && (
        <Alert variant="destructive" ref={errorSectionRef} tabIndex={-1} className="mt-6">
          <AlertTitle>Brakuje filmów</AlertTitle>
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}
      </div>
    </OnboardingLayout>
  );
}
