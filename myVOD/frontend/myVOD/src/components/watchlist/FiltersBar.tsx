import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { FiltersState } from "@/types/view/watchlist.types";

/**
 * Props for FiltersBar component.
 */
type FiltersBarProps = {
  filters: FiltersState;
  onChange: (filters: FiltersState) => void;
  visibleCount: number;
  totalCount: number;
  hasUserPlatforms: boolean;
};

/**
 * Filters bar with availability checkboxes and visible items counter.
 * Includes tooltips for disabled states and explanatory text.
 */
export function FiltersBar({
  filters,
  onChange,
  visibleCount,
  totalCount,
  hasUserPlatforms,
}: FiltersBarProps) {
  const handleToggleUnavailable = () => {
    // Toggle between showing all movies and showing only available movies
    onChange({
      ...filters,
      onlyAvailable: !filters.onlyAvailable,
    });
  };

  return (
    <div className="flex items-center gap-4">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleUnavailable}
                disabled={!hasUserPlatforms}
                className="text-sm"
              >
                {filters.onlyAvailable
                  ? "Pokaż niedostępne"
                  : "Ukryj niedostępne"}
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {!hasUserPlatforms ? (
              <p>Wybierz platformy VOD w ustawieniach profilu</p>
            ) : (
              <p>
                {filters.onlyAvailable
                  ? "Pokaż wszystkie filmy"
                  : "Ukryj filmy, których nie ma na moich platformach"}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Badge variant="secondary" className="text-xs">
        Wyświetlane: {visibleCount}/{totalCount}
      </Badge>
    </div>
  );
}
