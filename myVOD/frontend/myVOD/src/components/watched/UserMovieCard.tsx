import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { AvailabilityIcons } from "../watchlist/AvailabilityIcons";
import { RestoreButton } from "./RestoreButton";
import { TMDBPoster } from "@/components/TMDBPoster";
import { MovieRating } from "./MovieRating";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { WatchedMovieItemVM } from "@/types/view/watched.types";
import type { PlatformDto } from "@/types/api.types";
import { cn } from "@/lib/utils";
import { Star, Trophy } from "lucide-react";

/**
 * Props for UserMovieCard component.
 */
type UserMovieCardProps = {
  item: WatchedMovieItemVM;
  platforms: PlatformDto[];
  onRestore: (id: number) => void;
  isRestoring: boolean;
  onDelete: (id: number) => void;
  isDeleting: boolean;
  onRate: (
    userMovieId: number,
    movieTitle: string,
    currentRating: number | null
  ) => void;
};

/**
 * Movie card component for watched movies grid view.
 * Displays movie poster, title, year, genres, rating, availability, watched date, and restore button.
 */
export const UserMovieCard = memo<UserMovieCardProps>(function UserMovieCard({
  item,
  platforms,
  onRestore,
  isRestoring,
  onDelete,
  isDeleting,
  onRate,
}) {
  const hasGenres = item.genres && item.genres.length > 0;
  const displayGenres = hasGenres ? item.genres!.slice(0, 2).join(", ") : null;
  const tooltipMeta = [item.year, displayGenres].filter(Boolean).join(" • ");

  const handleRestore = () => {
    onRestore(item.id);
  };

  const handleDelete = () => {
    onDelete(item.id);
  };

  const handleRate = () => {
    onRate(item.id, item.title, item.userRating);
  };

  return (
    <article
      className="bg-card rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full"
      aria-labelledby={`movie-title-${item.id}`}
      role="article"
      data-testid={`watched-movie-card-${item.tconst}`}
    >
      {/* Poster */}
      <div className="aspect-[2/3] bg-muted relative">
        <TMDBPoster
          src={item.posterUrl}
          alt={item.title}
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
                alt={item.title}
                width={200}
                height={300}
                loading="lazy"
              />
            </div>
          )}
        </TMDBPoster>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 justify-between gap-2 p-4">
        <div className="space-y-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                {/* Title */}
                <a
                  href={`https://www.imdb.com/title/${item.tconst}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-sm line-clamp-2 mb-1 text-foreground hover:underline"
                >
                  <h3 id={`movie-title-${item.id}`}>{item.title}</h3>
                </a>
              </TooltipTrigger>

              {/* Year, Genres, Rating */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                {item.year && <span>{item.year}</span>}
                {displayGenres && (
                  <>
                    <span>•</span>
                    <span className="truncate">{displayGenres}</span>
                  </>
                )}
              </div>

              {/* Rating */}
              <div className="mb-2">
                <MovieRating
                  imdbRating={item.imdbRating}
                  userRating={item.userRating}
                  onRateClick={handleRate}
                  tconst={item.tconst}
                />
              </div>
              <TooltipContent side="bottom" align="start">
                <p className="font-bold">{item.title}</p>
                {tooltipMeta && <p className="text-sm">{tooltipMeta}</p>}
                <div className="mt-2 pt-2 border-t border-border">
                  <p>
                    Twoja ocena:{" "}
                    {item.userRating ? `${item.userRating}/10` : "-"}
                  </p>
                  <p>Ocena IMDb: {item.imdbRating || "-"}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Bottom Group */}
        <div>
          {/* Availability Icons */}
          <div className="mb-3">
            <AvailabilityIcons
              availability={item.availability}
              platforms={platforms}
            />
          </div>

          {/* Watched Date */}
          {/* <div className="text-xs text-muted-foreground mb-3">
          Obejrzany: {item.watchedAtLabel}
        </div> */}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <RestoreButton
              onClick={handleRestore}
              loading={isRestoring}
              ariaLabel={`Przywróć "${item.title}" do watchlisty`}
              dataTestId="restore-to-watchlist-button"
            />
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-2"
              aria-label={`Usuń "${item.title}" z historii obejrzanych`}
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
