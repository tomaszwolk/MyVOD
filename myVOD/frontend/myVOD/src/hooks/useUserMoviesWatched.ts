import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { listUserMovies } from "@/lib/api/movies";
import type { UserMovieDto, PlatformDto } from "@/types/api.types";
import type { WatchedMovieItemVM } from "@/types/view/watched.types";
import type { SortOption } from "@/types/view/watchlist.types";

/**
 * Formats a date string to a human-readable label for watched_at.
 * Returns a localized date string in Polish locale.
 */
function formatWatchedAtLabel(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("pl-PL", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateString; // Fallback to original string if parsing fails
  }
}

/**
 * Maps UserMovieDto to WatchedMovieItemVM.
 * Calculates availability summary and formats watched date.
 */
function mapToWatchedMovieItemVM(
  dto: UserMovieDto,
  userPlatforms: PlatformDto[]
): WatchedMovieItemVM {
  // Calculate if available on any user's platform
  const userPlatformIds = new Set(userPlatforms.map((p) => p.id));
  const isAvailableOnAnyPlatform = dto.availability.some(
    (a) => a.is_available === true && userPlatformIds.has(a.platform_id)
  );

  return {
    id: dto.id,
    tconst: dto.movie.tconst,
    title: dto.movie.primary_title,
    year: dto.movie.start_year,
    genres: dto.movie.genres,
    avgRating: dto.movie.avg_rating,
    userRating: dto.user_rating,
    posterPath: dto.movie.poster_path,
    watchedAt: dto.watched_at || "", // Should exist for watched status, but fallback
    watchedAtLabel: dto.watched_at ? formatWatchedAtLabel(dto.watched_at) : "",
    availability: dto.availability,
    isAvailableOnAnyPlatform,
  };
}

/**
 * Sorts watched movies by watched date (descending).
 * Movies without watched_at are placed at the end.
 */
function sortByWatchedAtDesc(
  items: WatchedMovieItemVM[]
): WatchedMovieItemVM[] {
  return [...items].sort((a, b) => {
    // Handle null/empty watchedAt values
    if (!a.watchedAt && !b.watchedAt) return 0;
    if (!a.watchedAt) return 1; // a goes to end
    if (!b.watchedAt) return -1; // b goes to end

    const aDate = new Date(a.watchedAt).getTime();
    const bDate = new Date(b.watchedAt).getTime();
    return bDate - aDate; // Newest first
  });
}

/**
 * Props for useUserMoviesWatched hook.
 */
function sortByRatingDesc(items: WatchedMovieItemVM[]): WatchedMovieItemVM[] {
  return [...items].sort((a, b) => {
    const aRating = a.avgRating ? parseFloat(a.avgRating) : 0;
    const bRating = b.avgRating ? parseFloat(b.avgRating) : 0;
    return bRating - aRating;
  });
}

function sortByYearDesc(items: WatchedMovieItemVM[]): WatchedMovieItemVM[] {
  return [...items].sort((a, b) => {
    const aYear = a.year || 0;
    const bYear = b.year || 0;
    return bYear - aYear;
  });
}

function sortByYearAsc(items: WatchedMovieItemVM[]): WatchedMovieItemVM[] {
  return [...items].sort((a, b) => {
    const aYear = a.year || 0;
    const bYear = b.year || 0;
    return aYear - bYear;
  });
}

type UseUserMoviesWatchedProps = {
  sortKey: SortOption;
  userPlatforms: PlatformDto[];
  enabled?: boolean;
};

/**
 * Custom hook for fetching and processing user's watched movies.
 * Handles sorting (backend vs client-side) and data transformation.
 */
export function useUserMoviesWatched({
  sortKey,
  userPlatforms,
  enabled = true,
}: UseUserMoviesWatchedProps) {
  const query = useQuery<UserMovieDto[], Error>({
    queryKey: [
      "user-movies",
      "watched",
      sortKey === "imdb_desc" ? { ordering: "-tconst__avg_rating" } : {},
    ],
    queryFn: () =>
      listUserMovies(
        "watched",
        sortKey === "imdb_desc" ? "-tconst__avg_rating" : undefined
      ),
    staleTime: 30_000, // Consider data fresh for 30 seconds
    enabled,
  });

  const processedData = useMemo(() => {
    if (!query.data) {
      return {
        items: [],
        isEmpty: true,
      };
    }

    // Map to view models
    let items = query.data.map((dto) =>
      mapToWatchedMovieItemVM(dto, userPlatforms)
    );

    // Apply client-side sorting if needed
    switch (sortKey) {
      case "added_desc":
        items = sortByWatchedAtDesc(items);
        break;
      case "imdb_desc":
        items = sortByRatingDesc(items);
        break;
      case "year_desc":
        items = sortByYearDesc(items);
        break;
      case "year_asc":
        items = sortByYearAsc(items);
        break;
      default:
        break;
    }

    return {
      items,
      isEmpty: items.length === 0,
    };
  }, [query.data, userPlatforms, sortKey]);

  return {
    ...query,
    ...processedData,
  };
}
