import { Button } from "@/components/ui/button";

/**
 * Props for DangerZoneCard component.
 */
type DangerZoneCardProps = {
  onRequestDelete: () => void;
};

/**
 * Card component for dangerous actions section.
 * Contains account deletion option.
 */
export function DangerZoneCard({ onRequestDelete }: DangerZoneCardProps) {
  return (
    <div className="bg-card border border-destructive/50 rounded-lg shadow-sm">
      <div className="p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2 text-destructive">Strefa zagrożenia</h2>
          <p className="text-sm text-muted-foreground">
            Nieodwracalne i destrukcyjne akcje. Użyj z ostrożnością.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-1">Usuń konto</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Trwale usuń swoje konto i wszystkie powiązane dane. Ta akcja jest zgodna z RODO i nie może zostać cofnięta.
            </p>
            <Button
              variant="destructive"
              onClick={onRequestDelete}
            >
              Usuń konto
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

