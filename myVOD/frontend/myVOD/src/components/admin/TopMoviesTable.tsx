import type { TopMoviesDto } from "@/types/view/admin.types";

type TopMoviesTableProps = {
  data: TopMoviesDto;
};

/**
 * TopMoviesTable component.
 * Displays top 10 movies in a table format with title, year, and count.
 */
export function TopMoviesTable({ data }: TopMoviesTableProps) {
  if (!data.items || data.items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Brak danych do wyświetlenia</p>
      </div>
    );
  }

  const countLabel = data.type === "watchlist" ? "Liczba dodań" : "Liczba obejrzeń";

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-4 font-semibold text-sm">Pozycja</th>
            <th className="text-left py-3 px-4 font-semibold text-sm">Tytuł</th>
            <th className="text-left py-3 px-4 font-semibold text-sm">Rok</th>
            <th className="text-right py-3 px-4 font-semibold text-sm">{countLabel}</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, index) => (
            <tr key={item.tconst} className="border-b hover:bg-muted/50 transition-colors">
              <td className="py-3 px-4 text-sm font-medium">{index + 1}</td>
              <td className="py-3 px-4 text-sm">{item.primary_title}</td>
              <td className="py-3 px-4 text-sm text-muted-foreground">
                {item.start_year || "—"}
              </td>
              <td className="py-3 px-4 text-sm text-right font-medium">{item.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

