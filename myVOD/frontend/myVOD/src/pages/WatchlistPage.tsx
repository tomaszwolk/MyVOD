import { useMemo, useState } from "react";
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
import { useMarkAsWatched, useDeleteFromWatchlist } from "@/hooks/useWatchlistActions";
import { useAISuggestions } from "@/hooks/useAISuggestions";
import { useAddMovie } from "@/hooks/useAddMovie";
import { useListUserMovies } from "@/hooks/useListUserMovies";
import { usePatchUserMovie } from "@/hooks/usePatchUserMovie";

// Components
import { WatchlistControlsBar } from "@/components/watchlist/WatchlistControlsBar";
import { WatchlistContent } from "@/components/watchlist/WatchlistContent";
import { ConfirmDialog } from "@/components/watchlist/ConfirmDialog";
import { AISuggestionsDialog } from "@/components/suggestions/AISuggestionsDialog";
import { ToastViewport } from "@/components/watchlist/ToastViewport";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { MediaLibraryLayout } from "@/components/library/MediaLibraryLayout";

/**
 * Main watchlist page component.
 * Manages the complete watchlist functionality including preferences, data fetching,
 * user interactions, and UI state management.
 */
export function WatchlistPage() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Check if suggestions modal should be open (from URL param)
  const isSuggestionsModalOpen = searchParams.get('suggestions') === 'true';

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    navigate("/auth/login", { replace: true });
    return null;
  }

  // Session preferences (view mode, sort, filters)
  const {
    viewMode,
    sort: sortOption,
    filters,
    setViewMode,
    setSort,
    updateFilters,
  } = useSessionPreferences();

  // Data fetching
  const watchlistQuery = useWatchlistQuery();
  const watchedQuery = useListUserMovies('watched');
  const userProfileQuery = useUserProfile();
  const platformsQuery = usePlatforms();

  // Process and filter data
  const { items, totalCount, visibleCount } = useWatchlistSelectors({
    data: watchlistQuery.data,
    userPlatforms: userProfileQuery.data?.platforms || [],
    sortOption,
    filters,
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

  // Handlers
  const handleViewModeChange = (mode: typeof viewMode) => {
    setViewMode(mode);
  };

  const handleSortChange = (option: typeof sortOption) => {
    setSort(option);
  };

  const handleFiltersChange = (newFilters: typeof filters) => {
    updateFilters(newFilters);
  };

  const handleAddToWatchlist = async (tconst: string) => {
    const watchedEntryId = watchedEntriesByTconst.get(tconst);

    if (watchedEntryId) {
      try {
        const result = await patchUserMovieMutation.mutateAsync({
          id: watchedEntryId,
          command: { action: 'restore_to_watchlist' },
        });
        toast.success(`"${result.movie.primary_title}" przywrócono do watchlisty`);
        return;
      } catch (error) {
        toast.error("Nie udało się przywrócić filmu do watchlisty");
        throw error;
      }
    }

    try {
      const result = await addMovieMutation.mutateAsync({ tconst });
      toast.success(`"${result.primaryTitle}" dodano do watchlisty`);
    } catch (error) {
      if (isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 409) {
          toast.info("Ten film jest już na Twojej watchliście");
        } else {
          const detail = (error.response?.data as any)?.detail ?? (error.response?.data as any)?.tconst?.[0];
          toast.error(detail ?? "Nie udało się dodać filmu do watchlisty");
        }
      } else {
        toast.error("Nie udało się dodać filmu do watchlisty");
      }
      throw error;
    }
  };

  const handleAddToWatched = async (tconst: string) => {
    try {
      const result = await addMovieMutation.mutateAsync({ tconst, mark_as_watched: true });
      toast.success(`"${result.primaryTitle}" dodano do obejrzanych`);
    } catch (error) {
      if (isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 409) {
          toast.info("Ten film był już oznaczony jako obejrzany");
        } else {
          const detail = (error.response?.data as any)?.detail ?? (error.response?.data as any)?.tconst?.[0];
          toast.error(detail ?? "Nie udało się dodać filmu do obejrzanych");
        }
      } else {
        toast.error("Nie udało się dodać filmu do obejrzanych");
      }
      throw error;
    }
  };

  const handleMarkWatched = (id: number) => {
    markAsWatched(id);
  };

  const handleDelete = (id: number) => {
    const movie = items.find(item => item.id === id);
    if (!movie) return;

    setConfirmDialog({
      open: true,
      title: "Usuń film z watchlisty",
      message: `Czy na pewno chcesz usunąć "${movie.movie.primary_title}" z Twojej watchlisty?`,
      onConfirm: () => {
        deleteFromWatchlist(id);
        setConfirmDialog(prev => ({ ...prev, open: false }));
      },
    });
  };

  const handleSuggest = () => {
    // Open modal by adding URL param
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('suggestions', 'true');
    setSearchParams(newSearchParams, { replace: false });
  };

  const handleCloseSuggestionsModal = () => {
    // Close modal by removing URL param
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete('suggestions');
    setSearchParams(newSearchParams, { replace: true });
  };

  // Get existing tconsts for duplicate checking
  const existingTconsts = items.map(item => item.movie.tconst);
  const watchedEntries = watchedQuery.data ?? [];
  const watchedEntriesByTconst = useMemo(() => {
    const map = new Map<string, number>();
    watchedEntries.forEach(entry => {
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
  const isLoading = watchlistQuery.isLoading || userProfileQuery.isLoading || platformsQuery.isLoading;

  // Check if user has selected platforms for availability filtering
  const hasUserPlatforms = (userProfileQuery.data?.platforms?.length || 0) > 0;

  // Check if suggestions are rate limited for button disabled state
  const isSuggestDisabled = (suggestionsQuery.error as any)?.response?.status === 429;
  
  // Get expires_at for rate limit countdown
  const nextAvailableAt = useMemo(() => {
    if (suggestionsQuery.error) {
      const error = suggestionsQuery.error as any;
      if (error?.response?.status === 429) {
        // If we have expires_at in error response, use it; otherwise calculate midnight
        const expiresAt = error?.response?.data?.expires_at;
        if (expiresAt) {
          return expiresAt;
        }
        // Fallback to midnight
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        return midnight.toISOString();
      }
    }
    return suggestionsQuery.data?.expires_at || null;
  }, [suggestionsQuery.error, suggestionsQuery.data]);

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
  ];

  return (
    <>
      <MediaLibraryLayout
        title="Moja lista filmów"
        subtitle="Zarządzaj swoimi filmami do obejrzenia"
        tabs={tabs}
        headerActions={headerActions}
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
          />
        }
      >
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
          />
        </div>
      </MediaLibraryLayout>

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
      />

      <AISuggestionsDialog
        open={isSuggestionsModalOpen}
        onClose={handleCloseSuggestionsModal}
        watchlistTconstSet={watchlistTconstSet}
      />

      <ToastViewport />
    </>
  );
}

