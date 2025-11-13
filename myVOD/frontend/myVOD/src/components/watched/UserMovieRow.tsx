import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { AvailabilityIcons } from "../watchlist/AvailabilityIcons";
import { RestoreButton } from "./RestoreButton";
import { TMDBPoster } from "@/components/TMDBPoster";
import { cn } from "@/lib/utils";
import type { WatchedMovieItemVM } from "@/types/view/watched.types";
import type { PlatformDto } from "@/types/api.types";

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
}) {
  const hasGenres = item.genres && item.genres.length > 0;
  const displayGenres = hasGenres ? item.genres!.slice(0, 3).join(", ") : null;

  const handleRestore = () => {
    onRestore(item.id);
  };

  const handleDelete = () => {
    onDelete(item.id);
  };

  return (
    <article
      className="bg-card rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow"
      aria-labelledby={`movie-title-${item.id}`}
      role="article"
    >
      <div className="flex gap-4">
        {/* Poster */}
        <TMDBPoster
          src={item.posterPath}
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
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* Title */}
              <h3
                id={`movie-title-${item.id}`}
                className="font-medium text-base line-clamp-1 mb-1 text-foreground"
              >
                {item.title}
              </h3>

              {/* Year, Genres, Rating */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                {item.year && <span>{item.year}</span>}
                {displayGenres && (
                  <>
                    <span>•</span>
                    <span className="truncate">{displayGenres}</span>
                  </>
                )}
                {item.avgRating && (
                  <>
                    <span>•</span>
                    <span className="font-medium text-foreground">
                      {item.avgRating}/10
                    </span>
                  </>
                )}
              </div>

              {/* Availability */}
              <div className="flex items-center gap-3 mb-2">
                <AvailabilityIcons
                  availability={item.availability}
                  platforms={platforms}
                />
              </div>

              {/* Watched Date */}
              <div className="text-sm text-muted-foreground">
                Obejrzany: {item.watchedAtLabel}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="ml-4 flex-shrink-0 flex gap-2">
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
      </div>
    </article>
  );
});
