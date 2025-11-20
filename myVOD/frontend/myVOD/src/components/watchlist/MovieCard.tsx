import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Eye, Trash2, Star } from "lucide-react";
import { AvailabilityIcons } from "./AvailabilityIcons";
import { TMDBPoster } from "@/components/TMDBPoster";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
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
    ? item.movie.genres!.join(", ")
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
        >
          {({ isPlaceholder, imgProps }) => (
            <div
              className={cn(
                "aspect-[2/3] relative",
                isPlaceholder ? "bg-white" : "bg-muted"
              )}
            >
              <img
                {...imgProps}
                alt={item.movie.primary_title}
                width={200}
                height={300}
                loading="lazy"
              />
            </div>
          )}
        </TMDBPoster>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-grow">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {/* Title */}
              <a
                href={`https://www.imdb.com/title/${item.movie.tconst}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-sm line-clamp-2 mb-1 text-foreground hover:underline"
              >
                <h3 id={`movie-title-${item.id}`}>
                  {item.movie.primary_title}
                </h3>
              </a>
            </TooltipTrigger>

            {/* Year, Genres, Rating */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              {item.movie.start_year && <span>{item.movie.start_year}</span>}
              {displayGenres && (
                <>
                  <span>•</span>
                  <span className="truncate">{displayGenres}</span>
                </>
              )}
            </div>

            {/* Rating */}
            {item.movie.avg_rating && (
              <div className="flex items-center gap-1 text-sm font-medium text-foreground mb-2">
                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                <span>{item.movie.avg_rating}/10</span>
              </div>
            )}
            <TooltipContent side="bottom" align="start">
              <p className="font-bold">{item.movie.primary_title}</p>
              {tooltipMeta && <p className="text-sm">{tooltipMeta}</p>}
              <div className="mt-2 pt-2 border-t border-border">
                <p className="text-sm">
                  IMDB.com rating: {item.movie.avg_rating || "-"}
                </p>
              </div>
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
