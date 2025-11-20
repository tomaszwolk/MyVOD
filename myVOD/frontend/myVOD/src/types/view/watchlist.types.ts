// Watchlist View Model Types

export type ViewMode = "grid" | "list";

export type SortOption = "added_desc" | "imdb_desc" | "year_desc" | "year_asc";

export type FiltersState = {
  showOnlyAvailable: boolean;
  /** @deprecated Use showOnlyAvailable instead */
  onlyAvailable?: boolean;
  /** @deprecated Use showOnlyAvailable instead */
  hideUnavailable?: boolean;
};

export type AvailabilitySummary = {
  isAvailableOnAny: boolean;
  availablePlatformIds: number[];
};

export type WatchlistItemVM = {
  id: number;
  movie: {
    tconst: string;
    primary_title: string;
    start_year: number | null;
    genres: string[] | null;
    avg_rating: string | null;
    poster_path: string | null;
  };
  availability: import("../api.types").MovieAvailabilityDto[];
  watchlisted_at: string | null;
  watched_at: string | null;
  availabilitySummary: AvailabilitySummary;
};
