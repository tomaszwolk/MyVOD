import { Button } from "@/components/ui/button";
import { Loader2, X, CheckCircle2, AlertCircle } from "lucide-react";
import { TMDBPoster } from "@/components/TMDBPoster";
import type { OnboardingSelectedItem } from "@/types/view/onboarding-watched.types";

/**
 * Props for SelectedMovieItem component.
 */
type SelectedMovieItemProps = {
  item: OnboardingSelectedItem;
  onUndo: (item: OnboardingSelectedItem) => void;
};

/**
 * Individual selected movie item showing status and undo button.
 * Displays poster, title, year, and operation status (loading/success/error).
 */
export function SelectedMovieItem({ item, onUndo }: SelectedMovieItemProps) {
  const handleUndo = () => {
    if (item.status !== 'loading') {
      onUndo(item);
    }
  };

  return (
    <div
      className={`flex items-center gap-3 p-3 border rounded-lg ${
        item.status === 'error' ? 'border-destructive bg-destructive/5' : 'bg-card'
      }`}
    >
      {/* Poster */}
      <div className="flex-shrink-0 w-[50px] h-[75px] bg-muted rounded overflow-hidden">
        <TMDBPoster
          src={item.poster_path}
          alt={`${item.primary_title} poster`}
          width={50}
          height={75}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Movie info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate">{item.primary_title}</h4>
        {item.start_year && (
          <p className="text-xs text-muted-foreground">{item.start_year}</p>
        )}
        
        {/* Status indicator */}
        <div className="flex items-center gap-1 mt-1">
          {item.status === 'loading' && (
            <>
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Oznaczanie...</span>
            </>
          )}
          {item.status === 'success' && (
            <>
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              <span className="text-xs text-green-600">Obejrzany</span>
            </>
          )}
          {item.status === 'error' && (
            <>
              <AlertCircle className="h-3 w-3 text-destructive" />
              <span className="text-xs text-destructive">
                {item.error || 'Błąd'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Undo button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleUndo}
        disabled={item.status === 'loading'}
        className="flex-shrink-0"
        aria-label={`Cofnij oznaczenie filmu ${item.primary_title}`}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

