import { AlertTriangle, Wifi, WifiOff, Home, RefreshCw, LogIn, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ErrorKind, ErrorViewModel } from "@/types/view/error.types";

interface ErrorViewProps {
  variant: ErrorKind;
  model: ErrorViewModel;
}

/**
 * ErrorIllustration component for displaying appropriate icons based on error type
 */
function ErrorIllustration({ variant }: { variant: ErrorKind }) {
  const iconClassName = "h-16 w-16 text-muted-foreground mx-auto mb-6";

  const getAriaLabel = (variant: ErrorKind): string => {
    switch (variant) {
      case 'not_found':
        return 'Ikona strony nie znaleziono';
      case 'unauthorized':
        return 'Ikona błędu autoryzacji';
      case 'offline':
        return 'Ikona braku połączenia';
      case 'suggestions_error':
        return 'Ikona błędu sugestii';
      default:
        return 'Ikona błędu';
    }
  };

  switch (variant) {
    case 'not_found':
      return <Home className={iconClassName} aria-label={getAriaLabel(variant)} />;
    case 'unauthorized':
      return <LogIn className={iconClassName} aria-label={getAriaLabel(variant)} />;
    case 'offline':
      return <WifiOff className={iconClassName} aria-label={getAriaLabel(variant)} />;
    case 'suggestions_error':
      return <RefreshCw className={iconClassName} aria-label={getAriaLabel(variant)} />;
    default:
      return <AlertTriangle className={iconClassName} aria-label={getAriaLabel(variant)} />;
  }
}

/**
 * ErrorActions component for rendering action buttons
 */
function ErrorActions({ actions }: { actions: ErrorViewModel['actions'] }) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
      {actions.map((action) => (
        <Button
          key={action.id}
          variant={action.variant || 'default'}
          onClick={action.onClick}
          className="min-w-[140px]"
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}

/**
 * Bazowy, dostępny komponent do prezentacji błędu/komunikatu i CTA.
 * Opis: Bazowy, dostępny (ARIA), bezpieczny komponent do prezentacji błędu/komunikatu i CTA.
 * Główne elementy: ilustracja/ikona, tytuł, opis, lista akcji (przyciski), opcjonalny link powrotu.
 * Obsługiwane interakcje: kliknięcia CTA (onPrimary, onSecondary, onLink).
 * Obsługiwana walidacja: brak – wejście tylko przez propsy; brak ujawniania szczegółów systemu.
 */
export function ErrorView({ variant, model }: ErrorViewProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center pb-4">
          <ErrorIllustration variant={variant} />
          <CardTitle className="text-2xl font-bold text-foreground">
            {model.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <CardDescription className="text-base text-muted-foreground mb-6 leading-relaxed">
            {model.description}
          </CardDescription>
          <ErrorActions actions={model.actions} />
        </CardContent>
      </Card>
    </div>
  );
}
