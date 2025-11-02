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
 * Allows users to search and mark 0-3 movies as watched.
 * Both Skip and Finish buttons are always enabled.
 */
export function OnboardingWatchedPage() {
  const { viewModel, setQuery, pick, undo, finish, skip } = useOnboardingWatchedController();
  const [validationError, setValidationError] = useState<string | null>(null);
  const errorSectionRef = useRef<HTMLDivElement>(null);

  const canAddMore = viewModel.selected.length < viewModel.maxSelected;
  const selectedTconsts = new Set(viewModel.selected.map(item => item.tconst));

  const handleSkip = () => {
    setValidationError(null);
    skip();
  };

  const handleNext = () => {
    if (viewModel.selected.length < viewModel.maxSelected) {
      setValidationError("Oznacz 3 filmy jako obejrzane, aby zakończyć onboarding.");
      errorSectionRef.current?.focus();
      return;
    }

    setValidationError(null);
    finish();
  };

  const headerActions = (
    <ThemeToggle key="theme-toggle" />
  );

  return (
    <OnboardingLayout title="Oznacz filmy które już widziałeś" headerActions={headerActions}>
      <ProgressBar current={3} total={3} />

      <OnboardingHeader
        title="Oznacz 3 filmy które już widziałeś"
        hint="Wyszukaj i oznacz filmy które oglądałeś, aby dostosować rekomendacje"
      />

      <div className="space-y-8">
        {/* Movie search combobox */}
        <div className="max-w-md mx-auto">
          <WatchedSearchCombobox
            value={viewModel.query}
            onChange={setQuery}
            onPick={pick}
            disabled={!canAddMore || viewModel.isSubmitting}
            selectedTconsts={selectedTconsts}
          />
        </div>

        {/* Selected movies list */}
        <div className="max-w-lg mx-auto">
          <SelectedMoviesList
            items={viewModel.selected}
            maxItems={viewModel.maxSelected}
            onUndo={undo}
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
    </OnboardingLayout>
  );
}

