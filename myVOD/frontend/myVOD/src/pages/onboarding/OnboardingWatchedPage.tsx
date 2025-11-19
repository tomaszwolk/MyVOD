import { useRef, useState } from "react";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { MovieSearchCombobox } from "@/components/onboarding/MovieSearchCombobox";
import { SelectedMoviesList } from "@/components/onboarding/SelectedMoviesList";
import { OnboardingFooterNav } from "@/components/onboarding/OnboardingFooterNav";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useOnboardingWatchedController } from "@/hooks/useOnboardingWatchedController";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RatingModal } from "@/components/watched/RatingModal";

/**
 * Onboarding page for marking movies as watched.
 * Step 3 of 3 in the onboarding flow.
 * Allows users to search and mark unlimited movies as watched, but requires at least 3.
 * Both Skip and Finish buttons are always enabled.
 */
export function OnboardingWatchedPage() {
  const { viewModel, setQuery, pick, undo, rateMovie, finish, skip } =
    useOnboardingWatchedController();
  const [validationError, setValidationError] = useState<string | null>(null);
  const errorSectionRef = useRef<HTMLDivElement>(null);

  const [ratingModalState, setRatingModalState] = useState<{
    open: boolean;
    userMovieId: number | null;
    movieTitle: string;
    currentRating: number | null;
  }>({
    open: false,
    userMovieId: null,
    movieTitle: "",
    currentRating: null,
  });

  const hasMinimumMovies =
    viewModel.selected.length >= viewModel.requiredSelected;
  const selectedTconsts = new Set(
    viewModel.selected.map((item: { tconst: string }) => item.tconst)
  );

  const handleRateClick = (userMovieId: number, movieTitle: string, currentRating: number | null) => {
    setRatingModalState({
      open: true,
      userMovieId,
      movieTitle,
      currentRating,
    });
  };

  const handleRateSubmit = (rating: number) => {
    if (!ratingModalState.userMovieId) return;

    rateMovie(ratingModalState.userMovieId, rating).then(() => {
      setRatingModalState({
        open: false,
        userMovieId: null,
        movieTitle: "",
        currentRating: null,
      });
    });
  };

  const handleSkip = () => {
    setValidationError(null);
    skip();
  };

  const handleNext = () => {
    if (viewModel.selected.length < viewModel.requiredSelected) {
      setValidationError(
        `Oznacz przynajmniej ${viewModel.requiredSelected} filmy jako obejrzane, aby zakończyć onboarding.`
      );
      errorSectionRef.current?.focus();
      return;
    }

    setValidationError(null);
    finish();
  };

  const headerActions = <ThemeToggle key="theme-toggle" />;

  const title = hasMinimumMovies
    ? "Dodaj przynajmniej 3 filmy do listy obejrzanych"
    : "Oznacz przynajmniej 3 filmy które już widziałeś";

  const hint = hasMinimumMovies
    ? "Większa ilość filmów poprawi rekomendacje"
    : "Wyszukaj i oznacz filmy które oglądałeś, aby dostosować rekomendacje";

  return (
    <OnboardingLayout
      title="Oznacz filmy które już widziałeś"
      headerActions={headerActions}
    >
      <div data-testid="onboarding-step-3">
        <ProgressBar current={3} total={3} className="mt-2" />

        <OnboardingHeader title={title} hint={hint} className="mt-4" />

        <div className="space-y-8">
          {/* Movie search combobox */}
          <div className="max-w-lg mx-auto mt-6">
            <MovieSearchCombobox
              value={viewModel.query}
              onChange={setQuery}
              onAddToWatchlist={() => {}}
              onMarkAsWatched={pick}
              onRate={() => {}}
              disabled={viewModel.isSubmitting}
              selectedTconsts={selectedTconsts}
              placeholder="Szukaj filmów, które widziałeś..."
              testId="watched-search-combobox"
            />
          </div>

          {/* Selected movies list */}
          <div className="max-w-lg mx-auto">
            <SelectedMoviesList
              items={viewModel.selected}
              maxItems={viewModel.requiredSelected}
              onUndo={undo}
              onRateMovie={handleRateClick}
            />
          </div>

          {/* Footer navigation */}
          <div className="pt-4">
            <OnboardingFooterNav
              onSkip={handleSkip}
              onNext={handleNext}
              nextButtonText="Zakończ"
              nextButtonTestId="onboarding-finish-button"
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
          onClose={() =>
            setRatingModalState({
              open: false,
              userMovieId: null,
              movieTitle: "",
              currentRating: null,
            })
          }
          onSubmit={handleRateSubmit}
          movieTitle={ratingModalState.movieTitle}
          currentRating={ratingModalState.currentRating}
        />
      </div>
    </OnboardingLayout>
  );
}
