import { memo } from "react";
import { AvailabilityIcons } from "../watchlist/AvailabilityIcons";
import { TMDBPoster } from "@/components/TMDBPoster";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { UserMovieDto, PlatformDto } from "@/types/api.types";
import { MovieRating } from "../watched/MovieRating";
import { Button } from "@/components/ui/button";
import { Bookmark, Check, Eye } from "lucide-react";
import { useAddUserMovie } from "@/hooks/useAddUserMovie";
import { usePatchUserMovie } from "@/hooks/usePatchUserMovie";

/**
 * Props for OnVODMovieCard component.
 */
type OnVODMovieCardProps = {
  movie: UserMovieDto;
  platforms: PlatformDto[];
  onRate: (tconst: string, title: string, rating: number | null) => void;
};

/**
 * Movie card component for onVOD page grid view.
 * Displays movie poster, title, year, genres, rating, and availability.
 * No action buttons - read-only view for browsing VOD movies.
 */
export const OnVODMovieCard = memo<OnVODMovieCardProps>(
  function OnVODMovieCard({ movie, platforms, onRate }) {
    const hasGenres = movie.movie.genres && movie.movie.genres.length > 0;
    const displayGenres = hasGenres ? movie.movie.genres!.join(", ") : null;
    const tooltipMeta = [movie.movie.start_year, displayGenres]
      .filter(Boolean)
      .join(" • ");

    const isMovieOnUserLists = movie.watchlisted_at || movie.watched_at;
    const addUserMovieMutation = useAddUserMovie();
    const patchUserMovieMutation = usePatchUserMovie();

    const handleAddToWatchlist = () => {
      addUserMovieMutation.mutate({ tconst: movie.movie.tconst });
    };

    const handleAddToWatched = () => {
      addUserMovieMutation.mutate({
        tconst: movie.movie.tconst,
        action: "mark_as_watched",
      });
    };

    const handleMarkAsWatched = () => {
      if (!movie.id) return;
      patchUserMovieMutation.mutate({
        id: movie.id,
        command: { action: "mark_as_watched" },
      });
    };

    const handleRestoreToWatchlist = () => {
      if (!movie.id) return;
      patchUserMovieMutation.mutate({
        id: movie.id,
        command: { action: "restore_to_watchlist" },
      });
    };

    const handleRate = () => {
      onRate(movie.movie.tconst, movie.movie.primary_title, movie.user_rating);
    };

    return (
      <article
        className="bg-card rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full"
        aria-labelledby={`movie-title-${movie.movie.tconst}`}
        role="article"
        data-testid={`onvod-movie-card-${movie.movie.tconst}`}
      >
        {/* Poster */}
        <div className="aspect-[2/3] bg-muted relative">
          <TMDBPoster
            src={movie.movie.poster_path}
            alt={movie.movie.primary_title}
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
                  alt={movie.movie.primary_title}
                  width={200}
                  height={300}
                  loading="lazy"
                />
              </div>
            )}
          </TMDBPoster>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-1">
          {/* Title */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={`https://www.imdb.com/title/${movie.movie.tconst}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-sm line-clamp-2 mb-1 leading-tight hover:underline"
                >
                  <h3 id={`movie-title-${movie.movie.tconst}`}>
                    {movie.movie.primary_title}
                  </h3>
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-bold">{movie.movie.primary_title}</p>
                {tooltipMeta && <p className="text-sm">{tooltipMeta}</p>}
                <div className="mt-2 pt-2 border-t border-border">
                  <p>
                    Twoja ocena:{" "}
                    {movie.user_rating ? `${movie.user_rating}/10` : "-"}
                  </p>
                  <p>Ocena IMDb: {movie.movie.avg_rating || "-"}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Year and Genres */}
          <div className="text-xs text-muted-foreground mb-2 flex gap-1 items-center">
            {movie.movie.start_year && <span>{movie.movie.start_year}</span>}
            {hasGenres && displayGenres && (
              <>
                {movie.movie.start_year && <span>•</span>}
                <span className="truncate">{displayGenres}</span>
              </>
            )}
          </div>

          {/* Rating */}
          {movie.movie.avg_rating && (
            <div className="mb-2">
              <MovieRating
                imdbRating={movie.movie.avg_rating}
                userRating={movie.user_rating}
                onRateClick={handleRate}
                tconst={movie.movie.tconst}
              />
            </div>
          )}

          {/* Availability */}
          <div className="mt-auto">
            <AvailabilityIcons
              availability={movie.availability}
              platforms={platforms}
            />
          </div>

          {/* Action Buttons */}
          {!isMovieOnUserLists ? (
            <div className="mt-2 flex items-center justify-between gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="flex-1"
                      onClick={handleAddToWatchlist}
                      disabled={addUserMovieMutation.isPending}
                    >
                      <Bookmark className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Dodaj do Watchlisty</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="flex-1"
                      onClick={handleAddToWatched}
                      disabled={addUserMovieMutation.isPending}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Dodaj do Obejrzanych</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          ) : (
            <div className="mt-2 text-sm text-muted-foreground flex items-center justify-between">
              {movie.watched_at ? (
                <>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleRestoreToWatchlist}
                          disabled={patchUserMovieMutation.isPending}
                        >
                          <Bookmark className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Przywróć do Watchlisty</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <span className="flex-1 text-center">Obejrzany</span>
                </>
              ) : (
                <>
                  <span className="flex-1 text-center">Na watchlist</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleMarkAsWatched}
                          disabled={patchUserMovieMutation.isPending}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Oznacz jako obejrzany</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </>
              )}
            </div>
          )}
        </div>
      </article>
    );
  }
);
