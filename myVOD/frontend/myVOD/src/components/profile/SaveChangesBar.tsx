import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

/**
 * Props for SaveChangesBar component.
 */
type SaveChangesBarProps = {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onReset: () => void;
};

/**
 * Action bar for saving platform preference changes.
 * Shows save and cancel buttons with loading state.
 */
export function SaveChangesBar({
  dirty,
  saving,
  onSave,
  onReset,
}: SaveChangesBarProps) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg border-t">
      <div className="text-sm text-muted-foreground">
        {dirty ? "Masz niezapisane zmiany" : "Wszystkie zmiany zostały zapisane"}
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={onReset}
          disabled={!dirty || saving}
          data-testid="reset-platforms"
        >
          Anuluj
        </Button>
        <Button
          onClick={onSave}
          disabled={!dirty || saving}
          data-testid="save-platforms"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Zapisywanie...
            </>
          ) : (
            "Zapisz zmiany"
          )}
        </Button>
      </div>
    </div>
  );
}

