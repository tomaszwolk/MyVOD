import { AlertCircle, Sparkles, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EmptyStateVariant } from "@/types/view/suggestions.types";

/**
 * Props for AISuggestionsEmptyState component.
 */
type AISuggestionsEmptyStateProps = {
  variant: EmptyStateVariant;
  message?: string;
  onRetry?: () => void;
};

/**
 * Empty state component for AI suggestions view.
 * Displays different messages based on error variant.
 */
export function AISuggestionsEmptyState({
  variant,
  message,
  onRetry,
}: AISuggestionsEmptyStateProps) {
  const getContent = () => {
    switch (variant) {
      case 'no-data':
        return {
          icon: Info,
          title: "Brak danych do wygenerowania sugestii",
          description: "Dodaj filmy do watchlisty lub oznacz jako obejrzane, aby otrzymać spersonalizowane sugestie.",
          showRetry: false,
        };
      case 'rate-limited':
        return {
          icon: AlertCircle,
          title: "Dzisiejszy limit wykorzystany",
          description: "Możesz otrzymać nowe sugestie jutro.",
          showRetry: false,
        };
      case 'no-suggestions':
        return {
          icon: Sparkles,
          title: "Nie znaleziono sugestii",
          description: "Spróbuj później lub dodaj więcej filmów do swojej listy.",
          showRetry: true,
        };
      case 'error':
        return {
          icon: AlertCircle,
          title: "Wystąpił błąd",
          description: message || "Nie udało się pobrać sugestii. Spróbuj ponownie.",
          showRetry: true,
        };
      default:
        return {
          icon: Info,
          title: "Brak sugestii",
          description: "Spróbuj później.",
          showRetry: false,
        };
    }
  };

  const content = getContent();
  const Icon = content.icon;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4" role="region" aria-live="polite">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4" aria-hidden="true">
          <Icon className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">
          {content.title}
        </h3>
        <p className="text-muted-foreground max-w-sm mx-auto">
          {content.description}
        </p>
      </div>

      {content.showRetry && onRetry && (
        <Button 
          onClick={onRetry} 
          variant="outline"
          aria-label="Spróbuj ponownie pobrać sugestie"
        >
          Spróbuj ponownie
        </Button>
      )}
    </div>
  );
}

