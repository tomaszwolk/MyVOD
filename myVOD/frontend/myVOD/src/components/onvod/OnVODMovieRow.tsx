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
 * Props for OnVODMovieRow component.
 */
type OnVODMovieRowProps = {
  movie: UserMovieDto;
  platforms: PlatformDto[];
  onRate: (tconst: string, title: string, rating: number | null) => void;
};

/**
 * Movie row component for onVOD page list view.
 * Displays movie poster, title, year, genres, rating, and availability in a horizontal layout.
 * No action buttons - read-only view for browsing VOD movies.
 */
export const OnVODMovieRow = memo<OnVODMovieRowProps>(function OnVODMovieRow({
  movie,
  platforms,
  onRate,
}) {
  const hasGenres = movie.movie.genres && movie.movie.genres.length > 0;
  const displayGenres = hasGenres
    ? movie.movie.genres!.slice(0, 3).join(", ")
    : null;
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
      className="bg-card rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow"
      aria-labelledby={`movie-title-${movie.movie.tconst}`}
      role="article"
      data-testid={`onvod-movie-row-${movie.movie.tconst}`}
    >
      <div className="flex">
        {/* Poster */}
        <div className="relative w-16 h-24 flex-shrink-0">
          <TMDBPoster
            src={movie.movie.poster_path}
            alt={movie.movie.primary_title}
            width={64}
            height={96}
            className="rounded-md object-cover w-full h-full"
          >
            {({ isPlaceholder, imgProps }) => (
              <div
                className={cn(
                  "w-full h-full relative",
                  isPlaceholder ? "bg-white" : "bg-muted"
                )}
              >
                <img
                  {...imgProps}
                  alt={movie.movie.primary_title}
                  width={80}
                  height={112}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </TMDBPoster>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 flex items-center justify-between min-w-0">
          <div className="flex-1 min-w-0 mr-4">
            {/* Title */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={`https://www.imdb.com/title/${movie.movie.tconst}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-base line-clamp-1 mb-1 hover:underline"
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
                    <p>Twoja ocena: {movie.user_rating ? `${movie.user_rating}/10` : "-"}</p>
                    <p>Ocena IMDb: {movie.movie.avg_rating || "-"}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Year and Genres */}
            <div className="text-sm text-muted-foreground line-clamp-1">
              {movie.movie.start_year && <span>{movie.movie.start_year}</span>}
              {hasGenres && displayGenres && (
                <>
                  {movie.movie.start_year && <span className="mx-1">•</span>}
                  <span>{displayGenres}</span>
                </>
              )}
            </div>

            {/* Rating */}
            {movie.movie.avg_rating && (
                <div className="mt-1">
                    <MovieRating
                        imdbRating={movie.movie.avg_rating}
                        userRating={movie.user_rating}
                        onRateClick={handleRate}
                        tconst={movie.movie.tconst}
                    />
                </div>
            )}
          </div>

          {/* Availability & Actions */}
          <div className="flex-shrink-0 flex items-center gap-4">
            <AvailabilityIcons
              availability={movie.availability}
              platforms={platforms}
            />
            
            {!isMovieOnUserLists ? (
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
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
                <div className="flex items-center gap-2">
                    {movie.watched_at ? (
                        <>
                            <TooltipProvider>
                                <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" size="icon" onClick={handleRestoreToWatchlist} disabled={patchUserMovieMutation.isPending}>
                                    <Bookmark className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Przywróć do Watchlisty</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <span className="text-sm text-muted-foreground w-24 text-center flex-1">Obejrzany</span>
                        </>
                    ) : (
                        <>
                            <span className="text-sm text-muted-foreground w-24 text-center flex-1">Na watchliście</span>
                            <TooltipProvider>
                                <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" size="icon" onClick={handleMarkAsWatched} disabled={patchUserMovieMutation.isPending}>
                                    <Check className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Oznacz jako obejrzany</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </>
                    )}
                </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
});
