import { Badge } from "@/components/ui/badge";
import type { AddedMovieVM } from "@/types/api.types";
import { MovieListItem } from "./MovieListItem";

type AddedMoviesListProps = {
  items: AddedMovieVM[];
  onRemove: (item: AddedMovieVM) => void;
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
            onRemove={() => onRemove(item)}
            isRemoving={removingTconsts?.has(item.tconst)}
          />
        ))}
      </div>
    </div>
  );
}
