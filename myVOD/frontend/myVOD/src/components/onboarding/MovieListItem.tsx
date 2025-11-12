import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { TMDBPoster } from "@/components/TMDBPoster";
import { cn } from "@/lib/utils";

type MovieListItemProps = {
  tconst: string;
  primaryTitle: string;
  startYear: number | null;
  posterUrl: string | null;
  avgRating?: string | null;
  onRemove: () => void;
  isRemoving?: boolean;
};

export function MovieListItem({
  tconst,
  primaryTitle,
  startYear,
  posterUrl,
  avgRating,
  onRemove,
  isRemoving,
}: MovieListItemProps) {
  return (
    <div
      className="flex items-center gap-3 p-3 border rounded-lg bg-card"
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
        <h4 className="font-medium text-sm truncate">{primaryTitle}</h4>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {startYear && <span>{startYear}</span>}
          {avgRating && <span>• ⭐ {avgRating}/10</span>}
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
