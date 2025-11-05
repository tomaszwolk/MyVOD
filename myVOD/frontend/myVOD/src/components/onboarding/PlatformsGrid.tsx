import { PlatformCheckboxCard } from "./PlatformCheckboxCard";

export type PlatformViewModel = {
  id: number;
  slug: string;
  name: string;
  selected: boolean;
};

/**
 * Grid of platform checkbox cards with accessibility features.
 */
export function PlatformsGrid({
  platforms,
  onToggle,
  isDisabled = false
}: {
  platforms: PlatformViewModel[];
  onToggle: (id: number) => void;
  isDisabled?: boolean;
}) {
  const selectedCount = platforms.filter(p => p.selected).length;

  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-medium text-muted-foreground mb-4">
        Select your streaming platforms ({selectedCount} selected)
      </legend>

      <div data-testid="platform-selection-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {platforms.map((platform) => (
          <PlatformCheckboxCard
            key={platform.id}
            id={platform.id}
            name={platform.name}
            slug={platform.slug}
            checked={platform.selected}
            onChange={onToggle}
            disabled={isDisabled}
          />
        ))}
      </div>
    </fieldset>
  );
}
