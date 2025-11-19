import { Button } from "@/components/ui/button";
import { X, Eye, Bookmark, Star } from "lucide-react";
import { TMDBPoster } from "@/components/TMDBPoster";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type MovieListItemProps = {
  tconst: string;
  primaryTitle: string;
  startYear: number | null;
  genres: string[] | null;
  posterUrl: string | null;
  avgRating: string | null;
  userRating?: number | null;
  status: "watchlisted" | "watched";
  onRemove: () => void;
  onRateClick?: () => void;
  isRemoving?: boolean;
};

export function MovieListItem({
  tconst,
  primaryTitle,
  startYear,
  genres,
  posterUrl,
  avgRating,
  userRating,
  status,
  onRemove,
  onRateClick,
  isRemoving,
}: MovieListItemProps) {
  const hasGenres = genres && genres.length > 0;
  const displayGenres = hasGenres ? genres!.slice(0, 3).join(", ") : null;

  return (
    <div
      className="flex items-center gap-3 p-3 border rounded-lg bg-card shadow-sm"
      data-testid={`movie-list-item-${tconst}`}
    >
      <TMDBPoster
        src={posterUrl}
        alt={`${primaryTitle} poster`}
        width={50}
        height={75}
        className="w-full h-full object-cover"
      >
        {({ isPlaceholder, imgProps }) => (
          <div
            className={cn(
              "flex-shrink-0 w-[50px] h-[75px] rounded overflow-hidden",
              isPlaceholder ? "bg-white" : "bg-muted"
            )}
          >
            <img
              {...imgProps}
              alt={`${primaryTitle} poster`}
              width={50}
              height={75}
              loading="lazy"
            />
          </div>
        )}
      </TMDBPoster>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-medium text-sm truncate">{primaryTitle}</h4>
          {avgRating && (
            <div className="flex items-center gap-1 text-xs text-yellow-600">
              <Star className="h-3 w-3 fill-current" />
              <span>{avgRating}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {startYear && <span>{startYear}</span>}
          {displayGenres && (
            <>
              <span>•</span>
              <span className="truncate">{displayGenres}</span>
            </>
          )}
        </div>
        <div className="mt-1 flex items-center gap-2">
          {status === "watchlisted" && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Bookmark className="h-3 w-3" />
              Na watchliście
            </Badge>
          )}
          {status === "watched" && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                Obejrzany
                {userRating && (
                  <>
                    <span className="mx-1">|</span>
                    <Star className="h-3 w-3 text-blue-500" />
                    <span>{userRating}/10</span>
                  </>
                )}
              </Badge>
              {onRateClick && !userRating && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-5 px-2 text-xs"
                  onClick={onRateClick}
                  title="Oceń film"
                >
                  <Star className="h-3 w-3 mr-1" />
                  Oceń
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        disabled={isRemoving}
        className="flex-shrink-0"
        aria-label={`Remove ${primaryTitle} from list`}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
