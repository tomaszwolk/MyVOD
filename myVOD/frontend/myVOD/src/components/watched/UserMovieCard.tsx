import { useState, memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ImageIcon, Trash2 } from "lucide-react";
import { AvailabilityIcons } from "../watchlist/AvailabilityIcons";
import { RestoreButton } from "./RestoreButton";
import type { WatchedMovieItemVM } from "@/types/view/watched.types";
import type { PlatformDto } from "@/types/api.types";

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
  isDeleting
}) {
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  const hasGenres = item.genres && item.genres.length > 0;
  const displayGenres = hasGenres ? item.genres!.slice(0, 2).join(", ") : null;

  const handleRestore = () => {
    onRestore(item.id);
  };

  const handleDelete = () => {
    onDelete(item.id);
  };

  return (
    <article
      className="bg-card rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow"
      aria-labelledby={`movie-title-${item.id}`}
      role="article"
    >
      {/* Poster */}
      <div className="aspect-[2/3] bg-muted relative">
        {!imageError && item.posterPath ? (
          <img
            src={item.posterPath}
            alt={item.title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={handleImageError}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3
          id={`movie-title-${item.id}`}
          className="font-medium text-sm line-clamp-2 mb-1 text-foreground"
        >
          {item.title}
        </h3>

        {/* Year, Genres, Rating */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          {item.year && (
            <span>{item.year}</span>
          )}
          {displayGenres && (
            <>
              <span>•</span>
              <span className="truncate">{displayGenres}</span>
            </>
          )}
        </div>

        {/* Rating */}
        {item.avgRating && (
          <div className="text-sm font-medium text-foreground mb-2">
            {item.avgRating}/10
          </div>
        )}

        {/* Availability Icons */}
        <div className="mb-3">
          <AvailabilityIcons
            availability={item.availability}
            platforms={platforms}
          />
        </div>

        {/* Watched Date */}
        <div className="text-xs text-muted-foreground mb-3">
          Obejrzany: {item.watchedAtLabel}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
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
    </article>
  );
});
