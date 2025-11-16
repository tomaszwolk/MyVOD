import type { UserMovieDto, PlatformDto } from "@/types/api.types";
import type { WatchlistItemVM, SortOption, FiltersState } from "@/types/view/watchlist.types";

/**
 * Maps UserMovieDto to WatchlistItemVM with availability summary.
 */
function mapToWatchlistItemVM(dto: UserMovieDto, userPlatforms: PlatformDto[]): WatchlistItemVM {
  // Calculate availability summary
  const userPlatformIds = new Set(userPlatforms.map(p => p.id));
  const availablePlatforms = dto.availability.filter(a =>
    a.is_available === true && userPlatformIds.has(a.platform_id)
  );

  const availabilitySummary = {
    isAvailableOnAny: availablePlatforms.length > 0,
    availablePlatformIds: availablePlatforms.map(a => a.platform_id),
  };

  return {
    id: dto.id,
    movie: dto.movie,
    availability: dto.availability,
    watchlisted_at: dto.watchlisted_at,
    watched_at: dto.watched_at,
    availabilitySummary,
  };
}

/**
 * Sorts watchlist items by the specified option.
 * Null values are handled appropriately for each sort option.
 */
function sortWatchlistItems(items: WatchlistItemVM[], sortOption: SortOption): WatchlistItemVM[] {
  const sorted = [...items];

  switch (sortOption) {
    case 'added_desc':
      return sorted.sort((a, b) => {
        const aDate = a.watchlisted_at ? new Date(a.watchlisted_at).getTime() : 0;
        const bDate = b.watchlisted_at ? new Date(b.watchlisted_at).getTime() : 0;
        return bDate - aDate; // Newest first
      });

    case 'imdb_desc':
      return sorted.sort((a, b) => {
        const aRating = a.movie.avg_rating ? parseFloat(a.movie.avg_rating) : 0;
        const bRating = b.movie.avg_rating ? parseFloat(b.movie.avg_rating) : 0;
        return bRating - aRating; // Highest rating first
      });

    case 'year_desc':
      return sorted.sort((a, b) => {
        const aYear = a.movie.start_year || 0;
        const bYear = b.movie.start_year || 0;
        return bYear - aYear; // Newest year first
      });

    case 'year_asc':
      return sorted.sort((a, b) => {
        const aYear = a.movie.start_year || 0;
        const bYear = b.movie.start_year || 0;
        return aYear - bYear; // Oldest year first
      });

    default:
      return sorted;
  }
}

/**
 * Filters watchlist items based on the provided filters.
 */
function filterWatchlistItems(items: WatchlistItemVM[], filters: FiltersState): WatchlistItemVM[] {
  return items.filter(item => {
    if (filters.onlyAvailable && !item.availabilitySummary.isAvailableOnAny) {
      return false;
    }

    return true;
  });
}

/**
 * Processes watchlist data: maps to VM, sorts, and filters.
 * Returns processed items and counts for UI.
 */
export function processWatchlistData(
  data: UserMovieDto[] | undefined,
  userPlatforms: PlatformDto[],
  sortOption: SortOption,
  filters: FiltersState,
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
  const items = data.map(dto => mapToWatchlistItemVM(dto, userPlatforms));

  // Apply filters
  const filteredItems = filterWatchlistItems(items, filters);

  // Apply sorting
  const sortedItems = sortWatchlistItems(filteredItems, sortOption);

  const totalCount =
    typeof totalAvailableCount === "number" && totalAvailableCount > 0
      ? totalAvailableCount
      : items.length;

  return {
    items: sortedItems,
    totalCount,
    visibleCount: sortedItems.length,
  };
}
