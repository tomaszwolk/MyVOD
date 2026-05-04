import { useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import { useAuth } from "@/contexts/AuthContext";
import { MediaLibraryLayout } from "@/components/library/MediaLibraryLayout";
import { MetricsCardsGrid } from "@/components/admin/MetricsCardsGrid";
import { ChartsRow } from "@/components/admin/ChartsRow";
import { TopMoviesSection } from "@/components/admin/TopMoviesSection";
import { ErrorLogsSection } from "@/components/admin/ErrorLogsSection";
import { useAdminMetrics } from "@/hooks/useAdminMetrics";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { AvailabilitySyncSection } from "./admin/AvailabilitySyncSection";

/**
 * AdminDashboardPage component.
 * Main admin dashboard page displaying metrics, charts, top movies, and error logs.
 * Requires staff permissions (checked on backend).
 */
export function AdminDashboardPage() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const metricsQuery = useAdminMetrics();

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    navigate("/auth/login", { replace: true });
    return null;
  }

  // Handle 403 errors (not staff)
  if (metricsQuery.error && isAxiosError(metricsQuery.error)) {
    const status = metricsQuery.error.response?.status;
    if (status === 403) {
      return (
        <MediaLibraryLayout title="Admin Dashboard" subtitle="Analytics">
          <div className="p-4">
            <div className="bg-destructive/10 border border-destructive rounded-lg p-6 text-center">
              <p className="text-destructive font-semibold mb-2">
                Brak uprawnień do przeglądania tej sekcji
              </p>
              <p className="text-muted-foreground">
                Ta sekcja jest dostępna tylko dla administratorów.
              </p>
            </div>
          </div>
        </MediaLibraryLayout>
      );
    }
  }

  const headerActions = (
    <div className="flex items-center gap-3">
      <ThemeToggle key="theme-toggle" />
      <Button variant="outline" onClick={logout} className="gap-2">
        <LogOut className="h-4 w-4" />
        Wyloguj się
      </Button>
    </div>
  );

  const tabs = [
    {
      id: "onvod",
      label: "OnVOD",
      isActive: false,
      onSelect: () => navigate("/app/onvod"),
    },
    {
      id: "watchlist",
      label: "Watchlista",
      isActive: false,
      onSelect: () => navigate("/app/watchlist"),
    },
    {
      id: "watched",
      label: "Obejrzane",
      isActive: false,
      onSelect: () => navigate("/app/watched"),
    },
    {
      id: "profile",
      label: "Profil",
      isActive: false,
      onSelect: () => navigate("/app/profile"),
    },
    {
      id: "admin",
      label: "Admin",
      isActive: true,
      onSelect: () => {},
    },
  ];

  return (
    <MediaLibraryLayout
      title="Admin Dashboard"
      subtitle="Analytics i diagnostyka"
      tabs={tabs}
      headerActions={headerActions}
    >
      <div className="p-4 space-y-6">
        {/* Metrics Cards */}
        {metricsQuery.isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Ładowanie metryk...</p>
          </div>
        ) : metricsQuery.error ? (
          <div className="text-center py-8 text-destructive">
            <p>Nie udało się załadować metryk</p>
            <Button
              variant="outline"
              onClick={() => metricsQuery.refetch()}
              className="mt-4"
            >
              Spróbuj ponownie
            </Button>
          </div>
        ) : metricsQuery.data ? (
          <>
            <MetricsCardsGrid metrics={metricsQuery.data} />

            {/* Charts */}
            <ChartsRow metrics={metricsQuery.data} />

            {/* Top Movies Section */}
            <TopMoviesSection />

            {/* Error Logs Section */}
            <ErrorLogsSection />

            {/* Availability Sync Section */}
            <AvailabilitySyncSection />
          </>
        ) : null}
      </div>
    </MediaLibraryLayout>
  );
}
