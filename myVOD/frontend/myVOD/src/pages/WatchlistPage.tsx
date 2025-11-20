import { useMemo, useState, useCallback, useEffect } from "react";
import { isAxiosError } from "axios";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

// Hooks
import { useSessionPreferences } from "@/hooks/useSessionPreferences";
import { useWatchlistQuery } from "@/hooks/useWatchlistQuery";
import { useUserProfile } from "@/hooks/useUserProfile";
import { usePlatforms } from "@/hooks/usePlatforms";
import { useWatchlistSelectors } from "@/hooks/useWatchlistSelectors";
import {
  useMarkAsWatched,
  useDeleteFromWatchlist,
} from "@/hooks/useWatchlistActions";
import { useAISuggestions } from "@/hooks/useAISuggestions";
import { useAddMovie } from "@/hooks/useAddMovie";
import { usePatchUserMovie } from "@/hooks/usePatchUserMovie";
import { UserMovieDto } from "@/types/api.types";
import { useAllUserMovies } from "@/hooks/useAllUserMovies";

// Components
import { WatchlistControlsBar } from "@/components/watchlist/WatchlistControlsBar";
import { WatchlistContent } from "@/components/watchlist/WatchlistContent";
import { ConfirmDialog } from "@/components/watchlist/ConfirmDialog";
import { AISuggestionsDialog } from "@/components/suggestions/AISuggestionsDialog";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { MediaLibraryLayout } from "@/components/library/MediaLibraryLayout";
import { PlatformFiltersToolbar } from "@/components/library/PlatformFiltersToolbar";
import { WatchlistItemVM } from "@/types/view/watchlist.types";
import { useFiltersStore } from "@/stores/filtersStore";
import { FiltersPanel } from "@/components/library/FiltersPanel";

type MovieMutationErrorResponse = {
  detail?: string;
  tconst?: string[];
};

type SuggestionsErrorResponse = {
  expires_at?: string;
};

/**
 * Main watchlist page component.
 * Manages the complete watchlist functionality including preferences, data fetching,
 * user interactions, and UI state management.
 */
export function WatchlistPage() {
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

  // Session preferences (view mode, sort)
  const {
    viewMode,
    sort: sortOption,
    setViewMode,
    setSort,
  } = useSessionPreferences();

  const { showOnlyAvailable } = useFiltersStore();
  const filters = useMemo(() => ({ showOnlyAvailable: showOnlyAvailable }), [showOnlyAvailable]); // Memoize filters object

  // Data fetching
  const watchlistQuery = useWatchlistQuery(isAuthenticated);
  const watchedQuery = useAllUserMovies("watched", isAuthenticated);
  const userProfileQuery = useUserProfile(isAuthenticated);
  const platformsQuery = usePlatforms(isAuthenticated);
  const isStaff = userProfileQuery.data?.is_staff === true;

  // Process and filter data
  const watchlistTotalCount = watchlistQuery.data?.pages?.[0]?.count;
  const hasWatchlistData =
    watchlistQuery.data?.pages?.some(
      (page) => (page?.results?.length ?? 0) > 0
    ) ?? false;
  const { items, totalCount, visibleCount } = useWatchlistSelectors({
    data:
      watchlistQuery.data?.pages?.flatMap((page) => page?.results ?? []) ??
      undefined,
    userPlatforms: userProfileQuery.data?.platforms || [],
    sortOption,
    filters, // Now correctly memoized
    totalAvailableCount: watchlistTotalCount,
  });

  // Action handlers with optimistic updates
  const { mutate: markAsWatched } = useMarkAsWatched();
  const { mutate: deleteFromWatchlist } = useDeleteFromWatchlist();

  // AI suggestions query for checking rate limit status
  const suggestionsQuery = useAISuggestions({
    enabled: false, // Don't fetch automatically, only when modal opens
  });

  // Add movie from search
  const addMovieMutation = useAddMovie();
  const patchUserMovieMutation = usePatchUserMovie();

  // UI state
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

  // Derived data
  const existingTconsts = useMemo(
    () => items.map((item: WatchlistItemVM) => item.movie.tconst),
    [items]
  );
  const watchedEntries = useMemo(
    () => watchedQuery.data ?? [],
    [watchedQuery.data]
  );
  const watchedEntriesByTconst = useMemo(() => {
    const map = new Map<string, number>();
    watchedEntries.forEach((entry: UserMovieDto) => {
      map.set(entry.movie.tconst, entry.id);
    });
    return map;
  }, [watchedEntries]);
  const existingWatchedTconsts = useMemo(
    () => Array.from(watchedEntriesByTconst.keys()),
    [watchedEntriesByTconst]
  );

  // Create watchlist tconst set for suggestions modal
  const watchlistTconstSet = useMemo(() => {
    return new Set(existingTconsts);
  }, [existingTconsts]);

  // Loading states
  const isWatchlistInitialLoad =
    !hasWatchlistData &&
    (watchlistQuery.isFetching || watchlistQuery.fetchStatus === "fetching");
  const isLoading =
    isWatchlistInitialLoad ||
    userProfileQuery.isLoading ||
    platformsQuery.isLoading;

  // Check if user has selected platforms for availability filtering
  const hasUserPlatforms = (userProfileQuery.data?.platforms?.length || 0) > 0;

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

  // Handlers
  const handleViewModeChange = useCallback(
    (mode: typeof viewMode) => {
      setViewMode(mode);
    },
    [setViewMode]
  );

  const handleSortChange = useCallback(
    (option: typeof sortOption) => {
      setSort(option);
    },
    [setSort]
  );

  const handleFiltersChange = useCallback(
    (_newFilters: typeof filters) => {
      // updateFilters(newFilters); // Removed as we use store now
    },
    []
  );

  const handleAddToWatchlist = useCallback(
    async (tconst: string) => {
      const watchedEntryId = watchedEntriesByTconst.get(tconst);

      if (watchedEntryId) {
        try {
          const result = await patchUserMovieMutation.mutateAsync({
            id: watchedEntryId,
            command: { action: "restore_to_watchlist" },
          });
          toast.success(
            `"${result.movie.primary_title}" przywrócono do watchlisty`
          );
          return;
        } catch (error) {
          toast.error("Nie udało się przywrócić filmu do watchlisty");
          throw error;
        }
      }

      try {
        const result = await addMovieMutation.mutateAsync({ tconst });
        toast.success(`"${result.movie.primary_title}" dodano do watchlisty`);
      } catch (error) {
        if (isAxiosError<MovieMutationErrorResponse>(error)) {
          const status = error.response?.status;
          if (status === 409) {
            toast.info("Ten film jest już na Twojej watchliście");
          } else {
            const detail =
              error.response?.data?.detail ?? error.response?.data?.tconst?.[0];
            toast.error(detail ?? "Nie udało się dodać filmu do watchlisty");
          }
        } else {
          toast.error("Nie udało się dodać filmu do watchlisty");
        }
        throw error;
      }
    },
    [addMovieMutation, patchUserMovieMutation, watchedEntriesByTconst]
  );

  const handleAddToWatched = useCallback(
    async (tconst: string) => {
      try {
        const result = await addMovieMutation.mutateAsync({
          tconst,
          action: "mark_as_watched",
        });
        toast.success(`"${result.movie.primary_title}" dodano do obejrzanych`);
      } catch (error) {
        if (isAxiosError<MovieMutationErrorResponse>(error)) {
          const status = error.response?.status;
          if (status === 409) {
            toast.info("Ten film był już oznaczony jako obejrzany");
          } else {
            const detail =
              error.response?.data?.detail ?? error.response?.data?.tconst?.[0];
            toast.error(detail ?? "Nie udało się dodać filmu do obejrzanych");
          }
        } else {
          toast.error("Nie udało się dodać filmu do obejrzanych");
        }
        throw error;
      }
    },
    [addMovieMutation]
  );

  const handleMarkWatched = useCallback(
    (id: number) => {
      markAsWatched(id);
    },
    [markAsWatched]
  );

  const handleDelete = useCallback(
    (id: number) => {
      const movie = items.find((item) => item.id === id);
      if (!movie) {
        return;
      }

      setConfirmDialog({
        open: true,
        title: "Usuń film z watchlisty",
        message: `Czy na pewno chcesz usunąć "${movie.movie.primary_title}" z Twojej watchlisty?`,
        onConfirm: () => {
          deleteFromWatchlist(id);
          setConfirmDialog((prev) => ({ ...prev, open: false }));
        },
      });
    },
    [deleteFromWatchlist, items]
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

  if (!isAuthenticated) {
    return null;
  }

  const headerActions = (
    <div className="flex items-center gap-3">
      <ThemeToggle key="theme-toggle" />
      <Button variant="outline" onClick={logout} className="gap-2">
        <LogOut className="h-4 w-4" />
        Wyloguj się
      </Button>
    </div>
  );

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
      isActive: true,
      onSelect: () => {},
    },
    {
      id: "watched",
      label: "Obejrzane",
      isActive: false,
      onSelect: () => navigate("/app/watched"),
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

  return (
    <>
      <MediaLibraryLayout
        title="Moja lista filmów"
        subtitle="Zarządzaj swoimi filmami do obejrzenia"
        tabs={tabs}
        headerActions={headerActions}
        globalFilters={<PlatformFiltersToolbar hideUnavailableButton={true} />}
        toolbar={
          <WatchlistControlsBar
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            sort={sortOption}
            onSortChange={handleSortChange}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            visibleCount={visibleCount}
            totalCount={totalCount}
            hasUserPlatforms={hasUserPlatforms}
            onSuggest={handleSuggest}
            isSuggestDisabled={isSuggestDisabled}
            nextAvailableAt={nextAvailableAt}
            onAddToWatchlist={handleAddToWatchlist}
            onAddToWatched={handleAddToWatched}
            existingTconsts={existingTconsts}
            existingWatchedTconsts={existingWatchedTconsts}
            isFiltersOpen={isFiltersOpen}
            onToggleFilters={() => setIsFiltersOpen((prev) => !prev)}
          />
        }
      >
        {isFiltersOpen && (
          <FiltersPanel
            pageType="watchlist"
            onApplyFilters={() => {
              watchlistQuery.refetch();
            }}
          />
        )}
        <div className="p-4">
          <WatchlistContent
            items={items}
            viewMode={viewMode}
            isLoading={isLoading}
            platforms={platformsQuery.data || []}
            onMarkWatched={handleMarkWatched}
            onDelete={handleDelete}
            onAddToWatchlist={handleAddToWatchlist}
            onAddToWatched={handleAddToWatched}
            existingTconsts={existingTconsts}
            existingWatchedTconsts={existingWatchedTconsts}
            hasNextPage={watchlistQuery.hasNextPage}
            isFetchingNextPage={watchlistQuery.isFetchingNextPage}
            fetchNextPage={watchlistQuery.fetchNextPage}
          />
        </div>
      </MediaLibraryLayout>

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
      />

      <AISuggestionsDialog
        open={isSuggestionsModalOpen}
        onClose={handleCloseSuggestionsModal}
        watchlistTconstSet={watchlistTconstSet}
      />
    </>
  );
}
