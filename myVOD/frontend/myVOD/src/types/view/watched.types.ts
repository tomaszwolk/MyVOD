// Watched View Model Types

import type { SortOption } from "./watchlist.types";

export type WatchedViewMode = "grid" | "list";

export type WatchedSortKey = SortOption;

export type WatchedMovieItemVM = {
  id: number;
  tconst: string;
  title: string;
  year: number | null;
  genres: string[] | null;
  avgRating: string | null;
  userRating: number | null;
  posterPath: string | null;
  watchedAt: string; // oryginalny ISO string z API
  watchedAtLabel: string; // sformatowana data do UI
  availability: import("../api.types").MovieAvailabilityDto[];
  isAvailableOnAnyPlatform: boolean; // wyliczane z availability
};
