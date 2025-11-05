import { Button } from "@/components/ui/button";

/**
 * Action bar with Skip and Next buttons for onboarding steps.
 */
export function ActionBar({
  onSkip,
  onNext,
  isBusy = false
}: {
  onSkip: () => void;
  onNext: () => void;
  isBusy?: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:justify-between" role="group" aria-label="Onboarding actions">
      <Button
        variant="outline"
        onClick={onSkip}
        disabled={isBusy}
        className="sm:order-1"
        aria-label="Skip platform selection and continue to next step"
      >
        Skip
      </Button>

      <Button
        variant="outline"
        onClick={onNext}
        disabled={isBusy}
        className="sm:order-2"
        aria-label={isBusy ? "Saving platform selection..." : "Save platform selection and continue"}
        data-testid="onboarding-next-button"
      >
        {isBusy ? "Saving..." : "Next"}
      </Button>
    </div>
  );
}
