import { memo } from "react";
import { ImageIcon } from "lucide-react";
import { AvailabilityIcons } from "@/components/watchlist/AvailabilityIcons";
import { AddToWatchlistButton } from "./AddToWatchlistButton";
import type { AISuggestionCardVM } from "@/types/view/suggestions.types";
import type { PlatformDto } from "@/types/api.types";

/**
 * Props for SuggestionCard component.
 */
type SuggestionCardProps = {
  item: AISuggestionCardVM;
  isAlreadyOnWatchlist: boolean;
  isAdding: boolean;
  onAdd: () => void;
  platforms: PlatformDto[];
};

/**
 * Card component displaying a single AI suggestion.
 * Shows poster, title, year, justification, availability icons, and add button.
 */
export const SuggestionCard = memo<SuggestionCardProps>(function SuggestionCard({
  item,
  isAlreadyOnWatchlist,
  isAdding,
  onAdd,
  platforms,
}) {
  const isDisabled = isAlreadyOnWatchlist || isAdding;

  return (
    <article 
      className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors"
      aria-labelledby={`suggestion-title-${item.tconst}`}
    >
      <div className="flex gap-4">
        {/* Poster */}
        <div className="w-20 h-28 bg-muted rounded flex items-center justify-center flex-shrink-0 overflow-hidden" role="img" aria-label={`Plakat filmu ${item.title}`}>
          {item.posterUrl ? (
            <img
              src={item.posterUrl}
              alt={`Plakat filmu ${item.title}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="text-muted-foreground text-xs p-2 text-center">
              <ImageIcon className="w-6 h-6 mx-auto mb-1" aria-hidden="true" />
              <span className="text-[10px]">Brak plakatu</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1">
            <h3 
              id={`suggestion-title-${item.tconst}`}
              className="font-medium text-sm line-clamp-2 text-foreground mb-1"
            >
              {item.title}
            </h3>

            {item.year && (
              <p className="text-xs text-muted-foreground mb-2" aria-label={`Rok produkcji: ${item.year}`}>
                {item.year}
              </p>
            )}

            <p className="text-xs text-muted-foreground line-clamp-2 mb-3" aria-label="Uzasadnienie sugestii">
              {item.justification}
            </p>

            {/* Availability Icons */}
            <div className="mb-3" aria-label="Dostępność na platformach">
              <AvailabilityIcons
                availability={item.availability}
                platforms={platforms}
              />
            </div>
          </div>

          {/* Add Button */}
          <div className="flex justify-end">
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
});

