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
 * Props for MovieRow component.
 */
type MovieRowProps = {
  item: WatchlistItemVM;
  platforms: PlatformDto[];
  onMarkWatched: (id: number) => void;
  onDelete: (id: number) => void;
};

/**
 * Movie row component for list view.
 * Displays movie poster, title, year, genres, rating, availability, and action buttons in a horizontal layout.
 */
export const MovieRow = memo<MovieRowProps>(function MovieRow({
  item,
  platforms,
  onMarkWatched,
  onDelete,
}) {
  const hasGenres = item.movie.genres && item.movie.genres.length > 0;
  const displayGenres = hasGenres
    ? item.movie.genres!.slice(0, 3).join(", ")
    : null;

  return (
    <article
      className="bg-card rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow"
      aria-labelledby={`movie-title-${item.id}`}
      role="article"
    >
      <div className="flex gap-4">
        {/* Poster */}
        <TMDBPoster
          src={item.movie.poster_path}
          alt={item.movie.primary_title}
          width={64}
          height={96}
          className="w-full h-full object-cover rounded"
        >
          {({ isPlaceholder, imgProps }) => (
            <div
              className={cn(
                "w-16 h-24 rounded flex-shrink-0",
                isPlaceholder ? "bg-white" : "bg-muted"
              )}
            >
              <img
                {...imgProps}
                alt={item.movie.primary_title}
                width={64}
                height={96}
                className={cn(imgProps.className, "rounded")}
                loading="lazy"
              />
            </div>
          )}
        </TMDBPoster>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    {/* Title */}
                    <h3
                      id={`movie-title-${item.id}`}
                      className="font-medium text-base line-clamp-1 mb-1 text-foreground"
                    >
                      {item.movie.primary_title}
                    </h3>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="start">
                    <p className="font-bold">{item.movie.primary_title}</p>
                    {displayGenres && (
                      <p className="text-sm">
                        {item.movie.start_year} • {displayGenres}
                      </p>
                    )}
                    <div className="mt-2 pt-2 border-t border-border">
                      <p className="text-sm">
                        IMDB.com rating: {item.movie.avg_rating || "-"}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Year, Genres, Rating */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <span>{item.movie.start_year}</span>
                {displayGenres && (
                  <>
                    <span>•</span>
                    <span className="truncate">{displayGenres}</span>
                  </>
                )}
                {item.movie.avg_rating && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                      {item.movie.avg_rating}/10
                    </span>
                  </>
                )}
              </div>

              {/* Availability */}
              <div className="flex items-center gap-3">
                <AvailabilityIcons
                  availability={item.availability}
                  platforms={platforms}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 ml-4 flex-shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onMarkWatched(item.id)}
                className="flex items-center gap-2"
                aria-label={`Oznacz "${item.movie.primary_title}" jako obejrzany`}
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
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
});
