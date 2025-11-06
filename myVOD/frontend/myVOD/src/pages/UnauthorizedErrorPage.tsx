import { useNavigate } from "react-router-dom";
import { ErrorView } from "@/components/ErrorView";
import type { ErrorViewModel } from "@/types/view/error.types";

/**
 * Strona prezentowana, gdy odświeżenie tokena nie powiedzie się lub brak uprawnień.
 * Opis: Strona prezentowana, gdy odświeżenie tokena nie powiedzie się lub brak uprawnień.
 * Główne elementy: ErrorView z wariantem unauthorized, CTA: "Zaloguj ponownie", link do rejestracji.
 * Obsługiwane interakcje: nawigacja do "/login" z returnTo w stanie/URL.
 * Obsługiwana walidacja: brak, CTA aktywne zawsze; nie zdradza przyczyn (np. "refresh expired").
 * Propsy: brak.
 */
export function UnauthorizedErrorPage() {
  const navigate = useNavigate();

  const model: ErrorViewModel = {
    title: "Sesja wygasła",
    description: "Twoja sesja wygasła. Zaloguj się ponownie, aby kontynuować korzystanie z aplikacji.",
    actions: [
      {
        id: 'login',
        label: 'Zaloguj ponownie',
        variant: 'primary',
      },
    ],
  };

  const handleAction = (actionId: string) => {
    switch (actionId) {
      case 'login': {
        // Navigate to login with returnTo parameter
        const currentPath = window.location.pathname;
        navigate(`/auth/login?returnTo=${encodeURIComponent(currentPath)}`);
        break;
      }
      default:
        break;
    }
  };

  return (
    <ErrorView
      variant="unauthorized"
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
