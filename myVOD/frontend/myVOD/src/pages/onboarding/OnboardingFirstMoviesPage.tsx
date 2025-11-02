import { useNavigate } from "react-router-dom";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { ActionBar } from "@/components/onboarding/ActionBar";
import { ThemeToggle } from "@/components/ui/theme-toggle";

/**
 * Onboarding page for selecting first movies.
 * Step 2 of 3 in the onboarding flow.
 * This is a placeholder implementation.
 */
export function OnboardingFirstMoviesPage() {
  const navigate = useNavigate();

  const handleSkip = () => {
    // Skip to main app (soft guard allows this)
    navigate("/");
  };

  const handleNext = () => {
    // Navigate to final step or main app
    navigate('/app/watchlist');
  };

  const headerActions = (
    <ThemeToggle key="theme-toggle" />
  );

  return (
    <OnboardingLayout title="Welcome to MyVOD" headerActions={headerActions}>
      <ProgressBar current={2} total={3} />

      <OnboardingHeader
        title="Choose your first movies"
        hint="Select some movies to add to your watchlist to get started"
      />

      <div className="text-center py-12">
        <div className="text-muted-foreground">
          <svg
            className="mx-auto h-24 w-24 text-muted-foreground/50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-semibold">Coming Soon</h3>
          <p className="mt-2 text-sm">
            Movie selection feature will be implemented in the next phase.
            For now, let's get you to your watchlist!
          </p>
        </div>
      </div>

      <ActionBar
        onSkip={handleSkip}
        onNext={handleNext}
      />
    </OnboardingLayout>
  );
}
