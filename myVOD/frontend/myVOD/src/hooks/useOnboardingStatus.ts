import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { getUserProfile } from "@/lib/api/auth";
import { fetchUserMoviesSimpleList } from "@/lib/api/movies";
import type { UserMovieDto, UserProfileDto } from "@/types/api.types";

type OnboardingStepKey = "platforms" | "movies";

export type OnboardingProgress = {
  hasPlatforms: boolean;
  hasWatchlistMovies: boolean;
};

const ONBOARDING_SEQUENCE: Array<{ key: OnboardingStepKey; path: string }> = [
  { key: "platforms", path: "/onboarding/platforms" },
  { key: "movies", path: "/onboarding/movies" },
];

type NextStepOptions = {
  fromStep?: OnboardingStepKey;
  fallback?: string;
};

const DEFAULT_FALLBACK_PATH = "/";

export function getNextOnboardingPath(
  progress: OnboardingProgress,
  options: NextStepOptions = {}
): string {
  const { fromStep, fallback = DEFAULT_FALLBACK_PATH } = options;

  const completionMap: Record<OnboardingStepKey, boolean> = {
    platforms: progress.hasPlatforms,
    movies: progress.hasWatchlistMovies,
  };

  // Handle unknown fromStep - always start from the beginning
  if (
    fromStep &&
    ONBOARDING_SEQUENCE.findIndex((step) => step.key === fromStep) === -1
  ) {
    return ONBOARDING_SEQUENCE[0].path;
  }

  const startIndex = fromStep
    ? ONBOARDING_SEQUENCE.findIndex((step) => step.key === fromStep) + 1
    : 0;

  for (
    let index = Math.max(startIndex, 0);
    index < ONBOARDING_SEQUENCE.length;
    index += 1
  ) {
    const step = ONBOARDING_SEQUENCE[index];
    if (!completionMap[step.key]) {
      return step.path;
    }
  }

  return fallback;
}

/**
 * Hook to check onboarding completion status.
 * Returns the current step user should be on based on their data.
 */
export function useOnboardingStatus() {
  // Fetch user profile to check platforms
  const { data: profile, isLoading: isLoadingProfile } =
    useQuery<UserProfileDto>({
      queryKey: ["user-profile"],
      queryFn: getUserProfile,
      retry: false,
    });

  // Fetch watchlist movies
  const { data: watchlistMovies = [], isLoading: isLoadingWatchlist } =
    useQuery<UserMovieDto[]>({
      queryKey: ["user-movies", "watchlist", "simple"],
      queryFn: () => fetchUserMoviesSimpleList("watchlist"),
      retry: false,
    });

  // Fetch watched movies
  // Still fetching but not blocking onboarding
  const { data: watchedMovies = [], isLoading: isLoadingWatched } = useQuery<
    UserMovieDto[]
  >({
    queryKey: ["user-movies", "watched", "simple"],
    queryFn: () => fetchUserMoviesSimpleList("watched"),
    retry: false,
  });

  const isLoading = isLoadingProfile || isLoadingWatchlist || isLoadingWatched;

  // Check completion status
  const hasPlatforms = (profile?.platforms?.length ?? 0) >= 1;
  const hasWatchlistMovies = watchlistMovies.length >= 3;

  // Determine which step user should be on (only when data is loaded)
  let requiredStep: string | null = null;

  if (!isLoading) {
    if (!hasPlatforms) {
      requiredStep = "/onboarding/platforms";
    } else if (!hasWatchlistMovies) {
      requiredStep = "/onboarding/movies";
    }
  }

  // For test scenarios, if user has no platforms, always start from platforms regardless of movie counts
  // This prevents API timing issues in tests where movie data might be returned before platform check
  if (!isLoading && !hasPlatforms) {
    requiredStep = "/onboarding/platforms";
  }

  const isOnboardingComplete = hasPlatforms && hasWatchlistMovies;

  const progress = useMemo(
    () => ({
      hasPlatforms,
      hasWatchlistMovies,
    }),
    [hasPlatforms, hasWatchlistMovies]
  );

  return {
    isLoading,
    isOnboardingComplete,
    requiredStep,
    progress,
    profile,
    watchlistMovies,
    watchedMovies,
  };
}
