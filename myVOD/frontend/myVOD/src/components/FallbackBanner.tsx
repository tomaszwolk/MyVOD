import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Info, AlertTriangle, X } from "lucide-react";
import { formatLastCheckedDate } from "@/utils/date-utils";
import type { FallbackBannerModel } from "@/types/view/error.types";

interface FallbackBannerProps extends FallbackBannerModel {
  onRetry?: () => void;
  onDismiss?: () => void;
  showDismissButton?: boolean;
}

/**
 * Baner informacyjny nad listą/sekcją przy błędach zewnętrznych API (np. Watchmode) – aplikacja działa dalej.
 * Opis: Baner informacyjny nad listą/sekcją przy błędach zewnętrznych API (np. Watchmode) – aplikacja działa dalej.
 * Główne elementy: ikona statusu, treść, meta (np. "Stan z: [data]"), opcjonalny przycisk "Szczegóły"/"Ukryj".
 * Obsługiwane interakcje: zamknięcie, link do profilu (jeśli dotyczy), ewentualny Retry.
 * Obsługiwana walidacja: wymaga poprawnego formatu daty; brak wrażliwych szczegółów.
 * Typy: AvailabilityMeta (sekcja 5).
 * Propsy: message: string, meta?: { lastCheckedAt?: string }, onRetry?: () => void, variant?: 'info' | 'warning' (domyślnie 'info').
 */
export function FallbackBanner({
  message,
  meta,
  variant = 'info',
  onRetry,
  onDismiss,
  showDismissButton = false
}: FallbackBannerProps) {
  const icon = variant === 'warning' ? AlertTriangle : Info;
  const alertVariant = variant === 'warning' ? 'destructive' : 'default';

  const formattedDate = meta?.lastCheckedAt ? formatLastCheckedDate(meta.lastCheckedAt) : null;

  return (
    <Alert variant={alertVariant} className="mb-4">
      {React.createElement(icon, { className: "h-4 w-4" })}
      <AlertDescription className="flex items-center justify-between">
        <div className="flex-1">
          <span>{message}</span>
          {formattedDate && (
            <span className="ml-2 text-sm text-muted-foreground">
              (Stan z: {formattedDate})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 ml-4">
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
            >
              Odśwież
            </Button>
          )}
          {showDismissButton && onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
