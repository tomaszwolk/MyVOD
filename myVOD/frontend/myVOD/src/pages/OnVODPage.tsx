import { useEffect, useCallback } from "react";
import { isAxiosError } from "axios";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";

// Hooks
import { useOnVODMoviesQuery } from "@/hooks/useOnVODMoviesQuery";
import { useUserProfile } from "@/hooks/useUserProfile";
import { usePlatforms } from "@/hooks/usePlatforms";
import { useSessionPreferences } from "@/hooks/useSessionPreferences";
import { useAISuggestions } from "@/hooks/useAISuggestions";

// Components
import { MediaLibraryLayout } from "@/components/library/MediaLibraryLayout";
import { PlatformFiltersToolbar } from "@/components/library/PlatformFiltersToolbar";
import { OnVODToolbar } from "@/components/onvod/OnVODToolbar";
import { OnVODMovieCard } from "@/components/onvod/OnVODMovieCard";
import { OnVODMovieRow } from "@/components/onvod/OnVODMovieRow";
import { AISuggestionsDialog } from "@/components/suggestions/AISuggestionsDialog";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useInView } from "@/hooks/useInView";

/**
 * OnVOD page component - displays all movies available on VOD platforms.
 * Features global platform filtering and infinite scroll.
 */
export function OnVODPage() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/auth/login", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Data fetching
  const onVODQuery = useOnVODMoviesQuery(isAuthenticated);
  const userProfileQuery = useUserProfile(isAuthenticated);
  const platformsQuery = usePlatforms(isAuthenticated);
  const isStaff = userProfileQuery.data?.is_staff === true;

  // Session preferences (view mode, sort)
  const { viewMode, setViewMode, sort, setSort } = useSessionPreferences();

  // AI suggestions query for checking rate limit status
  const suggestionsQuery = useAISuggestions({
    enabled: false, // Don't fetch automatically, only when modal opens
  });

  // Check if suggestions modal should be open (from URL param)
  const isSuggestionsModalOpen = searchParams.get("suggestions") === "true";

  // Check if suggestions are rate limited for button disabled state
  const isSuggestDisabled =
    isAxiosError(suggestionsQuery.error) &&
    suggestionsQuery.error.response?.status === 429;

  // Get expires_at for rate limit countdown
  const nextAvailableAt = suggestionsQuery.data?.expires_at ?? null;

  // Infinite scroll trigger
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
  });

  // Load next page when trigger element comes into view
  useEffect(() => {
    if (inView && onVODQuery.hasNextPage && !onVODQuery.isFetchingNextPage) {
      onVODQuery.fetchNextPage();
    }
  }, [inView, onVODQuery]);

  // Handlers
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

  // Flatten all pages into single array
  const movies =
    onVODQuery.data?.pages?.flatMap((page) => page?.results ?? []) ?? [];

  // Counters for display
  const totalCount = onVODQuery.data?.pages?.[0]?.count ?? 0;
  const visibleCount = movies.length;

  // Loading states
  const isInitialLoad =
    !movies.length &&
    (onVODQuery.isFetching || onVODQuery.fetchStatus === "fetching");

  const isLoadingMore = onVODQuery.isFetchingNextPage;

  // Header actions
  const headerActions = (
    <div className="flex items-center gap-3">
      <ThemeToggle key="theme-toggle" />
      <Button variant="outline" onClick={logout} className="gap-2">
        <LogOut className="h-4 w-4" />
        Wyloguj się
      </Button>
    </div>
  );

  // Navigation tabs
  const tabs = [
    {
      id: "onvod",
      label: "onVOD",
      isActive: true,
      onSelect: () => {},
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
        title="Filmy na platformach VOD"
        subtitle="Odkryj wszystkie dostępne filmy"
        tabs={tabs}
        headerActions={headerActions}
        globalFilters={<PlatformFiltersToolbar hideUnavailableButton={true} />}
        toolbar={
          <OnVODToolbar
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            sort={sort}
            onSortChange={setSort}
            onSuggest={handleSuggest}
            isSuggestDisabled={isSuggestDisabled}
            nextAvailableAt={nextAvailableAt}
            visibleCount={visibleCount}
            totalCount={totalCount}
          />
        }
      >
        <div className="p-4">
          {isInitialLoad ? (
            // Loading skeleton
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-32 bg-muted rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : movies.length === 0 ? (
            // Empty state
            <div className="text-center py-12">
              <div className="text-muted-foreground">
                <p className="text-lg font-medium">Brak filmów</p>
                <p className="text-sm mt-2">
                  Nie znaleziono filmów dostępnych na wybranych platformach.
                </p>
              </div>
            </div>
          ) : (
            // Movies list
            <div>
              {viewMode === "grid" ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {movies.map((movie) => (
                    <OnVODMovieCard
                      key={movie.movie.tconst}
                      movie={movie}
                      platforms={platformsQuery.data || []}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {movies.map((movie) => (
                    <OnVODMovieRow
                      key={movie.movie.tconst}
                      movie={movie}
                      platforms={platformsQuery.data || []}
                    />
                  ))}
                </div>
              )}

              {/* Infinite scroll trigger */}
              {onVODQuery.hasNextPage && (
                <div ref={loadMoreRef} className="flex justify-center py-8">
                  {isLoadingMore ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm text-muted-foreground">
                        Ładowanie więcej filmów...
                      </span>
                    </div>
                  ) : (
                    <div className="h-4" /> // Invisible trigger element
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </MediaLibraryLayout>

      <AISuggestionsDialog
        open={isSuggestionsModalOpen}
        onClose={handleCloseSuggestionsModal}
        watchlistTconstSet={new Set()} // Empty set for onVOD page
      />
    </>
  );
}
