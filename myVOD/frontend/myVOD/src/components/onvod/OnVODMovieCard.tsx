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

/**
 * Props for OnVODMovieCard component.
 */
type OnVODMovieCardProps = {
  movie: UserMovieDto;
  platforms: PlatformDto[];
};

/**
 * Movie card component for onVOD page grid view.
 * Displays movie poster, title, year, genres, rating, and availability.
 * No action buttons - read-only view for browsing VOD movies.
 */
export const OnVODMovieCard = memo<OnVODMovieCardProps>(
  function OnVODMovieCard({ movie, platforms }) {
    const hasGenres = movie.movie.genres && movie.movie.genres.length > 0;
    const displayGenres = hasGenres
      ? movie.movie.genres!.slice(0, 2).join(", ")
      : null;
    const tooltipMeta = [movie.movie.start_year, displayGenres]
      .filter(Boolean)
      .join(" • ");

    return (
      <article
        className="bg-card rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full"
        aria-labelledby={`movie-title-${movie.movie.tconst}`}
        role="article"
        data-testid={`onvod-movie-card-${movie.movie.tconst}`}
      >
        {/* Poster */}
        <div className="relative aspect-[2/3] w-full">
          <TMDBPoster
            src={movie.movie.poster_path}
            alt={movie.movie.primary_title}
            width={200}
            height={300}
            className="rounded-md object-cover"
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
                <h3
                  id={`movie-title-${movie.movie.tconst}`}
                  className="font-semibold text-sm line-clamp-2 mb-1 leading-tight"
                >
                  {movie.movie.primary_title}
                </h3>
              </TooltipTrigger>
              {tooltipMeta && (
                <TooltipContent>
                  <p>{tooltipMeta}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          {/* Year and Genres */}
          <div className="text-xs text-muted-foreground mb-2 flex flex-wrap gap-1">
            {movie.movie.start_year && <span>{movie.movie.start_year}</span>}
            {hasGenres && displayGenres && (
              <>
                {movie.movie.start_year && <span>•</span>}
                <span className="line-clamp-1">{displayGenres}</span>
              </>
            )}
          </div>

          {/* Rating */}
          {movie.movie.avg_rating && (
            <div className="flex items-center gap-1 mb-3">
              <div className="flex items-center gap-1">
                <svg
                  className="w-4 h-4 text-yellow-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-sm font-medium">
                  {movie.movie.avg_rating}
                </span>
              </div>
            </div>
          )}

          {/* Availability */}
          <div className="mt-auto">
            <AvailabilityIcons
              availability={movie.availability}
              platforms={platforms}
            />
          </div>
        </div>
      </article>
    );
  }
);
