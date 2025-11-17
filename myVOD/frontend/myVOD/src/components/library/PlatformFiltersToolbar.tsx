import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePlatformFilterStore } from "@/stores/platformFilterStore";
import { usePlatforms } from "@/hooks/usePlatforms";
import { getPlatformIcon } from "@/components/onboarding/platformIcons";

/**
 * Props for PlatformFiltersToolbar component.
 */
type PlatformFiltersToolbarProps = {
  hideUnavailableButton?: boolean;
};

/**
 * Global platform filters toolbar.
 * Provides platform selection toggles and global filter actions.
 */
export function PlatformFiltersToolbar({
  hideUnavailableButton = false,
}: PlatformFiltersToolbarProps = {}) {
  const {
    platforms: storePlatforms,
    selectedPlatformIds,
    togglePlatform,
    selectAll,
    deselectAll,
    initialize,
  } = usePlatformFilterStore();
  const { data: platforms, isLoading } = usePlatforms();

  // Initialize store with platforms data when loaded
  useEffect(() => {
    if (platforms && platforms.length > 0 && storePlatforms.length === 0) {
      initialize(platforms);
    }
  }, [platforms, storePlatforms.length, initialize]);

  const allSelected = selectedPlatformIds.size === storePlatforms.length;
  const noneSelected = selectedPlatformIds.size === 0;

  const handleToggleAll = () => {
    if (allSelected) {
      deselectAll();
    } else {
      selectAll();
    }
  };

  if (isLoading || storePlatforms.length === 0) {
    return (
      <div className="flex items-center gap-4 py-2">
        <div className="flex items-center gap-2">
          {/* Skeleton for platform icons */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-8 h-8 bg-muted rounded animate-pulse" />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-32 h-8 bg-muted rounded animate-pulse" />
          <div className="w-24 h-8 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-2">
      {/* Platform toggles */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground mr-2">
          Platformy:
        </span>
        <TooltipProvider>
          {storePlatforms.map((platform) => {
            const isSelected = selectedPlatformIds.has(platform.id);
            const IconComponent = getPlatformIcon(platform.platform_slug);

            return (
              <Tooltip key={platform.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => togglePlatform(platform.id)}
                    className={`
                      relative p-2 rounded-md transition-all duration-200 border
                      ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border hover:border-primary/50 hover:bg-accent"
                      }
                      focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                    `}
                    aria-label={`Przełącz filtr ${platform.platform_name}`}
                  >
                    {IconComponent ? (
                      <IconComponent className="w-6 h-6" />
                    ) : (
                      <div className="w-6 h-6 bg-muted rounded flex items-center justify-center text-xs font-bold">
                        {platform.platform_name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* Active indicator */}
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border border-background" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{platform.platform_name}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>

      {/* Global actions */}
      <div className="flex items-center gap-2">
        {!hideUnavailableButton && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // TODO: Implement global "Ukryj niedostępne" functionality
                      console.log("Global 'Ukryj niedostępne' clicked");
                    }}
                    className="text-sm"
                  >
                    Ukryj niedostępne
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Ukryj filmy niedostępne na wybranych platformach</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleAll}
                  disabled={noneSelected && allSelected} // Should never happen, but safety check
                  className="text-sm"
                >
                  {allSelected ? "Ukryj wszystkie" : "Pokaż wszystkie"}
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {allSelected
                  ? "Odznacz wszystkie platformy"
                  : "Zaznacz wszystkie platformy"}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
