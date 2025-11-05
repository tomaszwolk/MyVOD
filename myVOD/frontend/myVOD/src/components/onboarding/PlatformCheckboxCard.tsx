import { forwardRef } from "react";
import { getPlatformIcon } from "./platformIcons.tsx";

/**
 * Platform checkbox card component.
 * Displays platform with logo, name, and checkbox.
 * Clicking anywhere on the card toggles the checkbox.
 */
export const PlatformCheckboxCard = forwardRef<
  HTMLInputElement,
  {
    id: number;
    name: string;
    slug: string;
    checked: boolean;
    onChange: (id: number) => void;
    disabled?: boolean;
  }
>(({ id, name, slug, checked, onChange, disabled = false }, ref) => {
  const handleClick = () => {
    if (!disabled) {
      onChange(id);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if ((event.key === " " || event.key === "Enter") && !disabled) {
      event.preventDefault();
      onChange(id);
    }
  };

  return (
    <div
      className={`
        relative p-4 border rounded-lg cursor-pointer transition-all
        ${checked ? "border-primary bg-primary/5" : "border-border"}
        ${disabled ? "opacity-50 cursor-not-allowed" : "hover:border-primary/50"}
        focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2
      `}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      role="checkbox"
      aria-checked={checked}
      aria-disabled={disabled}
      data-testid={`platform-checkbox-${slug}`}
    >
      <div className="flex items-center space-x-3">
        {/* Platform icon/logo */}
        <div className="flex-shrink-0 w-8 h-8 bg-muted rounded flex items-center justify-center">
          {(() => {
            const IconComponent = getPlatformIcon(slug);
            if (IconComponent) {
              return <IconComponent className="w-6 h-6" />;
            }
            // Fallback for missing icons
            return (
              <div className="w-6 h-6 bg-current opacity-50 rounded flex items-center justify-center text-xs font-bold">
                {name.charAt(0).toUpperCase()}
              </div>
            );
          })()}
        </div>

        {/* Platform name */}
        <span className="font-medium text-sm flex-grow">{name}</span>

        {/* Hidden checkbox for accessibility */}
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          onChange={() => {}} // Handled by parent click
          disabled={disabled}
          className="sr-only"
          aria-hidden="true"
        />

        {/* Visual checkbox indicator */}
        <div
          className={`
            w-5 h-5 border-2 rounded flex items-center justify-center flex-shrink-0
            ${checked ? "bg-primary border-primary" : "border-muted-foreground"}
          `}
        >
          {checked && (
            <svg
              className="w-3 h-3 text-primary-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
});

PlatformCheckboxCard.displayName = "PlatformCheckboxCard";
