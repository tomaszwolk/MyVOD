import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Props for RestoreButton component.
 */
type RestoreButtonProps = {
  onClick: () => void;
  loading?: boolean;
  ariaLabel?: string;
  dataTestId?: string;
};

/**
 * Button component for restoring movies from watched back to watchlist.
 * Shows loading state and proper ARIA attributes.
 */
export function RestoreButton({ onClick, loading = false, ariaLabel, dataTestId }: RestoreButtonProps) {
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-2"
      aria-label={ariaLabel}
      data-testid={dataTestId}
    >
      <RotateCcw className="w-4 h-4" aria-hidden="true" />
      {loading ? "Przywracanie..." : "Przywróć"}
    </Button>
  );
}
