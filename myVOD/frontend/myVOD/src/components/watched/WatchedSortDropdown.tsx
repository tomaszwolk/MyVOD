import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { WatchedSortKey } from "@/types/view/watched.types";

type WatchedSortDropdownProps = {
  value: WatchedSortKey;
  onChange: (key: WatchedSortKey) => void;
};

const SORT_OPTIONS: Record<WatchedSortKey, { label: string; description: string }> = {
  watched_at_desc: { label: "Ostatnio obejrzane", description: "Najpierw najnowsze" },
  user_rating_desc: { label: "Twoja ocena", description: "Najwyżej ocenione przez Ciebie" },
  imdb_rating_desc: { label: "Ocena IMDb", description: "Najwyższa ocena IMDb" },
  year_desc: { label: "Rok produkcji (od najnowszych)", description: "Najpierw najnowsze" },
  year_asc: { label: "Rok produkcji (od najstarszych)", description: "Najpierw najstarsze" },
  added_desc: { label: "Data dodania", description: "Najpierw ostatnio dodane" },
  imdb_desc: { label: "Ocena IMDb", description: "Najwyższa ocena IMDb" },
};


export function WatchedSortDropdown({
  value,
  onChange,
}: WatchedSortDropdownProps) {
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
        {(Object.entries(SORT_OPTIONS) as [WatchedSortKey, typeof SORT_OPTIONS[WatchedSortKey]][]).map(
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
