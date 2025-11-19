import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import {
  PlatformsGrid,
  type PlatformViewModel,
} from "@/components/onboarding/PlatformsGrid";
import { ActionBar } from "@/components/onboarding/ActionBar";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getPlatforms, patchUserPlatforms } from "@/lib/api/platforms";
import {
  getNextOnboardingPath,
  useOnboardingStatus,
} from "@/hooks/useOnboardingStatus";

interface ApiError extends Error {
  response?: {
    status?: number;
  };
}

/**
 * Onboarding page for selecting VOD platforms.
 * Step 1 of 3 in the onboarding flow.
 */
export function OnboardingPlatformsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Refs for focus management
  const errorSectionRef = useRef<HTMLDivElement>(null);
  const hasPrefilledSelectionRef = useRef(false);

  // Local state for selected platform IDs
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Local state for validation errors
  const [validationError, setValidationError] = useState<string | null>(null);

  const { progress, profile } = useOnboardingStatus();

  // Fetch platforms
  const {
    data: platforms = [],
    isLoading,
    error: platformsError,
  } = useQuery({
    queryKey: ["platforms"],
    queryFn: getPlatforms,
  });

  // Mutation for saving platform selection
  const mutation = useMutation({
    mutationFn: patchUserPlatforms,
    onSuccess: () => {
      // Invalidate and refetch user profile queries
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      // Navigate to next relevant step based on current progress
      const nextPath = getNextOnboardingPath(
        {
          hasPlatforms: true,
          hasWatchlistMovies: progress.hasWatchlistMovies,
          hasWatchedMovies: progress.hasWatchedMovies,
        },
        { fromStep: "platforms" }
      );
      navigate(nextPath, { replace: true });
    },
    onError: (error: ApiError) => {
      console.log("OnboardingPlatformsPage: Mutation error:", error);
      console.log("OnboardingPlatformsPage: Error response:", error?.response);
      console.log(
        "OnboardingPlatformsPage: Error status:",
        error?.response?.status
      );

      // Handle authentication errors by redirecting to login
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        console.log(
          "OnboardingPlatformsPage: Redirecting to login due to auth error"
        );
        navigate("/auth/login");
      }
    },
  });

  // Helper function to get error message based on error type
  const getErrorMessage = (error: ApiError | null) => {
    if (!error?.response) {
      return "Network error. Please check your connection and try again.";
    }

    const status = error.response.status;

    if (status === 400 || status === 422) {
      return "Invalid platform selection. Please try again.";
    }

    if (status === 401 || status === 403) {
      return "Your session has expired. Please log in again.";
    }

    if (status && status >= 500) {
      return "Server error. Please try again later.";
    }

    return "An unexpected error occurred. Please try again.";
  };

  // Focus management for error states
  useEffect(() => {
    if ((platformsError || mutation.error) && errorSectionRef.current) {
      errorSectionRef.current.focus();
    }
  }, [platformsError, mutation.error]);

  // Prefill selected IDs from user profile (if available)
  useEffect(() => {
    if (!profile?.platforms) {
      return;
    }

    if (hasPrefilledSelectionRef.current) {
      return;
    }

    const initialIds = profile.platforms.map((platform) => platform.id);
    setSelectedIds(new Set(initialIds));
    hasPrefilledSelectionRef.current = true;
  }, [profile]);

  // Toggle platform selection
  const togglePlatform = (id: number) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });

    // Clear validation error when user makes a selection
    if (validationError) {
      setValidationError(null);
    }
  };

  // Handle next button click
  const handleNext = () => {
    const ids = Array.from(selectedIds);

    // Validate that at least one platform is selected
    if (ids.length === 0) {
      setValidationError("Wybierz przynajmniej jedną platformę.");
      errorSectionRef.current?.focus();
      return;
    }

    // Check if we have a valid token
    const token = localStorage.getItem("myVOD_access_token");
    if (!token) {
      console.log(
        "OnboardingPlatformsPage: No access token found, redirecting to login"
      );
      navigate("/auth/login");
      return;
    }

    console.log(
      "OnboardingPlatformsPage: Token found, proceeding with mutation:",
      !!token
    );

    // Clear any previous validation errors
    setValidationError(null);
    mutation.mutate(ids);
  };

  // Handle skip button click
  const handleSkip = () => {
    const nextPath = getNextOnboardingPath(progress, { fromStep: "platforms" });
    console.log(
      "[OnboardingPlatforms] 🏃 Skip button clicked - navigating to",
      nextPath
    );
    // Skip to the next incomplete onboarding step (or main app if finished)
    navigate(nextPath, { replace: true });
    console.log("[OnboardingPlatforms] ✅ navigate() called");
  };

  // Map platforms to view models
  const platformViewModels: PlatformViewModel[] = platforms.map((platform) => ({
    id: platform.id,
    slug: platform.platform_slug,
    name: platform.platform_name,
    selected: selectedIds.has(platform.id),
  }));

  const headerActions = <ThemeToggle key="theme-toggle" />;

  // Loading state
  if (isLoading) {
    return (
      <OnboardingLayout title="Witaj w MyVOD" headerActions={headerActions}>
        <ProgressBar current={1} total={2} />
        <div className="space-y-6">
          <OnboardingHeader
            title="Wybierz swoje platformy VOD"
            hint="Wybierz platformy VOD, do których posiadasz dostęp"
          />
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </OnboardingLayout>
    );
  }

  // Error state for platforms loading
  if (platformsError) {
    return (
      <OnboardingLayout title="Witaj w MyVOD" headerActions={headerActions}>
        <ProgressBar current={1} total={2} />
        <div className="space-y-6">
          <OnboardingHeader
            title="Wybierz swoje platformy VOD"
            hint="Wybierz platformy VOD, do których posiadasz dostęp"
          />
          <Alert variant="destructive">
            <AlertTitle>Błąd ładowania</AlertTitle>
            <AlertDescription className="space-y-4">
              <p>Nie udało się wczytać listy platform. Spróbuj ponownie.</p>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="w-full sm:w-auto"
              >
                Spróbuj ponownie
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout title="Witaj w MyVOD" headerActions={headerActions}>
      <div data-testid="onboarding-step-1">
        <ProgressBar current={1} total={2} className="mt-2" />

        <OnboardingHeader
          title="Wybierz swoje platformy VOD"
          hint="Wybierz platformy VOD, do których posiadasz dostęp"
          className="mt-4"
        />

        <PlatformsGrid
          platforms={platformViewModels}
          onToggle={togglePlatform}
          isDisabled={mutation.isPending}
          className="mb-6"
        />

        <ActionBar
          onSkip={handleSkip}
          onNext={handleNext}
          isBusy={mutation.isPending}
          nextButtonText="Dalej"
          skipButtonText="Pomiń"
          busyButtonText="Zapisuję..."
        />

        {validationError && (
          <Alert variant="destructive" ref={errorSectionRef} tabIndex={-1}>
            <AlertTitle>Błąd walidacji</AlertTitle>
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        )}

        {mutation.error &&
          mutation.error.response?.status !== 401 &&
          mutation.error.response?.status !== 403 && (
            <Alert variant="destructive" ref={errorSectionRef} tabIndex={-1}>
              <AlertTitle>Błąd zapisu</AlertTitle>
              <AlertDescription>
                {getErrorMessage(mutation.error as ApiError)}
              </AlertDescription>
            </Alert>
          )}
      </div>
    </OnboardingLayout>
  );
}
