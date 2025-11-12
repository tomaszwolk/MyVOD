import { memo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { getPlatformIcon } from "@/components/onboarding/platformIcons";
import type { MovieAvailabilityDto, PlatformDto } from "@/types/api.types";

/**
 * Props for AvailabilityIcons component.
 */
type AvailabilityIconsProps = {
  availability: MovieAvailabilityDto[];
  platforms: PlatformDto[];
};

/**
 * Displays availability icons for movie platforms.
 * Shows colored icons for available platforms, gray for unavailable.
 * Only shows platforms that user has selected.
 */
export const AvailabilityIcons = memo<AvailabilityIconsProps>(
  function AvailabilityIcons({ availability, platforms }) {
    // Create a map of platform ID to platform data for quick lookup
    const platformMap = new Map(platforms.map((p) => [p.id, p]));

    // Filter availability to only show user's selected platforms
    const userAvailability = availability.filter((a) =>
      platformMap.has(a.platform_id)
    );

    if (userAvailability.length === 0) {
      return (
        <Badge
          variant="secondary"
          className="text-xs bg-destructive/80 text-destructive-foreground hover:bg-destructive/80"
        >
          Niedostępny
        </Badge>
      );
    }

    return (
      <TooltipProvider>
        <div className="flex gap-1">
          {userAvailability.map((avail) => {
            const platform = platformMap.get(avail.platform_id);
            if (!platform) return null;

            const IconComponent = getPlatformIcon(platform.platform_slug);
            const isAvailable = avail.is_available === true;
            const tooltipText = `${platform.platform_name}: ${
              isAvailable ? "Dostępny" : "Niedostępny"
            }`;

            return (
              <Tooltip key={avail.platform_id}>
                <TooltipTrigger asChild>
                  <div
                    className={`w-8 h-8 rounded flex items-center justify-center text-xs font-medium ${
                      isAvailable
                        ? "bg-white-100 text-green-800 dark:bg-green-100 dark:text-green-800"
                        : "bg-gray-100 text-gray-500 dark:bg-gray-100 dark:text-gray-500"
                    }`}
                    data-testid={`streaming-provider-icon-${platform.platform_slug}`}
                    role="img"
                    aria-label={tooltipText}
                  >
                    {IconComponent && <IconComponent className="w-6 h-6" />}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{tooltipText}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    );
  }
);
