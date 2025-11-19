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
import { cn } from "@/lib/utils";
import type { WatchedMovieItemVM } from "@/types/view/watched.types";
import type { PlatformDto } from "@/types/api.types";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";

/**
 * Props for UserMovieRow component.
 */
type UserMovieRowProps = {
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
 * Movie row component for watched movies list view.
 * Displays movie poster, title, year, genres, rating, availability, watched date, and restore button in a horizontal layout.
 */
export const UserMovieRow = memo<UserMovieRowProps>(function UserMovieRow({
  item,
  platforms,
  onRestore,
  isRestoring,
  onDelete,
  isDeleting,
  onRate,
}) {
  const hasGenres = item.genres && item.genres.length > 0;
  const displayGenres = hasGenres ? item.genres!.slice(0, 3).join(", ") : null;

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
      className="bg-card rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow flex flex-col"
      aria-labelledby={`movie-title-${item.id}`}
      role="article"
    >
      <div className="flex gap-4 flex-grow">
        {/* Poster */}
        <TMDBPoster
          src={item.posterUrl}
          alt={item.title}
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
                alt={item.title}
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
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                {/* Title */}
                <a
                  href={`https://www.imdb.com/title/${item.tconst}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-base line-clamp-1 mb-1 text-foreground hover:underline"
                  id={`movie-title-${item.id}`}
                >
                  {item.title}
                </a>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start">
                <p className="font-bold">{item.title}</p>
                {displayGenres && (
                  <p className="text-sm">
                    {item.year} • {displayGenres}
                  </p>
                )}
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

          {/* Year, Genres, Rating */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            {item.year && <span>{item.year}</span>}
            {displayGenres && (
              <>
                <span>•</span>
                <span className="truncate">{displayGenres}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <MovieRating
              imdbRating={item.imdbRating}
              userRating={item.userRating}
              onRateClick={handleRate}
              tconst={item.tconst}
            />
          </div>
        </div>
      </div>
      {/* Bottom Group */}
      <div className="mt-auto pt-2">
        <div className="flex justify-between items-center">
          {/* Availability Icons & Watched Date */}
          <div className="flex items-center gap-3">
            <AvailabilityIcons
              availability={item.availability}
              platforms={platforms}
            />
            <div className="text-sm text-muted-foreground">
              Obejrzany:{" "}
              {item.watchedAt
                ? formatDistanceToNow(new Date(item.watchedAt), {
                    addSuffix: true,
                    locale: pl,
                  })
                : "-"}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex-shrink-0 flex gap-2">
            <RestoreButton
              onClick={handleRestore}
              loading={isRestoring}
              ariaLabel={`Przywróć "${item.title}" do watchlisty`}
            />
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-2"
              aria-label={`Usuń "${item.title}" z historii obejrzanych`}
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
});
