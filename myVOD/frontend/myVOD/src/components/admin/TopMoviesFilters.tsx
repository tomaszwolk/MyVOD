import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import type { TopMoviesQuery } from "@/types/view/admin.types";

type TopMoviesFiltersProps = {
  value: TopMoviesQuery;
  onChange: (query: TopMoviesQuery) => void;
};

/**
 * TopMoviesFilters component.
 * Provides controls for selecting ranking type (watchlist/watched) and time range (7d/30d/all).
 */
export function TopMoviesFilters({ value, onChange }: TopMoviesFiltersProps) {
  const typeLabel = value.type === "watchlist" ? "Watchlista" : "Obejrzane";
  const rangeLabel =
    value.range === "7d" ? "7 dni" : value.range === "30d" ? "30 dni" : "Cały czas";

  const handleTypeChange = (type: TopMoviesQuery["type"]) => {
    onChange({ ...value, type });
  };

  const handleRangeChange = (range: TopMoviesQuery["range"]) => {
    onChange({ ...value, range });
  };

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Type selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="justify-between min-w-[140px]">
            Typ: {typeLabel}
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => handleTypeChange("watchlist")}>
            Watchlista
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleTypeChange("watched")}>
            Obejrzane
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Range segmented control (using buttons as segmented control) */}
      <div className="flex rounded-md border border-input bg-background">
        <Button
          variant={value.range === "7d" ? "default" : "ghost"}
          size="sm"
          onClick={() => handleRangeChange("7d")}
          className="rounded-r-none border-r border-input"
        >
          7 dni
        </Button>
        <Button
          variant={value.range === "30d" ? "default" : "ghost"}
          size="sm"
          onClick={() => handleRangeChange("30d")}
          className="rounded-none border-r border-input"
        >
          30 dni
        </Button>
        <Button
          variant={value.range === "all" ? "default" : "ghost"}
          size="sm"
          onClick={() => handleRangeChange("all")}
          className="rounded-l-none"
        >
          Cały czas
        </Button>
      </div>
    </div>
  );
}

