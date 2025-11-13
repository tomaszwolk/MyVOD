import type { WatchedSortKey } from "@/types/view/watched.types";
import { SortDropdown } from "@/components/ui/SortDropdown";

type WatchedSortDropdownProps = {
  value: WatchedSortKey;
  onChange: (key: WatchedSortKey) => void;
};

/**
 * Reuse watchlist sort dropdown for watched view to keep options and styling unified.
 */
export function WatchedSortDropdown({
  value,
  onChange,
}: WatchedSortDropdownProps) {
  return <SortDropdown value={value} onChange={onChange} />;
}
