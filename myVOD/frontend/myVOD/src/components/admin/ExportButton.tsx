import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportTopMoviesCSV } from "@/lib/api/admin";
import { toast } from "sonner";
import type { TopMoviesQuery } from "@/types/view/admin.types";

type ExportButtonProps = {
  query: TopMoviesQuery;
  disabled?: boolean;
};

/**
 * ExportButton component for exporting top movies as CSV.
 */
export function ExportButton({ query, disabled }: ExportButtonProps) {
  const handleExport = async () => {
    try {
      await exportTopMoviesCSV(query);
      toast.success("Eksport CSV rozpoczęty");
    } catch (error) {
      toast.error("Nie udało się wyeksportować danych");
      console.error("Export error:", error);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      disabled={disabled}
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      Eksportuj CSV
    </Button>
  );
}

