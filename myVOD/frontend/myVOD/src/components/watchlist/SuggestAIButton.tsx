import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkles } from "lucide-react";

/**
 * Props for SuggestAIButton component.
 */
type SuggestAIButtonProps = {
  onClick: () => void;
  disabled: boolean;
  nextAvailableAt?: Date | string | null;
};

/**
 * Button for requesting AI-powered movie suggestions.
 * Includes tooltip explaining the feature and disabled state handling.
 * Shows countdown in tooltip when rate limited.
 */
export function SuggestAIButton({ onClick, disabled, nextAvailableAt }: SuggestAIButtonProps) {
  const getTooltipText = () => {
    if (disabled && nextAvailableAt) {
      const target = typeof nextAvailableAt === 'string' ? new Date(nextAvailableAt) : nextAvailableAt;
      if (!isNaN(target.getTime())) {
        const now = Date.now();
        const diff = target.getTime() - now;
        if (diff > 0) {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          return `Możesz otrzymać nowe sugestie za ${hours}h ${minutes}m`;
        }
      }
      return "Limit sugestii AI został osiągnięty. Spróbuj ponownie później.";
    }
    if (disabled) {
      return "Limit sugestii AI został osiągnięty. Spróbuj ponownie później.";
    }
    return "Zapytaj AI o spersonalizowane sugestie filmów na podstawie Twojej listy";
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onClick}
            disabled={disabled}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Zasugeruj filmy
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
