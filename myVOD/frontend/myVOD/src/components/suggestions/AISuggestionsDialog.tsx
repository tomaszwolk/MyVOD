import { useMemo, useState, useCallback } from "react";
import { isAxiosError } from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useAISuggestions } from "@/hooks/useAISuggestions";
import { useAddToWatchlist } from "@/hooks/useAddToWatchlist";
import { usePlatforms } from "@/hooks/usePlatforms";
import { mapAISuggestionsToVM } from "@/lib/suggestions-mapper";
import { AISuggestionsHeader } from "./AISuggestionsHeader";
import { SuggestionList } from "./SuggestionList";
import { AISuggestionsEmptyState } from "./AISuggestionsEmptyState";
import type { AISuggestionsViewModel } from "@/types/view/suggestions.types";
import type { EmptyStateVariant } from "@/types/view/suggestions.types";
import type { AISuggestionsDto } from "@/types/api.types";

type SuggestionsErrorResponse = {
  detail?: string;
  expires_at?: string;
};

/**
 * Props for AISuggestionsDialog component.
 */
type AISuggestionsDialogProps = {
  open: boolean;
  onClose: () => void;
  watchlistTconstSet: Set<string>;
};

/**
 * Main dialog component for AI suggestions view.
 * Handles fetching, displaying, and adding suggestions to watchlist.
 * Implements focus trap and keyboard navigation (Esc, Tab).
 */
export function AISuggestionsDialog({
  open,
  onClose,
  watchlistTconstSet,
}: AISuggestionsDialogProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const debug = searchParams.get("debug") === "true";

  // Fetch suggestions
  const suggestionsQuery = useAISuggestions({
    debug,
    enabled: open, // Only fetch when modal is open
  });

  // Add to watchlist mutation
  const addToWatchlistMutation = useAddToWatchlist();
  const platformsQuery = usePlatforms(open);

  // Track added items and loading states
  const [addedSet, setAddedSet] = useState<Set<string>>(new Set());
  const [isAddingByTconst, setIsAddingByTconst] = useState<
    Record<string, boolean>
  >({});

  // Map API response to ViewModel
  const viewModel: AISuggestionsViewModel = useMemo(() => {
    const dto: AISuggestionsDto | null = suggestionsQuery.data ?? null;
    return mapAISuggestionsToVM(dto, suggestionsQuery.error ?? null);
  }, [suggestionsQuery.data, suggestionsQuery.error]);

  // Determine empty state variant
  const emptyStateVariant: EmptyStateVariant = useMemo(() => {
    const error = suggestionsQuery.error;
    if (isAxiosError<SuggestionsErrorResponse>(error)) {
      if (error.response?.status === 404) return "no-data";
      if (error.response?.status === 429) return "rate-limited";
      return "error";
    }
    if (viewModel.items.length === 0 && !suggestionsQuery.isLoading) {
      return "no-suggestions";
    }
    return "no-suggestions";
  }, [
    suggestionsQuery.error,
    viewModel.items.length,
    suggestionsQuery.isLoading,
  ]);

  // Handle adding movie to watchlist
  const handleAdd = useCallback(
    async (tconst: string) => {
      if (addedSet.has(tconst) || watchlistTconstSet.has(tconst)) {
        return;
      }

      setIsAddingByTconst((prev) => ({ ...prev, [tconst]: true }));

      try {
        await addToWatchlistMutation.mutateAsync({
          tconst,
          added_from_ai_suggestion: true,
        });
        setAddedSet((prev) => new Set([...prev, tconst]));
      } catch {
        // Error handling is done in the mutation (toast notifications)
        // Don't add to addedSet on error
      } finally {
        setIsAddingByTconst((prev) => {
          const next = { ...prev };
          delete next[tconst];
          return next;
        });
      }
    },
    [addedSet, watchlistTconstSet, addToWatchlistMutation]
  );

  // Handle dialog close with navigation
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        // Reset added items when closing
        setAddedSet(new Set());
        // Navigate back or to watchlist
        if (window.history.length > 1) {
          navigate(-1);
        } else {
          navigate("/app/watchlist");
        }
        onClose();
      }
    },
    [navigate, onClose]
  );

  // Show loading state
  if (suggestionsQuery.isLoading) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="max-w-7x1 max-h-[100vh] overflow-y-auto"
          aria-describedby="suggestions-loading-description"
          style={{ backgroundColor: "var(--search-popover-background)" }}
          data-testid="ai-suggestions-dialog"
        >
          <DialogHeader>
            <DialogTitle>Sugestie filmów od AI</DialogTitle>
            <DialogDescription id="suggestions-loading-description">
              Generuję spersonalizowane sugestie...
            </DialogDescription>
          </DialogHeader>
          <div
            className="flex items-center justify-center py-12"
            role="status"
            aria-live="polite"
          >
            <Loader2
              className="h-8 w-8 animate-spin text-muted-foreground"
              aria-hidden="true"
            />
            <span className="sr-only">Ładowanie sugestii filmów</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show empty state or error
  if (viewModel.items.length === 0) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="max-w-7xl max-h-[100vh] overflow-y-auto"
          aria-describedby="suggestions-empty-description"
          style={{ backgroundColor: "var(--search-popover-background)" }}
          data-testid="ai-suggestions-dialog"
        >
          <DialogHeader>
            <DialogTitle>Sugestie filmów od AI</DialogTitle>
            <DialogDescription id="suggestions-empty-description">
              Spersonalizowane rekomendacje na podstawie Twojej listy filmów
            </DialogDescription>
          </DialogHeader>

          <AISuggestionsEmptyState
            variant={emptyStateVariant}
            message={viewModel.errorMessage}
            onRetry={() => suggestionsQuery.refetch()}
          />

          <DialogFooter>
            <Button
              onClick={() => handleOpenChange(false)}
              variant="outline"
              aria-label="Zamknij modal sugestii"
            >
              Zamknij
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Show suggestions list
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-7xl max-h-[100vh] overflow-y-auto"
        aria-describedby="suggestions-description"
        style={{ backgroundColor: "var(--search-popover-background)" }}
        data-testid="ai-suggestions-dialog"
      >
        <DialogHeader>
          <DialogTitle id="suggestions-title">
            <AISuggestionsHeader
              expiresAt={viewModel.expiresAt}
              isRateLimited={viewModel.isRateLimited}
            />
          </DialogTitle>
          <DialogDescription id="suggestions-description">
            Spersonalizowane rekomendacje na podstawie Twojej listy filmów
          </DialogDescription>
        </DialogHeader>

        <div className="py-4" role="region" aria-labelledby="suggestions-title">
          <SuggestionList
            items={viewModel.items}
            onAdd={handleAdd}
            addedSet={addedSet}
            watchlistTconstSet={watchlistTconstSet}
            isAddingByTconst={isAddingByTconst}
            platforms={platformsQuery.data || []}
          />
        </div>

        <DialogFooter>
          <Button
            onClick={() => handleOpenChange(false)}
            variant="outline"
            aria-label="Zamknij modal sugestii"
          >
            Zamknij
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
