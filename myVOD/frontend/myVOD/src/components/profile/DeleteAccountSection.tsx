import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

/**
 * Props for DeleteAccountSection component.
 */
type DeleteAccountSectionProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deleting: boolean;
  onConfirm: () => void;
};

/**
 * Alert dialog for confirming account deletion (RODO-compliant).
 * Displays warning message and confirmation buttons.
 */
export function DeleteAccountSection({
  open,
  onOpenChange,
  deleting,
  onConfirm,
}: DeleteAccountSectionProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        style={{ backgroundColor: 'var(--search-popover-background)' }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Usuń konto na stałe</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Ta akcja jest <strong>nieodwracalna</strong>. Wszystkie Twoje dane zostaną trwale usunięte zgodnie z RODO:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Twoje konto użytkownika</li>
              <li>Wszystkie Twoje filmy (watchlista i obejrzane)</li>
              <li>Twoje preferencje platform</li>
              <li>Wszystkie powiązane dane</li>
            </ul>
            <p className="text-sm font-medium text-destructive mt-3">
              Tej operacji nie można cofnąć. Czy na pewno chcesz kontynuować?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Anuluj</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Usuwanie...
              </>
            ) : (
              "Tak, usuń konto"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

