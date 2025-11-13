import { Badge } from "@/components/ui/badge";
import { MovieListItem } from "./MovieListItem";
import type { OnboardingSelectedItem } from "@/types/view/onboarding-watched.types";
import { Loader2, AlertCircle } from "lucide-react";

type SelectedMoviesListProps = {
  items: OnboardingSelectedItem[];
  maxItems: number;
  onUndo: (item: OnboardingSelectedItem) => void;
};

export function SelectedMoviesList({
  items,
  maxItems,
  onUndo,
}: SelectedMoviesListProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">Brak oznaczonych filmów</p>
        <p className="text-xs mt-1">
          Wyszukaj i oznacz filmy które już widziałeś
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          Oznaczone filmy
        </h3>
        <Badge variant="secondary">
          {items.length}/{maxItems}
        </Badge>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.tconst} className="relative">
            <MovieListItem
              tconst={item.tconst}
              primaryTitle={item.primary_title}
              startYear={item.start_year}
              posterUrl={item.poster_path}
              avgRating={item.avg_rating}
              onRemove={() => onUndo(item)}
              isRemoving={item.status === "loading"}
            />
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
              {item.status === "loading" && (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              )}
              {/* {item.status === 'success' && (
                <CheckCircle2 className="h-6 w-6 text-green-600" /> */}
              {/* )} */}
              {item.status === "error" && (
                <AlertCircle className="h-6 w-6 text-destructive" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
