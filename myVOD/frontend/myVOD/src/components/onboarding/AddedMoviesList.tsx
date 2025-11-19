import { Badge } from "@/components/ui/badge";
import type { AddedMovieVM } from "@/types/api.types";
import { MovieListItem } from "./MovieListItem";

// Extend AddedMovieVM to include status
interface OnboardingMovieVM extends AddedMovieVM {
  status: "watchlisted" | "watched";
  user_rating?: number | null;
}

type AddedMoviesListProps = {
  items: OnboardingMovieVM[];
  onRemove: (item: OnboardingMovieVM) => void;
  removingTconsts?: Set<string>;
};

export function AddedMoviesList({
  items,
  onRemove,
  removingTconsts,
}: AddedMoviesListProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">Brak dodanych filmów</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          Dodane filmy
        </h3>
        <Badge variant="secondary" data-testid="added-movies-counter">
          {items.length}/3
        </Badge>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <MovieListItem
            key={item.tconst}
            tconst={item.tconst}
            primaryTitle={item.primaryTitle}
            startYear={item.startYear}
            genres={item.genres}
            posterUrl={item.posterUrl}
            avgRating={item.avgRating}
            status={item.status}
            userRating={item.user_rating}
            onRemove={() => onRemove(item)}
            isRemoving={removingTconsts?.has(item.tconst)}
          />
        ))}
      </div>
    </div>
  );
}
