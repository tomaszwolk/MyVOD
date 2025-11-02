import { useState, useEffect, useMemo } from "react";
import { isAxiosError } from "axios";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useUserProfile } from "@/hooks/useUserProfile";
import { usePlatforms } from "@/hooks/usePlatforms";
import { useUpdateUserPlatforms } from "@/hooks/useUpdateUserPlatforms";
import { useDeleteAccount } from "@/hooks/useDeleteAccount";
import { useChangePassword } from "@/hooks/useChangePassword";
import { useAddMovie } from "@/hooks/useAddMovie";
import { useListUserMovies } from "@/hooks/useListUserMovies";
import { usePatchUserMovie } from "@/hooks/usePatchUserMovie";
import { useAISuggestions } from "@/hooks/useAISuggestions";
import { MediaLibraryLayout } from "@/components/library/MediaLibraryLayout";
import { MediaToolbar } from "@/components/library/MediaToolbar";
import { SearchCombobox } from "@/components/watchlist/SearchCombobox";
import { SuggestAIButton } from "@/components/watchlist/SuggestAIButton";
import { AISuggestionsDialog } from "@/components/suggestions/AISuggestionsDialog";
import { PlatformPreferencesCard } from "@/components/profile/PlatformPreferencesCard";
import { ChangePasswordCard } from "@/components/profile/ChangePasswordCard";
import { DangerZoneCard } from "@/components/profile/DangerZoneCard";
import { DeleteAccountSection } from "@/components/profile/DeleteAccountSection";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import type { PlatformDto } from "@/types/api.types";

/**
 * ProfilePage component.
 * Manages user profile settings including platform preferences and account deletion.
 */
export function ProfilePage() {
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

  // Data fetching
  const userProfileQuery = useUserProfile();
  const platformsQuery = usePlatforms();
  const watchlistQuery = useListUserMovies('watchlist');
  const watchedQuery = useListUserMovies('watched');

  // Mutations
  const updatePlatformsMutation = useUpdateUserPlatforms();
  const deleteAccountMutation = useDeleteAccount();
  const changePasswordMutation = useChangePassword();
  const addMovieMutation = useAddMovie();
  const patchUserMovieMutation = usePatchUserMovie();

  // AI suggestions query for checking rate limit status
  const suggestionsQuery = useAISuggestions({
    enabled: false, // Don't fetch automatically, only when modal opens
  });

  // Local state for platform selection
  const [selectedPlatformIds, setSelectedPlatformIds] = useState<number[]>([]);
  const [initialSelectedPlatformIds, setInitialSelectedPlatformIds] = useState<number[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Initialize selected platforms from user profile
  useEffect(() => {
    if (userProfileQuery.data?.platforms) {
      const platformIds = userProfileQuery.data.platforms.map((p) => p.id);
      setSelectedPlatformIds(platformIds);
      setInitialSelectedPlatformIds(platformIds);
    }
  }, [userProfileQuery.data]);

  // Calculate if form is dirty (has unsaved changes)
  const isDirty = useMemo(() => {
    if (selectedPlatformIds.length !== initialSelectedPlatformIds.length) {
      return true;
    }
    const selectedSet = new Set(selectedPlatformIds.sort());
    const initialSet = new Set(initialSelectedPlatformIds.sort());
    return JSON.stringify([...selectedSet]) !== JSON.stringify([...initialSet]);
  }, [selectedPlatformIds, initialSelectedPlatformIds]);

  // Handlers
  const handlePlatformToggle = (platformId: number) => {
    setSelectedPlatformIds((prev) => {
      if (prev.includes(platformId)) {
        return prev.filter((id) => id !== platformId);
      }
      return [...prev, platformId];
    });
  };

  const handleSave = () => {
    if (!isDirty || updatePlatformsMutation.isPending) {
      return;
    }

    const sortedIds = [...selectedPlatformIds].sort((a, b) => a - b);
    updatePlatformsMutation.mutate(sortedIds, {
      onSuccess: (data) => {
        // Update initial state to match saved state
        const savedIds = data.platforms.map((p) => p.id);
        setInitialSelectedPlatformIds(savedIds);
        setSelectedPlatformIds(savedIds);
      },
    });
  };

  const handleReset = () => {
    setSelectedPlatformIds([...initialSelectedPlatformIds]);
  };

  const handleDeleteAccount = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    deleteAccountMutation.mutate();
  };

  const handleChangePassword = async (currentPassword: string, newPassword: string) => {
    await changePasswordMutation.mutateAsync({
      current_password: currentPassword,
      new_password: newPassword,
    });
  };

  const handleLogout = () => {
    logout();
    navigate("/auth/login", { replace: true });
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

  // Handlers for adding movies (from search)
  const handleAddToWatchlist = async (tconst: string) => {
    const watchedEntries = watchedQuery.data ?? [];
    const watchedEntriesByTconst = new Map<string, number>();
    watchedEntries.forEach(entry => {
      watchedEntriesByTconst.set(entry.movie.tconst, entry.id);
    });
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

  // Get existing tconsts for duplicate checking
  const watchlistEntries = watchlistQuery.data ?? [];
  const watchedEntries = watchedQuery.data ?? [];
  const existingTconsts = useMemo(
    () => watchlistEntries.map(entry => entry.movie.tconst),
    [watchlistEntries]
  );
  const existingWatchedTconsts = useMemo(
    () => watchedEntries.map(entry => entry.movie.tconst),
    [watchedEntries]
  );

  // Create watchlist tconst set for suggestions modal
  const watchlistTconstSet = useMemo(() => {
    return new Set(existingTconsts);
  }, [existingTconsts]);

  // Loading state
  const isLoading = userProfileQuery.isLoading || platformsQuery.isLoading;

  // Error state
  const hasError = userProfileQuery.isError || platformsQuery.isError;

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

  // Prepare tabs for navigation (similar to watchlist/watched)
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
      isActive: false,
      onSelect: () => navigate("/app/watched"),
    },
    {
      id: "profile",
      label: "Profil",
      isActive: true,
      onSelect: () => {},
    },
  ];

  // Header actions
  const headerActions = (
    <div className="flex items-center gap-3">
      <ThemeToggle key="theme-toggle" />
      <Button variant="outline" onClick={handleLogout} className="gap-2">
        <LogOut className="h-4 w-4" />
        Wyloguj się
      </Button>
    </div>
  );

  return (
    <>
      <MediaLibraryLayout
        title="Profil"
        subtitle={userProfileQuery.data?.email || ""}
        tabs={tabs}
        headerActions={headerActions}
        toolbar={
          <MediaToolbar
            searchSlot={
              <SearchCombobox
                onAddToWatchlist={handleAddToWatchlist}
                onAddToWatched={handleAddToWatched}
                existingTconsts={existingTconsts}
                existingWatchedTconsts={existingWatchedTconsts}
              />
            }
            primaryActionsSlot={
              <SuggestAIButton
                onClick={handleSuggest}
                disabled={isSuggestDisabled}
                nextAvailableAt={nextAvailableAt}
              />
            }
            // Other slots left empty - view controls and filters are not needed in profile view
          />
        }
      >
        <div className="p-4">
          {isLoading ? (
            <div className="space-y-4">
              <div className="h-8 bg-muted animate-pulse rounded w-1/3" />
              <div className="h-64 bg-muted animate-pulse rounded" />
            </div>
          ) : hasError ? (
            <div className="text-center py-12">
              <p className="text-destructive mb-4">Nie udało się załadować profilu</p>
              <Button onClick={() => {
                userProfileQuery.refetch();
                platformsQuery.refetch();
              }}>
                Spróbuj ponownie
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Platform Preferences Section */}
              <PlatformPreferencesCard
                platforms={platformsQuery.data || []}
                selectedIds={selectedPlatformIds}
                onToggle={handlePlatformToggle}
                dirty={isDirty}
                saving={updatePlatformsMutation.isPending}
                onSave={handleSave}
                onReset={handleReset}
              />

              {/* Separator */}
              <div className="border-t border-border" />

              {/* Change Password Section */}
              <ChangePasswordCard
                onChangePassword={handleChangePassword}
                isChanging={changePasswordMutation.isPending}
              />

              {/* Separator */}
              <div className="border-t border-border" />

              {/* Danger Zone Section */}
              <DangerZoneCard onRequestDelete={handleDeleteAccount} />

              {/* Delete Account Dialog */}
              <DeleteAccountSection
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                deleting={deleteAccountMutation.isPending}
                onConfirm={handleConfirmDelete}
              />
            </div>
          )}
        </div>
      </MediaLibraryLayout>

      <AISuggestionsDialog
        open={isSuggestionsModalOpen}
        onClose={handleCloseSuggestionsModal}
        watchlistTconstSet={watchlistTconstSet}
      />
    </>
  );
}

