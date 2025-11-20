import { useMemo, useState, useCallback, useEffect } from "react";
import { isAxiosError } from "axios";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

// Hooks
import { useWatchedPreferences } from "@/hooks/useWatchedPreferences";
import { useUserProfile } from "@/hooks/useUserProfile";
import { usePlatforms } from "@/hooks/usePlatforms";
import {
  useRestoreToWatchlist,
  useDeleteFromWatched,
} from "@/hooks/useWatchedActions";
import { useAddMovie } from "@/hooks/useAddMovie";
import { useListUserMovies } from "@/hooks/useListUserMovies";
import { usePatchUserMovie } from "@/hooks/usePatchUserMovie";
import { useAISuggestions } from "@/hooks/useAISuggestions";
import { useWatchedSelectors } from "@/hooks/useWatchedSelectors";
import { UserMovieDto } from "@/types/api.types";
import { useAllUserMovies } from "@/hooks/useAllUserMovies";

// Components
import { WatchedToolbar } from "@/components/watched/WatchedToolbar";
import { WatchedContent } from "@/components/watched/WatchedContent";
import { AISuggestionsDialog } from "@/components/suggestions/AISuggestionsDialog";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { MediaLibraryLayout } from "@/components/library/MediaLibraryLayout";
import { PlatformFiltersToolbar } from "@/components/library/PlatformFiltersToolbar";
import { ConfirmDialog } from "@/components/watchlist/ConfirmDialog";
import { RatingModal } from "@/components/watched/RatingModal";
import { FiltersPanel } from "@/components/library/FiltersPanel";

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
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

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
  
  const { showOnlyAvailable } = useFiltersStore();
  const filters = { showOnlyAvailable }; // Create a filters object for consistency

  // User profile for platform availability
  const userProfileQuery = useUserProfile(isAuthenticated);
  const platformsQuery = usePlatforms(isAuthenticated);
  const isStaff = userProfileQuery.data?.is_staff === true;

  // Map WatchedSortKey to backend ordering values
  const getBackendOrdering = (sortKey: typeof sort): string => {
    switch (sortKey) {
      case "watched_at_desc":
        return "-watched_at";
      case "user_rating_desc":
        return "-user_rating";
      case "imdb_rating_desc":
      case "imdb_desc":
        return "-tconst__avg_rating";
      case "added_desc":
        return "-watchlisted_at";
      case "year_desc":
        return "-tconst__start_year";
      case "year_asc":
        return "tconst__start_year";
      default:
        return "-watched_at";
    }
  };

  // Watched movies data - now using the paginated hook with sorting
  const watchedQuery = useListUserMovies(
    "watched",
    isAuthenticated,
    getBackendOrdering(sort)
  );
  const watchlistQuery = useAllUserMovies("watchlist", isAuthenticated);

  const watchedTotalCount = watchedQuery.data?.pages?.[0]?.count;
  const hasWatchedData =
    watchedQuery.data?.pages?.some(
      (page) => (page?.results?.length ?? 0) > 0
    ) ?? false;
  const {
    items: allWatchedItems,
    totalCount,
    visibleCount,
  } = useWatchedSelectors({
    data:
      watchedQuery.data?.pages?.flatMap((page) => page?.results ?? []) ??
      undefined,
    userPlatforms: userProfileQuery.data?.platforms ?? [],
    sortKey: sort,
    hideUnavailable,
    totalAvailableCount: watchedTotalCount,
  });

  // Actions
  const restoreMutation = useRestoreToWatchlist();
  const deleteFromWatchedMutation = useDeleteFromWatched();
  const addMovieMutation = useAddMovie();
  const patchUserMovieMutation = usePatchUserMovie();

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
    allWatchedItems.forEach((entry) => {
      map.set(entry.tconst, { id: entry.id, userRating: entry.userRating });
    });
    return map;
  }, [allWatchedItems]);

  const watchlistEntriesByTconst = useMemo(() => {
    const map = new Map<string, number>();
    (watchlistQuery.data ?? []).forEach((entry: UserMovieDto) => {
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
    if (!hideUnavailable || !hasUserPlatforms) {
      if (filters.showOnlyAvailable) {
        return allWatchedItems.filter((item) => {
          return item.availability.some(
            (a) =>
              a.is_available &&
              userProfileQuery.data?.platforms.some(
                (p) => p.id === a.platform_id
              )
          );
        });
      }
      return allWatchedItems;
    }
    return allWatchedItems.filter((item) => {
      return item.availability.some(
        (a) =>
          a.is_available &&
          userProfileQuery.data?.platforms.some((p) => p.id === a.platform_id)
      );
    });
  }, [
    hideUnavailable,
    hasUserPlatforms,
    allWatchedItems,
    userProfileQuery.data?.platforms,
  ]);

  const isFilteredEmpty = filteredItems.length === 0;

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

      patchUserMovieMutation.mutate(
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
    [ratingModalState, patchUserMovieMutation]
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
            id: watchedId.id,
            command: { action: "restore_to_watchlist" },
          });
          toast.success(
            `"${result.movie.primary_title}" przywrócono do watchlisty`
          );
          return;
        }

        const result = await addMovieMutation.mutateAsync({ tconst });
        toast.success(`"${result.movie.primary_title}" dodano do watchlisty`);
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
          action: "mark_as_watched",
        });
        toast.success(`"${result.movie.primary_title}" dodano do obejrzanych`);
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
  const isWatchedInitialLoad =
    !hasWatchedData &&
    (watchedQuery.isFetching || watchedQuery.fetchStatus === "fetching");
  const isLoading =
    isWatchedInitialLoad ||
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
      id: "onvod",
      label: "OnVOD",
      isActive: false,
      onSelect: () => navigate("/app/onvod"),
    },
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
        globalFilters={<PlatformFiltersToolbar hideUnavailableButton={true} />}
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
            isFiltersOpen={isFiltersOpen}
            onToggleFilters={() => setIsFiltersOpen((prev) => !prev)}
          />
        }
      >
        {isFiltersOpen && (
          <FiltersPanel
            pageType="watched"
            onApplyFilters={() => {
              watchedQuery.refetch();
            }}
          />
        )}
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
            hasNextPage={watchedQuery.hasNextPage}
            isFetchingNextPage={watchedQuery.isFetchingNextPage}
            fetchNextPage={watchedQuery.fetchNextPage}
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
