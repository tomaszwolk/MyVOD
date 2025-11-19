import { Star, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";

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
    <div className="flex items-center gap-2">
      {/* IMDb Rating */}
      <a
        href={`https://www.imdb.com/title/${tconst}/`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`IMDb rating: ${imdbRating}`}
        className="flex items-center gap-1 text-foreground hover:opacity-80 transition-opacity"
      >
        <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
        <span className="font-semibold">{imdbRating}</span>
      </a>

      {/* Separator */}
      <div className="h-4 w-px bg-border" />

      {/* User Rating */}
      <TooltipProvider>
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
          <span className="">{userRating ? `${userRating}` : "Rate"}</span>
        </div>
      </TooltipProvider>
    </div>
  );
};
