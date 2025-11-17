import type { UserMovieDto, PlatformDto } from "@/types/api.types";
import type {
  WatchedMovieItemVM,
  WatchedSortKey,
} from "@/types/view/watched.types";
import { formatLastCheckedDate } from "@/utils/date-utils";

/**
 * Maps UserMovieDto to WatchedMovieItemVM with availability summary.
 */
function mapToWatchedMovieItemVM(
  dto: UserMovieDto,
  userPlatforms: PlatformDto[]
): WatchedMovieItemVM {
  // Calculate availability summary
  const userPlatformIds = new Set(userPlatforms.map((p) => p.id));
  const availablePlatforms = dto.availability.filter(
    (a) => a.is_available === true && userPlatformIds.has(a.platform_id)
  );

  return {
    id: dto.id,
    tconst: dto.movie.tconst,
    title: dto.movie.primary_title,
    year: dto.movie.start_year,
    genres: dto.movie.genres,
    imdbRating: dto.movie.avg_rating,
    avgRating: dto.movie.avg_rating, // alias for backward compatibility
    userRating: dto.user_rating,
    posterUrl: dto.movie.poster_path,
    posterPath: dto.movie.poster_path, // alias for backward compatibility
    watchedAt: dto.watched_at,
    watchedAtLabel: dto.watched_at ? formatLastCheckedDate(dto.watched_at) : null,
    availability: dto.availability,
    isAvailableOnAnyPlatform: availablePlatforms.length > 0,
  };
}

/**
 * Sorts watched movie items by the specified key.
 * Null values are handled appropriately for each sort option.
 */
function sortWatchedMovieItems(
  items: WatchedMovieItemVM[],
  sortKey: WatchedSortKey
): WatchedMovieItemVM[] {
  const sorted = [...items];

  switch (sortKey) {
    case "watched_at_desc":
      return sorted.sort((a, b) => {
        const aDate = a.watchedAt ? new Date(a.watchedAt).getTime() : 0;
        const bDate = b.watchedAt ? new Date(b.watchedAt).getTime() : 0;
        return bDate - aDate; // Newest first
      });

    case "user_rating_desc":
      return sorted.sort((a, b) => {
        const aRating = a.userRating ?? 0;
        const bRating = b.userRating ?? 0;
        if (aRating !== bRating) {
          return bRating - aRating;
        }
        // Secondary sort by IMDb rating if user ratings are equal
        const aImdbRating = a.imdbRating ? parseFloat(a.imdbRating) : 0;
        const bImdbRating = b.imdbRating ? parseFloat(b.imdbRating) : 0;
        return bImdbRating - aImdbRating;
      });

    case "imdb_rating_desc":
      return sorted.sort((a, b) => {
        const aRating = a.imdbRating ? parseFloat(a.imdbRating) : 0;
        const bRating = b.imdbRating ? parseFloat(b.imdbRating) : 0;
        return bRating - aRating;
      });

    default:
      return sorted;
  }
}

/**
 * Processes watched movies data: maps to VM and sorts.
 * Returns processed items and counts for UI.
 */
export function processWatchedData(
  data: UserMovieDto[] | undefined,
  userPlatforms: PlatformDto[],
  sortKey: WatchedSortKey,
  hideUnavailable: boolean,
  totalAvailableCount?: number
) {
  if (!data) {
    return {
      items: [],
      totalCount: 0,
      visibleCount: 0,
    };
  }

  // Map to view models
  const items = data.map((dto) => mapToWatchedMovieItemVM(dto, userPlatforms));

  // Apply sorting
  const sortedItems = sortWatchedMovieItems(items, sortKey);

  // Apply filtering
  const filteredItems = hideUnavailable
    ? sortedItems.filter((item) => item.isAvailableOnAnyPlatform)
    : sortedItems;

  const totalCount =
    typeof totalAvailableCount === "number" && totalAvailableCount > 0
      ? totalAvailableCount
      : items.length;

  return {
    items: filteredItems,
    totalCount,
    visibleCount: filteredItems.length,
  };
}
