import { create } from "zustand";

interface FiltersState {
  // All available genres fetched from the API
  genres: string[];
  // Set of currently selected genre names
  selectedGenres: Set<string>;
  // Toggles for OnVOD page status filters
  showWatched: boolean;
  showOnWatchlist: boolean;

  // Actions
  setGenres: (genres: string[]) => void;
  toggleGenre: (genre: string) => void;
  selectAllGenres: () => void;
  deselectAllGenres: () => void;
  setShowWatched: (value: boolean) => void;
  setShowOnWatchlist: (value: boolean) => void;
  clearFilters: () => void;
}

export const useFiltersStore = create<FiltersState>((set) => ({
  genres: [],
  selectedGenres: new Set(),
  showWatched: true,
  showOnWatchlist: true,

  setGenres: (genres) => set({ genres }),

  toggleGenre: (genre) => {
    set((state) => {
      const newSelectedGenres = new Set(state.selectedGenres);
      if (newSelectedGenres.has(genre)) {
        newSelectedGenres.delete(genre);
      } else {
        newSelectedGenres.add(genre);
      }
      return { selectedGenres: newSelectedGenres };
    });
  },

  selectAllGenres: () => {
    set((state) => ({
      selectedGenres: new Set(state.genres),
    }));
  },

  deselectAllGenres: () => {
    set({ selectedGenres: new Set() });
  },

  setShowWatched: (value) => set({ showWatched: value }),

  setShowOnWatchlist: (value) => set({ showOnWatchlist: value }),

  clearFilters: () => {
    set({
      selectedGenres: new Set(),
      showWatched: true,
      showOnWatchlist: true,
    });
  },
}));
