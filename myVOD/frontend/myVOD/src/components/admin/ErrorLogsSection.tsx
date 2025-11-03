import { useState, useCallback } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorLogsFilters } from "./ErrorLogsFilters";
import { ErrorLogsTable } from "./ErrorLogsTable";
import { useErrorLogs } from "@/hooks/useErrorLogs";
import { exportErrorLogsCSV } from "@/lib/api/admin";
import { toast } from "sonner";
import type { ErrorLogsQuery } from "@/types/view/admin.types";

/**
 * ErrorLogsSection component.
 * Container for error logs with filters, table, pagination, and export functionality.
 */
export function ErrorLogsSection() {
  const [query, setQuery] = useState<ErrorLogsQuery>({
    page: 1,
    page_size: 50,
    sort: "-occurred_at",
  });

  const { data, isLoading, error } = useErrorLogs(query);

  const handleReset = useCallback(() => {
    setQuery({
      page: 1,
      page_size: 50,
      sort: "-occurred_at",
    });
  }, []);

  const handleExport = useCallback(() => {
    try {
      exportErrorLogsCSV(query);
      toast.success("Eksport CSV rozpoczęty");
    } catch (error) {
      toast.error("Nie udało się wyeksportować danych");
      console.error("Export error:", error);
    }
  }, [query]);

  const handleSortChange = useCallback(
    (sort: ErrorLogsQuery["sort"]) => {
      setQuery({ ...query, sort, page: 1 });
    },
    [query]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      setQuery({ ...query, page });
    },
    [query]
  );

  const handleUserIdClick = useCallback(
    (userId: string) => {
      setQuery({ ...query, user_id: userId, page: 1 });
    },
    [query]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-xl font-semibold">Logi błędów integracji</h2>
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={isLoading || !!error}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Eksportuj CSV
        </Button>
      </div>

      <ErrorLogsFilters value={query} onChange={setQuery} onReset={handleReset} />

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>Ładowanie...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8 text-destructive">
          <p>Nie udało się załadować danych</p>
        </div>
      ) : data ? (
        <div className="bg-card rounded-lg border p-4">
          <ErrorLogsTable
            data={data}
            sort={query.sort || "-occurred_at"}
            onSortChange={handleSortChange}
            onPageChange={handlePageChange}
            onUserIdClick={handleUserIdClick}
          />
        </div>
      ) : null}
    </div>
  );
}

