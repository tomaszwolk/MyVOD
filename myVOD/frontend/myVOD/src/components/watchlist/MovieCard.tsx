import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Trash2 } from "lucide-react";
import { AvailabilityIcons } from "./AvailabilityIcons";
import { TMDBPoster } from "@/components/TMDBPoster";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { WatchlistItemVM } from "@/types/view/watchlist.types";
import type { PlatformDto } from "@/types/api.types";

/**
 * Props for MovieCard component.
 */
type MovieCardProps = {
  item: WatchlistItemVM;
  platforms: PlatformDto[];
  onMarkWatched: (id: number) => void;
  onDelete: (id: number) => void;
};

/**
 * Movie card component for grid view.
 * Displays movie poster, title, year, genres, rating, availability, and action buttons.
 */
export const MovieCard = memo<MovieCardProps>(function MovieCard({
  item,
  platforms,
  onMarkWatched,
  onDelete,
}) {
  const hasGenres = item.movie.genres && item.movie.genres.length > 0;
  const displayGenres = hasGenres
    ? item.movie.genres!.slice(0, 2).join(", ")
    : null;
  const tooltipMeta = [item.movie.start_year, displayGenres]
    .filter(Boolean)
    .join(" • ");

  return (
    <article
      className="bg-card rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow flex flex-col"
      aria-labelledby={`movie-title-${item.id}`}
      role="article"
      data-testid={`movie-card-${item.movie.tconst}`}
    >
      {/* Poster */}
      <div className="aspect-[2/3] bg-muted relative">
        <TMDBPoster
          src={item.movie.poster_path}
          alt={item.movie.primary_title}
          width={200}
          height={300}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-grow">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {/* Top Group */}
              <div>
                {/* Title */}
                <h3
                  id={`movie-title-${item.id}`}
                  className="font-medium text-sm line-clamp-2 mb-1 text-foreground"
                >
                  {item.movie.primary_title}
                </h3>

                {/* Year, Genres, Rating */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  {item.movie.start_year && (
                    <span>{item.movie.start_year}</span>
                  )}
                  {displayGenres && (
                    <>
                      <span>•</span>
                      <span className="truncate">{displayGenres}</span>
                    </>
                  )}
                </div>

                {/* Rating */}
                {item.movie.avg_rating && (
                  <div className="text-sm font-medium text-foreground mb-2">
                    {item.movie.avg_rating}/10
                  </div>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-bold">{item.movie.primary_title}</p>
              {tooltipMeta && <p className="text-sm">{tooltipMeta}</p>}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Bottom Group */}
        <div className="mt-auto pt-2">
          {/* Availability Icons */}
          <div className="mb-3">
            <AvailabilityIcons
              availability={item.availability}
              platforms={platforms}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onMarkWatched(item.id)}
              className="flex-1 flex items-center gap-2"
              aria-label={`Oznacz "${item.movie.primary_title}" jako obejrzany`}
              data-testid="mark-as-watched-button"
            >
              <Eye className="w-4 h-4" aria-hidden="true" />
              Obejrzane
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onDelete(item.id)}
              className="flex items-center gap-2"
              aria-label={`Usuń "${item.movie.primary_title}" z watchlisty`}
              data-testid="delete-movie-button"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
});
