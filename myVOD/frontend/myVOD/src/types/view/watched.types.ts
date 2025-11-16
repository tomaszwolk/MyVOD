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
  userRating: number | null;
  posterUrl: string | null;
  watchedAt: string | null; // oryginalny ISO string z API
  availability: import("../api.types").MovieAvailabilityDto[];
  isAvailableOnAnyPlatform: boolean; // wyliczane z availability
};
