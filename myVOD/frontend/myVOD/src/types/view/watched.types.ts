// Watched View Model Types

import type { SortOption } from "./watchlist.types";

export type WatchedViewMode = "grid" | "list";

export type WatchedSortKey = SortOption | "watched_at_desc" | "user_rating_desc" | "imdb_rating_desc";

export type WatchedMovieItemVM = {
  id: number;
  tconst: string;
  title: string;
  year: number | null;
  genres: string[] | null;
  imdbRating: string | null;
  avgRating: string | null; // alias for imdbRating for backward compatibility
  userRating: number | null;
  posterUrl: string | null;
  posterPath: string | null; // alias for posterUrl for backward compatibility
  watchedAt: string | null; // oryginalny ISO string z API
  watchedAtLabel: string | null; // sformatowana data w języku polskim
  availability: import("../api.types").MovieAvailabilityDto[];
  isAvailableOnAnyPlatform: boolean; // wyliczane z availability
};
