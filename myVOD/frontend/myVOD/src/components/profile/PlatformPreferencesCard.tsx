import { PlatformCheckboxGroup } from "./PlatformCheckboxGroup";
import { SaveChangesBar } from "./SaveChangesBar";
import type { PlatformDto } from "@/types/api.types";

/**
 * Props for PlatformPreferencesCard component.
 */
type PlatformPreferencesCardProps = {
  platforms: PlatformDto[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onReset: () => void;
};

/**
 * Card component for platform preferences section.
 * Contains checkbox group and save action bar.
 */
export function PlatformPreferencesCard({
  platforms,
  selectedIds,
  onToggle,
  dirty,
  saving,
  onSave,
  onReset,
}: PlatformPreferencesCardProps) {
  return (
    <div className="bg-card border rounded-lg shadow-sm" data-testid="platform-preferences-card">
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Moje platformy VOD</h2>
          <p className="text-sm text-muted-foreground">
            Wybierz platformy, które posiadasz. To pozwoli nam pokazać dostępność filmów na Twoich platformach.
          </p>
          <span data-testid="platforms-count" className="sr-only">
            {platforms.length}
          </span>
          <span data-testid="selected-count" className="sr-only">
            {selectedIds.length}
          </span>
        </div>

        <PlatformCheckboxGroup
          platforms={platforms}
          selectedIds={selectedIds}
          onToggle={onToggle}
          disabled={saving}
        />
      </div>

      <SaveChangesBar
        dirty={dirty}
        saving={saving}
        onSave={onSave}
        onReset={onReset}
      />
    </div>
  );
}

