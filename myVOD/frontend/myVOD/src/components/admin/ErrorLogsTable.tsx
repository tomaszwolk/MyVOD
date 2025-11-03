import { ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PaginatedErrorLogsDto, ErrorLogsQuery } from "@/types/view/admin.types";

type ErrorLogsTableProps = {
  data: PaginatedErrorLogsDto;
  sort: ErrorLogsQuery["sort"];
  onSortChange: (sort: ErrorLogsQuery["sort"]) => void;
  onPageChange: (page: number) => void;
  onUserIdClick?: (userId: string) => void;
};

/**
 * ErrorLogsTable component.
 * Displays error logs in a table with pagination and sorting.
 */
export function ErrorLogsTable({
  data,
  sort,
  onSortChange,
  onPageChange,
  onUserIdClick,
}: ErrorLogsTableProps) {
  const handleSortToggle = () => {
    const newSort = sort === "occurred_at" ? "-occurred_at" : "occurred_at";
    onSortChange(newSort);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("pl-PL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getApiTypeLabel = (apiType: string) => {
    const labels: Record<string, string> = {
      watchmode: "Watchmode",
      tmdb: "TMDB",
      gemini: "Gemini",
    };
    return labels[apiType] || apiType;
  };

  if (!data.items || data.items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Brak danych do wyświetlenia</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4 font-semibold text-sm">
                <button
                  onClick={handleSortToggle}
                  className="flex items-center gap-2 hover:text-foreground transition-colors"
                >
                  Data
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </th>
              <th className="text-left py-3 px-4 font-semibold text-sm">Typ API</th>
              <th className="text-left py-3 px-4 font-semibold text-sm">Komunikat</th>
              <th className="text-left py-3 px-4 font-semibold text-sm">ID użytkownika</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.id} className="border-b hover:bg-muted/50 transition-colors">
                <td className="py-3 px-4 text-sm">{formatDate(item.occurred_at)}</td>
                <td className="py-3 px-4 text-sm">
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-xs font-medium">
                    {getApiTypeLabel(item.api_type)}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm max-w-md truncate" title={item.error_message}>
                  {item.error_message}
                </td>
                <td className="py-3 px-4 text-sm">
                  {item.user_id ? (
                    <button
                      onClick={() => onUserIdClick?.(item.user_id!)}
                      className="text-primary hover:underline"
                    >
                      {item.user_id}
                    </button>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Strona {data.page} z {data.total_pages} ({data.total} wpisów)
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(data.page - 1)}
              disabled={data.page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Poprzednia
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(data.page + 1)}
              disabled={data.page >= data.total_pages}
            >
              Następna
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

