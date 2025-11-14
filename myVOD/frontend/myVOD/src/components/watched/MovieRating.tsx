import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface MovieRatingProps {
  imdbRating: string | null;
  userRating: number | null;
  onRateClick: () => void;
  tconst: string;
  showUserRating?: boolean;
}

export const MovieRating = ({
  imdbRating,
  userRating,
  onRateClick,
  tconst,
  showUserRating = true,
}: MovieRatingProps) => {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1">
        <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
        <span className="text-sm">
          {imdbRating ? `${imdbRating} / 10` : "N/A"}
        </span>
      </div>
      {showUserRating && (
        <div
          className="flex items-center gap-1 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onRateClick();
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              onRateClick();
            }
          }}
          aria-label={`Rate movie ${tconst}`}
        >
          <Star
            className={cn(
              "h-4 w-4 text-blue-400",
              userRating && "fill-blue-400"
            )}
          />
          <span className="text-sm">
            {userRating ? `${userRating} / 10` : "Rate"}
          </span>
        </div>
      )}
    </div>
  );
};
