import { useMemo, useState, useCallback, useEffect } from "react";
import { isAxiosError } from "axios";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

// Hooks
import { useWatchedPreferences } from "@/hooks/useWatchedPreferences";
import { useUserMoviesWatched } from "@/hooks/useUserMoviesWatched";
import { useUserProfile } from "@/hooks/useUserProfile";
import { usePlatforms } from "@/hooks/usePlatforms";
import {
  useRestoreToWatchlist,
  useDeleteFromWatched,
} from "@/hooks/useWatchedActions";
import { useRateMovie } from "@/hooks/useRateMovie";
import { useAddMovie } from "@/hooks/useAddMovie";
import { useListUserMovies } from "@/hooks/useListUserMovies";
import { usePatchUserMovie } from "@/hooks/usePatchUserMovie";
import { useAISuggestions } from "@/hooks/useAISuggestions";

// Components
import { WatchedToolbar } from "@/components/watched/WatchedToolbar";
import { WatchedContent } from "@/components/watched/WatchedContent";
import { AISuggestionsDialog } from "@/components/suggestions/AISuggestionsDialog";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { MediaLibraryLayout } from "@/components/library/MediaLibraryLayout";
import { ConfirmDialog } from "@/components/watchlist/ConfirmDialog";
import { RatingModal } from "@/components/watched/RatingModal";

type MovieMutationErrorResponse = {
  detail?: string;
  tconst?: string[];
};

type SuggestionsErrorResponse = {
  expires_at?: string;
};

/**
 * Main watched movies page component.
 * Manages the complete watched movies functionality including preferences, data fetching,
 * user interactions, and UI state management.
 */
export function WatchedPage() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Check if suggestions modal should be open (from URL param)
  const isSuggestionsModalOpen = searchParams.get("suggestions") === "true";

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/auth/login", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // User preferences (view mode, sort)
  const {
    viewMode,
    sort,
    hideUnavailable,
    setViewMode,
    setSort,
    setHideUnavailable,
  } = useWatchedPreferences();

  // User profile for platform availability
  const userProfileQuery = useUserProfile(isAuthenticated);
  const platformsQuery = usePlatforms(isAuthenticated);
  const isStaff = userProfileQuery.data?.is_staff === true;

  // Watched movies data
  const watchedQuery = useUserMoviesWatched({
    sortKey: sort,
    userPlatforms: userProfileQuery.data?.platforms ?? [],
    enabled: isAuthenticated,
  });
  const watchlistQuery = useListUserMovies("watchlist", isAuthenticated);

  // Actions
  const restoreMutation = useRestoreToWatchlist();
  const deleteFromWatchedMutation = useDeleteFromWatched();
  const addMovieMutation = useAddMovie();
  const patchUserMovieMutation = usePatchUserMovie();
  const rateMovieMutation = useRateMovie();

  // AI suggestions query for checking rate limit status
  const suggestionsQuery = useAISuggestions({
    enabled: false, // Don't fetch automatically, only when modal opens
  });

  // Local state - must be declared before any conditional returns
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

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

  // Handlers
  const watchedEntriesByTconst = useMemo(() => {
    const map = new Map<string, { id: number; userRating: number | null }>();
    (watchedQuery.items ?? []).forEach((entry) => {
      map.set(entry.tconst, { id: entry.id, userRating: entry.userRating });
    });
    return map;
  }, [watchedQuery.items]);

  const watchlistEntriesByTconst = useMemo(() => {
    const map = new Map<string, number>();
    (watchlistQuery.data ?? []).forEach((entry) => {
      map.set(entry.movie.tconst, entry.id);
    });
    return map;
  }, [watchlistQuery.data]);

  const existingWatchlistTconsts = useMemo(
    () => Array.from(watchlistEntriesByTconst.keys()),
    [watchlistEntriesByTconst]
  );

  const existingWatchedTconsts = useMemo(
    () => Array.from(watchedEntriesByTconst.keys()),
    [watchedEntriesByTconst]
  );

  const hasUserPlatforms = (userProfileQuery.data?.platforms?.length ?? 0) > 0;

  const filteredItems = useMemo(() => {
    const items = watchedQuery.items ?? [];
    if (!hideUnavailable || !hasUserPlatforms) {
      return items;
    }
    return items.filter((item) => item.isAvailableOnAnyPlatform);
  }, [hideUnavailable, hasUserPlatforms, watchedQuery.items]);

  const totalCount = watchedQuery.items?.length ?? 0;
  const visibleCount = filteredItems.length;
  const isFilteredEmpty = visibleCount === 0;

  const handleViewModeChange = useCallback(
    (mode: typeof viewMode) => {
      setViewMode(mode);
    },
    [setViewMode]
  );

  const handleSortChange = useCallback(
    (sortKey: typeof sort) => {
      setSort(sortKey);
    },
    [setSort]
  );

  const handleRestore = useCallback(
    (id: number) => {
      restoreMutation.mutate(id);
    },
    [restoreMutation]
  );

  const handleDelete = useCallback(
    (id: number) => {
      const movie = filteredItems.find((item) => item.id === id);
      if (!movie) {
        return;
      }

      setConfirmDialog({
        open: true,
        title: "Usuń film z historii obejrzanych",
        message: `Czy na pewno chcesz usunąć "${movie.title}" z Twojej historii obejrzanych? Ta operacja jest nieodwracalna.`,
        onConfirm: () => {
          deleteFromWatchedMutation.mutate(id);
          setConfirmDialog((prev) => ({ ...prev, open: false }));
        },
      });
    },
    [deleteFromWatchedMutation, filteredItems]
  );

  const handleRateClick = useCallback(
    (userMovieId: number, movieTitle: string, currentRating: number | null) => {
      setRatingModalState({
        open: true,
        userMovieId,
        movieTitle,
        currentRating,
      });
    },
    []
  );

  const handleRateSubmit = useCallback(
    (rating: number) => {
      if (!ratingModalState.userMovieId) return;

      rateMovieMutation.mutate(
        {
          id: ratingModalState.userMovieId,
          command: { action: "rate_movie", rating },
        },
        {
          onSuccess: () => {
            toast.success(
              `Rated "${ratingModalState.movieTitle}" with ${rating}/10`
            );
            setRatingModalState({
              open: false,
              userMovieId: null,
              movieTitle: "",
              currentRating: null,
            });
          },
          onError: () => {
            toast.error("Failed to save rating. Please try again.");
          },
        }
      );
    },
    [ratingModalState, rateMovieMutation]
  );

  // Create watchlist tconst set for suggestions modal
  const watchlistTconstSet = useMemo(() => {
    return new Set(existingWatchlistTconsts);
  }, [existingWatchlistTconsts]);

  // Check if suggestions are rate limited for button disabled state
  const isSuggestDisabled =
    isAxiosError<SuggestionsErrorResponse>(suggestionsQuery.error) &&
    suggestionsQuery.error.response?.status === 429;

  // Get expires_at for rate limit countdown
  const nextAvailableAt = useMemo(() => {
    if (
      isAxiosError<SuggestionsErrorResponse>(suggestionsQuery.error) &&
      suggestionsQuery.error.response?.status === 429
    ) {
      const expiresAt = suggestionsQuery.error.response?.data?.expires_at;
      if (expiresAt) {
        return expiresAt;
      }
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      return midnight.toISOString();
    }
    return suggestionsQuery.data?.expires_at ?? null;
  }, [suggestionsQuery.error, suggestionsQuery.data]);

  const handleAddToWatchlist = useCallback(
    async (tconst: string) => {
      if (watchlistEntriesByTconst.has(tconst)) {
        toast.info("Ten film jest już na Twojej watchliście");
        return;
      }

      const watchedId = watchedEntriesByTconst.get(tconst);

      try {
        if (watchedId) {
          const result = await patchUserMovieMutation.mutateAsync({
            id: watchedId,
            command: { action: "restore_to_watchlist" },
          });
          toast.success(
            `"${result.movie.primary_title}" przywrócono do watchlisty`
          );
          return;
        }

        const result = await addMovieMutation.mutateAsync({ tconst });
        toast.success(`"${result.primaryTitle}" dodano do watchlisty`);
      } catch (error) {
        if (
          isAxiosError<MovieMutationErrorResponse>(error) &&
          error.response?.status === 409
        ) {
          toast.info("Ten film jest już na Twojej watchliście");
        } else {
          toast.error("Nie udało się dodać filmu do watchlisty");
        }
      }
    },
    [
      addMovieMutation,
      patchUserMovieMutation,
      watchlistEntriesByTconst,
      watchedEntriesByTconst,
    ]
  );

  const handleAddToWatched = useCallback(
    async (tconst: string) => {
      if (watchedEntriesByTconst.has(tconst)) {
        toast.info("Ten film był już oznaczony jako obejrzany");
        return;
      }

      try {
        const result = await addMovieMutation.mutateAsync({
          tconst,
          mark_as_watched: true,
        });
        toast.success(`"${result.primaryTitle}" dodano do obejrzanych`);
      } catch (error) {
        if (
          isAxiosError<MovieMutationErrorResponse>(error) &&
          error.response?.status === 409
        ) {
          toast.info("Ten film był już oznaczony jako obejrzany");
        } else {
          toast.error("Nie udało się dodać filmu do obejrzanych");
        }
      }
    },
    [addMovieMutation, watchedEntriesByTconst]
  );

  // Loading states
  const isLoading =
    watchedQuery.isLoading ||
    userProfileQuery.isLoading ||
    platformsQuery.isLoading ||
    watchlistQuery.isLoading;

  const headerActions = (
    <div className="flex items-center gap-3">
      <ThemeToggle key="theme-toggle" />
      <Button variant="outline" onClick={logout} className="gap-2">
        <LogOut className="h-4 w-4" />
        Wyloguj się
      </Button>
    </div>
  );

  const handleSuggest = useCallback(() => {
    // Open modal by adding URL param
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("suggestions", "true");
    setSearchParams(newSearchParams, { replace: false });
  }, [searchParams, setSearchParams]);

  const handleCloseSuggestionsModal = useCallback(() => {
    // Close modal by removing URL param
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete("suggestions");
    setSearchParams(newSearchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleToggleHideUnavailable = useCallback(() => {
    setHideUnavailable(!hideUnavailable);
  }, [hideUnavailable, setHideUnavailable]);

  const tabs = [
    {
      id: "watchlist",
      label: "Watchlista",
      isActive: false,
      onSelect: () => navigate("/app/watchlist"),
    },
    {
      id: "watched",
      label: "Obejrzane",
      isActive: true,
      onSelect: () => {},
    },
    {
      id: "profile",
      label: "Profil",
      isActive: false,
      onSelect: () => navigate("/app/profile"),
    },
    // Show Admin tab only if user is staff
    ...(isStaff === true
      ? [
          {
            id: "admin",
            label: "Admin",
            isActive: false,
            onSelect: () => navigate("/app/admin/dashboard"),
          },
        ]
      : []),
  ];

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <MediaLibraryLayout
        title="Obejrzane filmy"
        subtitle="Historia filmów, które już obejrzałeś"
        tabs={tabs}
        headerActions={headerActions}
        toolbar={
          <WatchedToolbar
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            sortKey={sort}
            onSortKeyChange={handleSortChange}
            onAddToWatchlist={handleAddToWatchlist}
            onAddToWatched={handleAddToWatched}
            existingWatchlistTconsts={existingWatchlistTconsts}
            existingWatchedTconsts={existingWatchedTconsts}
            onSuggest={handleSuggest}
            isSuggestDisabled={isSuggestDisabled}
            nextAvailableAt={nextAvailableAt}
            hideUnavailable={hideUnavailable}
            onToggleHideUnavailable={handleToggleHideUnavailable}
            visibleCount={visibleCount}
            totalCount={totalCount}
            hasUserPlatforms={hasUserPlatforms}
          />
        }
      >
        <div className="p-4">
          <WatchedContent
            items={filteredItems}
            viewMode={viewMode}
            platforms={platformsQuery.data || []}
            isLoading={isLoading}
            isEmpty={isFilteredEmpty}
            onRestore={handleRestore}
            isRestoring={restoreMutation.isPending}
            onDelete={handleDelete}
            isDeleting={deleteFromWatchedMutation.isPending}
            onRate={handleRateClick}
          />
        </div>
      </MediaLibraryLayout>

      <AISuggestionsDialog
        open={isSuggestionsModalOpen}
        onClose={handleCloseSuggestionsModal}
        watchlistTconstSet={watchlistTconstSet}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
      />

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
    </>
  );
}
