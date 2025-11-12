import { useRef, useState } from "react";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { WatchedSearchCombobox } from "@/components/onboarding/WatchedSearchCombobox";
import { SelectedMoviesList } from "@/components/onboarding/SelectedMoviesList";
import { OnboardingFooterNav } from "@/components/onboarding/OnboardingFooterNav";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useOnboardingWatchedController } from "@/hooks/useOnboardingWatchedController";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * Onboarding page for marking movies as watched.
 * Step 3 of 3 in the onboarding flow.
 * Allows users to search and mark unlimited movies as watched, but requires at least 3.
 * Both Skip and Finish buttons are always enabled.
 */
export function OnboardingWatchedPage() {
  const { viewModel, setQuery, pick, undo, finish, skip } = useOnboardingWatchedController();
  const [validationError, setValidationError] = useState<string | null>(null);
  const errorSectionRef = useRef<HTMLDivElement>(null);

  const hasMinimumMovies = viewModel.selected.length >= viewModel.requiredSelected;
  const selectedTconsts = new Set(viewModel.selected.map(item => item.tconst));

  const handleSkip = () => {
    setValidationError(null);
    skip();
  };

  const handleNext = () => {
    if (viewModel.selected.length < viewModel.requiredSelected) {
      setValidationError(`Oznacz przynajmniej ${viewModel.requiredSelected} filmy jako obejrzane, aby zakończyć onboarding.`);
      errorSectionRef.current?.focus();
      return;
    }

    setValidationError(null);
    finish();
  };

  const headerActions = (
    <ThemeToggle key="theme-toggle" />
  );

  const title = hasMinimumMovies
    ? "Idź dalej lub dodaj kolejne filmy"
    : "Oznacz przynajmniej 3 filmy które już widziałeś";

  const hint = hasMinimumMovies
    ? "Możesz dodać więcej filmów lub przejść dalej"
    : "Wyszukaj i oznacz filmy które oglądałeś, aby dostosować rekomendacje";

  return (
    <OnboardingLayout title="Oznacz filmy które już widziałeś" headerActions={headerActions}>
      <div data-testid="onboarding-step-3">
      <ProgressBar
        current={3} total={3}
        className="mt-2"
      />

      <OnboardingHeader
        title={title}
        hint={hint}
        className="mt-4"
      />

      <div className="space-y-8">
        {/* Movie search combobox */}
        <div className="max-w-lg mx-auto mt-6">
          <WatchedSearchCombobox
            value={viewModel.query}
            onChange={setQuery}
            onPick={pick}
            disabled={viewModel.isSubmitting}
            selectedTconsts={selectedTconsts}
          />
        </div>

        {/* Selected movies list */}
        <div className="max-w-lg mx-auto">
          <SelectedMoviesList
            items={viewModel.selected}
            maxItems={viewModel.requiredSelected}
            onUndo={undo}
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
        <Alert variant="destructive" ref={errorSectionRef} tabIndex={-1} className="mt-6">
          <AlertTitle>Brakuje filmów</AlertTitle>
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}
      </div>
    </OnboardingLayout>
  );
}

