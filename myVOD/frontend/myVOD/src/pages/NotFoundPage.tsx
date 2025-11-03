import { useNavigate } from "react-router-dom";
import { ErrorView } from "@/components/ErrorView";
import type { ErrorViewModel } from "@/types/view/error.types";

/**
 * Strona 404 dla nieistniejących tras.
 * Opis: Strona 404 dla nieistniejących tras.
 * Główne elementy: ErrorView z wariantem not_found, CTA: "Wróć do strony głównej", "Przejdź do watchlisty".
 * Obsługiwane interakcje: nawigacja do "/" lub np. "/watchlist".
 * Obsługiwana walidacja: zawsze bezpieczne treści.
 * Propsy: brak (statyczny wariant + lokalne akcje nawigacji).
 */
export function NotFoundPage() {
  const navigate = useNavigate();

  const model: ErrorViewModel = {
    title: "Strona nie została znaleziona",
    description: "Przepraszamy, ale strona, której szukasz, nie istnieje. Sprawdź adres URL lub wróć do aplikacji.",
    actions: [
      {
        id: 'home',
        label: 'Wróć do strony głównej',
        variant: 'primary',
      },
      {
        id: 'watchlist',
        label: 'Przejdź do watchlisty',
        variant: 'secondary',
      },
    ],
  };

  const handleAction = (actionId: string) => {
    switch (actionId) {
      case 'home':
        navigate('/');
        break;
      case 'watchlist':
        navigate('/app/watchlist');
        break;
      default:
        break;
    }
  };

  return (
    <ErrorView
      variant="not_found"
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
