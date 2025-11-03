import { useState, useEffect } from "react";
import { ErrorView } from "@/components/ErrorView";
import { useQueryClient } from "@tanstack/react-query";
import type { ErrorViewModel } from "@/types/view/error.types";

/**
 * Strona informująca o braku połączenia.
 * Opis: Strona informująca o braku połączenia.
 * Główne elementy: ErrorView z wariantem offline, CTA: "Spróbuj ponownie" (odświeża dane/stronę), "Wróć do strony głównej".
 * Obsługiwane interakcje: sprawdzenie navigator.onLine, invalidateQueries() lub window.location.reload().
 * Obsługiwana walidacja: CTA "Spróbuj ponownie" aktywny tylko, gdy odzyskano online (opcjonalnie).
 * Propsy: brak.
 */
export function OfflineErrorPage() {
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const model: ErrorViewModel = {
    title: "Brak połączenia z internetem",
    description: "Wygląda na to, że nie masz połączenia z internetem. Sprawdź swoje połączenie i spróbuj ponownie.",
    actions: [
      {
        id: 'retry',
        label: 'Spróbuj ponownie',
        variant: 'primary',
      },
      {
        id: 'home',
        label: 'Wróć do strony głównej',
        variant: 'secondary',
      },
    ],
  };

  const handleAction = (actionId: string) => {
    switch (actionId) {
      case 'retry':
        if (isOnline) {
          // Invalidate all queries and reload the page
          queryClient.invalidateQueries();
          window.location.reload();
        }
        break;
      case 'home':
        // Navigate to home (this will work even offline for cached routes)
        window.location.href = '/';
        break;
      default:
        break;
    }
  };

  return (
    <ErrorView
      variant="offline"
      model={{
        ...model,
        actions: model.actions.map(action => ({
          ...action,
          onClick: () => handleAction(action.id),
        })),
      }}
    />
  );
}
