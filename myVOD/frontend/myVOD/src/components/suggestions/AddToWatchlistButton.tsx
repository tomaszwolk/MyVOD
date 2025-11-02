import { Button } from "@/components/ui/button";
import { Plus, Check, Loader2 } from "lucide-react";

/**
 * Props for AddToWatchlistButton component.
 */
type AddToWatchlistButtonProps = {
  onAdd: () => Promise<void>;
  disabled: boolean;
  added: boolean;
  loading: boolean;
};

/**
 * Button for adding a movie to watchlist from suggestions.
 * Shows different states: idle, loading, success (added).
 */
export function AddToWatchlistButton({
  onAdd,
  disabled,
  added,
  loading,
}: AddToWatchlistButtonProps) {
  const getAriaLabel = () => {
    if (loading) return "Dodawanie filmu do watchlisty...";
    if (added) return "Film został dodany do watchlisty";
    return "Dodaj film do watchlisty";
  };

  return (
    <Button
      size="sm"
      onClick={onAdd}
      disabled={disabled || loading}
      className="flex items-center gap-2"
      variant={added ? "secondary" : "default"}
      aria-label={getAriaLabel()}
      aria-disabled={disabled || loading}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Dodawanie...
        </>
      ) : added ? (
        <>
          <Check className="h-4 w-4" />
          Dodano
        </>
      ) : (
        <>
          <Plus className="h-4 w-4" />
          Dodaj do watchlisty
        </>
      )}
    </Button>
  );
}

