import { useMemo } from "react";
import type { UserMovieDto, PlatformDto } from "@/types/api.types";
import type { SortOption, FiltersState } from "@/types/view/watchlist.types";
import { processWatchlistData } from "@/lib/watchlist-selectors";

/**
 * Props for useWatchlistSelectors hook.
 */
type UseWatchlistSelectorsProps = {
  data: UserMovieDto[] | undefined;
  userPlatforms: PlatformDto[];
  sortOption: SortOption;
  filters: FiltersState;
  totalAvailableCount?: number;
};

/**
 * Custom hook for processing watchlist data with sorting and filtering.
 * Memoizes the results to avoid unnecessary recalculations.
 *
 * @param props - Processing parameters
 * @returns Processed watchlist data with counts
 */
export function useWatchlistSelectors({
  data,
  userPlatforms,
  sortOption,
  filters,
  totalAvailableCount,
}: UseWatchlistSelectorsProps) {
  return useMemo(() => {
    return processWatchlistData(
      data,
      userPlatforms,
      sortOption,
      filters,
      totalAvailableCount
    );
  }, [data, userPlatforms, sortOption, filters, totalAvailableCount]);
}
