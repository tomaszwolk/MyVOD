import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Wifi, WifiOff } from "lucide-react";
import type { ReactNode } from "react";

interface OfflineGuardProps {
  children: ReactNode;
  mode?: 'banner' | 'redirect';
  showRetryButton?: boolean;
}

/**
 * HOC/komponent otaczający sekcje wymagające online. Reaguje na online/offline.
 * Opis: HOC/komponent otaczający sekcje wymagające online. Reaguje na online/offline.
 * Główne elementy: stan isOffline, render warunkowy dzieci vs. redirect/baner.
 * Obsługiwane interakcje: nasłuch zdarzeń, opcjonalny redirect do /error/offline.
 * Obsługiwana walidacja: brak.
 * Propsy: mode?: 'banner' | 'redirect' (domyślnie 'banner').
 */
export function OfflineGuard({
  children,
  mode = 'banner',
  showRetryButton = true
}: OfflineGuardProps) {
  const navigate = useNavigate();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Optional: Show success message or refresh data
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial state
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle redirect mode with useEffect
  useEffect(() => {
    if (isOffline && mode === 'redirect') {
      navigate('/error/offline', { replace: true });
    }
  }, [isOffline, mode, navigate]);

  // If online, render children normally
  if (!isOffline) {
    return <>{children}</>;
  }

  // If offline and mode is 'redirect', don't render anything (navigation handled above)
  if (mode === 'redirect') {
    return null;
  }

  // Default mode: 'banner' - show offline banner
  return (
    <div className="space-y-4">
      <Alert variant="destructive" className="border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-200">
        <WifiOff className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            Brak połączenia z internetem. Niektóre funkcje mogą być niedostępne.
          </span>
          {showRetryButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="ml-4 border-orange-300 text-orange-800 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-200 dark:hover:bg-orange-900"
            >
              <Wifi className="h-4 w-4 mr-2" />
              Spróbuj ponownie
            </Button>
          )}
        </AlertDescription>
      </Alert>
      {children}
    </div>
  );
}
