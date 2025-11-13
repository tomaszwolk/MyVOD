import { memo } from "react";
import { AvailabilityIcons } from "@/components/watchlist/AvailabilityIcons";
import { AddToWatchlistButton } from "./AddToWatchlistButton";
import { TMDBPoster } from "@/components/TMDBPoster";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AISuggestionCardVM } from "@/types/view/suggestions.types";
import type { PlatformDto } from "@/types/api.types";
import { cn } from "@/lib/utils";

/**
 * Props for SuggestionCard component.
 */
type SuggestionCardProps = {
  item: AISuggestionCardVM;
  isAlreadyOnWatchlist: boolean;
  isAdding: boolean;
  onAdd: () => Promise<void>;
  platforms: PlatformDto[];
};

/**
 * Card component displaying a single AI suggestion.
 * Shows poster, title, year, justification, availability icons, and add button.
 */
export const SuggestionCard = memo<SuggestionCardProps>(
  function SuggestionCard({
    item,
    isAlreadyOnWatchlist,
    isAdding,
    onAdd,
    platforms,
  }) {
    const isDisabled = isAlreadyOnWatchlist || isAdding;

    const genres = item.genres?.join(", ");
    const metaLine = [item.year, genres].filter(Boolean).join(" • ");

    return (
      <article
        className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors h-full"
        aria-labelledby={`suggestion-title-${item.tconst}`}
        data-testid={`suggestion-card-${item.tconst}`}
      >
        <div className="flex gap-4 h-full">
          {/* Poster */}
          {/* <div className="w-28 h-42 bg-muted rounded flex-shrink-0"> */}
          <TMDBPoster
            src={item.posterUrl}
            alt={`Plakat filmu ${item.title}`}
            width={80}
            height={112}
            className="w-full h-full object-cover rounded"
          >
            {({ isPlaceholder, imgProps }) => (
              <div
                className={cn(
                  "w-28 h-42 rounded flex-shrink-0",
                  isPlaceholder ? "bg-white" : "bg-muted"
                )}
              >
                <img
                  {...imgProps}
                  alt={`Plakat filmu ${item.title}`}
                  width={80}
                  height={112}
                  className={cn(imgProps.className, "rounded")}
                  loading="lazy"
                />
              </div>
            )}
          </TMDBPoster>

          {/* Content */}
          <div className="flex-1 min-w-0 flex flex-col">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  {/* Top Group */}
                  <div className="flex-1 flex flex-col">
                    <h3
                      id={`suggestion-title-${item.tconst}`}
                      className="font-medium text-sm line-clamp-2 text-foreground mb-1"
                    >
                      {item.title}
                    </h3>

                    {metaLine && (
                      <p
                        className="text-xs text-muted-foreground mb-2"
                        aria-label={`Rok produkcji i gatunki: ${metaLine}`}
                      >
                        {metaLine}
                      </p>
                    )}

                    <p
                      className="text-xs text-muted-foreground flex-1"
                      aria-label="Uzasadnienie sugestii"
                    >
                      {item.justification}
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs" side="top">
                  <p className="font-bold text-sm">{item.title}</p>
                  {metaLine && (
                    <p className="text-xs text-muted-foreground">{metaLine}</p>
                  )}
                  <p className="text-xs mt-2">{item.justification}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Down Group */}
            <div className="flex justify-between items-center mt-auto pt-2">
              {/* Left side section */}
              <div aria-label="Dostępność na platformach">
                <AvailabilityIcons
                  availability={item.availability}
                  platforms={platforms}
                />
              </div>

              {/* Right side section: Add Button */}
              <AddToWatchlistButton
                onAdd={onAdd}
                disabled={isDisabled}
                added={isAlreadyOnWatchlist}
                loading={isAdding}
              />
            </div>
          </div>
        </div>
      </article>
    );
  }
);
