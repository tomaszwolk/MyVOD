import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";

const ONBOARDING_CHECKED_KEY = "onboarding_initial_check_done";

/**
 * Root component that handles initial routing based on user onboarding status.
 * Checks if authenticated user has completed onboarding (selected platforms).
 */
export function AppRoot() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { isLoading, requiredStep } = useOnboardingStatus();
  const hasCompletedInitialCheck =
    typeof window !== "undefined"
      ? sessionStorage.getItem(ONBOARDING_CHECKED_KEY) === "true"
      : false;

  useEffect(() => {
    if (!isAuthenticated) {
      // Not authenticated - redirect to login
      navigate("/auth/login", { replace: true });
      return;
    }

    if (hasCompletedInitialCheck) {
      navigate("/app/onvod", { replace: true });
      return;
    }

    if (isLoading) {
      // Wait for onboarding status to resolve
      return;
    }

    // Navigate to first incomplete step or onVOD if onboarding done
    if (requiredStep) {
      navigate(requiredStep, { replace: true });
      return;
    }

    navigate("/app/onvod", { replace: true });
  }, [
    isAuthenticated,
    hasCompletedInitialCheck,
    isLoading,
    requiredStep,
    navigate,
  ]);

  // While redirecting, show a loading state
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Przekierowywanie...</p>
      </div>
    </div>
  );
}
