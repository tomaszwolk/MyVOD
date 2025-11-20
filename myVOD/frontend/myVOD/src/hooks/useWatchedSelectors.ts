import { useMemo } from "react";
import type { UserMovieDto, PlatformDto } from "@/types/api.types";
import type { WatchedSortKey } from "@/types/view/watched.types";
import { processWatchedData } from "@/lib/watched-selectors";

/**
 * Props for useWatchedSelectors hook.
 */
type UseWatchedSelectorsProps = {
  data: UserMovieDto[] | undefined;
  userPlatforms: PlatformDto[];
  sortKey: WatchedSortKey;
  hideUnavailable: boolean;
  filters: { showOnlyAvailable: boolean };
  totalAvailableCount?: number;
};

/**
 * Custom hook for processing watched movies data with sorting and filtering.
 * Memoizes the results to avoid unnecessary recalculations.
 *
 * @param props - Processing parameters
 * @returns Processed watched movies data with counts
 */
export function useWatchedSelectors({
  data,
  userPlatforms,
  sortKey,
  hideUnavailable,
  filters,
  totalAvailableCount,
}: UseWatchedSelectorsProps) {
  return useMemo(() => {
    return processWatchedData(
      data,
      userPlatforms,
      sortKey,
      hideUnavailable,
      filters,
      totalAvailableCount
    );
  }, [data, userPlatforms, sortKey, hideUnavailable, filters, totalAvailableCount]);
}
