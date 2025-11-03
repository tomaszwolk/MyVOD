import { useState } from "react";
import { TopMoviesFilters } from "./TopMoviesFilters";
import { TopMoviesTable } from "./TopMoviesTable";
import { ExportButton } from "./ExportButton";
import { useTopMovies } from "@/hooks/useTopMovies";
import type { TopMoviesQuery } from "@/types/view/admin.types";

/**
 * TopMoviesSection component.
 * Container for top movies ranking with filters, table, and export functionality.
 */
export function TopMoviesSection() {
  const [query, setQuery] = useState<TopMoviesQuery>({
    type: "watchlist",
    range: "7d",
  });

  const { data, isLoading, error } = useTopMovies(query);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-xl font-semibold">Top 10 filmów</h2>
        <div className="flex flex-wrap gap-3">
          <TopMoviesFilters value={query} onChange={setQuery} />
          <ExportButton query={query} disabled={isLoading || !!error} />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>Ładowanie...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8 text-destructive">
          <p>Nie udało się załadować danych</p>
        </div>
      ) : data ? (
        <div className="bg-card rounded-lg border">
          <TopMoviesTable data={data} />
        </div>
      ) : null}
    </div>
  );
}

