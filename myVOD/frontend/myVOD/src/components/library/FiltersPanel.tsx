import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { http } from "@/lib/http";
import { useFiltersStore } from "@/stores/filtersStore";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

type FiltersPanelProps = {
  pageType: "onvod" | "watchlist" | "watched";
  onApplyFilters: () => void;
};

// Custom hook to fetch genres
const useGenresQuery = () => {
  return useQuery<string[]>({
    queryKey: ["genres"],
    queryFn: async () => {
      const response = await http.get("/movies/genres/");
      return response.data.map((g: { name: string }) => g.name);
    },
  });
};

export const FiltersPanel: React.FC<FiltersPanelProps> = ({
  pageType,
  onApplyFilters,
}) => {
  const { data: genresData, isLoading: isLoadingGenres } = useGenresQuery();
  const {
    genres,
    selectedGenres,
    showWatched,
    showOnWatchlist,
    setGenres,
    toggleGenre,
    selectAllGenres,
    deselectAllGenres,
    setShowWatched,
    setShowOnWatchlist,
    clearFilters,
  } = useFiltersStore();

  useEffect(() => {
    if (genresData) {
      setGenres(genresData);
    }
  }, [genresData, setGenres]);

  const handleClear = () => {
    clearFilters();
    onApplyFilters();
  };

  return (
    <div className="p-4 border-t bg-card text-card-foreground">
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold">Gatunki</h3>
          <div>
            <Button variant="link" size="sm" onClick={selectAllGenres}>
              Zaznacz wszystkie
            </Button>
            <Button variant="link" size="sm" onClick={deselectAllGenres}>
              Odznacz wszystkie
            </Button>
          </div>
        </div>
        <Separator />
        {isLoadingGenres ? (
          <p>Ładowanie gatunków...</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 mt-2">
            {genres.map((genre) => (
              <div key={genre} className="flex items-center space-x-2">
                <Checkbox
                  id={genre}
                  checked={selectedGenres.has(genre)}
                  onCheckedChange={() => toggleGenre(genre)}
                />
                <Label htmlFor={genre} className="font-normal">
                  {genre}
                </Label>
              </div>
            ))}
          </div>
        )}
      </div>

      {pageType === "onvod" && (
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Status</h3>
          <Separator />
          <div className="mt-2 space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="show-watched">Pokaż obejrzane</Label>
              <Switch
                id="show-watched"
                checked={showWatched}
                onCheckedChange={setShowWatched}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="show-on-watchlist">Pokaż na watchlist</Label>
              <Switch
                id="show-on-watchlist"
                checked={showOnWatchlist}
                onCheckedChange={setShowOnWatchlist}
              />
            </div>
          </div>
        </div>
      )}

      <Separator />

      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" onClick={handleClear}>
          Wyczyść
        </Button>
        <Button onClick={onApplyFilters}>Zastosuj filtry</Button>
      </div>
    </div>
  );
};
