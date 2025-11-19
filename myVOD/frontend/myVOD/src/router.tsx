import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";
import { WatchlistPage } from "@/pages/WatchlistPage";
import { WatchedPage } from "@/pages/WatchedPage";
import { OnVODPage } from "@/pages/OnVODPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { AdminDashboardPage } from "@/pages/AdminDashboardPage";
import {
  OnboardingPlatformsPage,
  OnboardingFirstMoviesPage,
  OnboardingMoviesPage,
} from "@/pages/onboarding";
import { AppRoot } from "@/components/AppRoot";
import { OnboardingGuard } from "@/components/OnboardingGuard";
import { useAuth } from "@/contexts/AuthContext";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { UnauthorizedErrorPage } from "@/pages/UnauthorizedErrorPage";
import { OfflineErrorPage } from "@/pages/OfflineErrorPage";
import { useVerifyUser } from "./hooks/useVerifyUser";
import { FullPageSpinner } from "./components/ui/FullPageSpinner";

/**
 * Protected route component that requires an ACTIVE session.
 * Verifies the session by fetching user data.
 * Redirects to login page if user is not authenticated or session is invalid.
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, logout } = useAuth();
  const { isLoading, isError } = useVerifyUser();

  if (isLoading) {
    // Pokaż spinner na całą stronę podczas weryfikacji sesji
    return <FullPageSpinner />;
  }

  if (isError || !isAuthenticated) {
    // Jeśli wystąpił błąd (np. 401) lub tokeny w ogóle nie istnieją,
    // wyloguj (na wszelki wypadek, by wyczyścić stare tokeny) i przekieruj
    logout();
    return <Navigate to="/auth/login" replace />;
  }

  return <>{children}</>;
}

/**
 * Protected layout with OnboardingGuard.
 * This ensures OnboardingGuard is mounted only once for all protected routes.
 */
function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <OnboardingGuard>
        <Outlet />
      </OnboardingGuard>
    </ProtectedRoute>
  );
}

/**
 * Application router configuration.
 * Defines all routes and their corresponding components.
 */
export const router = createBrowserRouter([
  {
    path: "/auth",
    element: <Outlet />,
    children: [
      {
        path: "register",
        element: <RegisterPage />,
      },
      {
        path: "login",
        element: <LoginPage />,
      },
      {
        path: "forgot-password",
        element: <ForgotPasswordPage />,
      },
      {
        path: "reset-password",
        element: <ResetPasswordPage />,
      },
    ],
  },
  {
    path: "/",
    element: <ProtectedLayout />,
    children: [
      {
        index: true,
        element: <AppRoot />,
      },
      {
        path: "app/onvod",
        element: <OnVODPage />,
      },
      {
        path: "app/watchlist",
        element: <WatchlistPage />,
      },
      {
        path: "app/watched",
        element: <WatchedPage />,
      },
      {
        path: "app/profile",
        element: <ProfilePage />,
      },
      {
        path: "app/admin/dashboard",
        element: <AdminDashboardPage />,
      },
      {
        path: "onboarding",
        children: [
          {
            index: true,
            element: <Navigate to="/onboarding/platforms" replace />,
          },
          {
            path: "platforms",
            element: <OnboardingPlatformsPage />,
          },
          {
            path: "first-movies",
            element: <OnboardingFirstMoviesPage />,
          },
          {
            path: "movies",
            element: <OnboardingMoviesPage />,
          },
        ],
      },
    ],
  },
  {
    path: "/error/unauthorized",
    element: <UnauthorizedErrorPage />,
  },
  {
    path: "/error/offline",
    element: <OfflineErrorPage />,
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);
