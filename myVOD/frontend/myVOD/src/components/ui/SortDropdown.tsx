import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SortOption } from "@/types/view/watchlist.types";

/**
 * Props for SortDropdown component.
 */
type SortDropdownProps = {
  value: SortOption;
  onChange: (option: SortOption) => void;
};

/**
 * Sort options with their labels and descriptions.
 */
const SORT_OPTIONS: Record<SortOption, { label: string; description: string }> = {
  added_desc: { label: "Najnowsze", description: "Najpierw ostatnio dodane" },
  imdb_desc: { label: "Najwyżej oceniane", description: "Najwyższa ocena IMDb" },
  year_desc: { label: "Najnowsze filmy", description: "Najpierw najnowsze" },
  year_asc: { label: "Najstarsze filmy", description: "Najpierw najstarsze" },
};

/**
 * Dropdown for sorting watchlist items.
 * Provides predefined sort options with descriptions.
 */
export function SortDropdown({ value, onChange }: SortDropdownProps) {
  const currentOption = SORT_OPTIONS[value];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="justify-between min-w-[140px]">
          {currentOption.label}
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[200px]"
        style={{
          backgroundColor: "var(--search-popover-background)",
        }}
      >
        {(Object.entries(SORT_OPTIONS) as [SortOption, typeof SORT_OPTIONS[SortOption]][]).map(
          ([key, option]) => (
            <DropdownMenuItem
              key={key}
              onClick={() => onChange(key)}
              className={`${value === key ? "bg-accent" : ""} cursor-pointer`}
            >
              <div>
                <div className="font-medium">{option.label}</div>
                <div className="text-xs text-muted-foreground">{option.description}</div>
              </div>
            </DropdownMenuItem>
          )
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
