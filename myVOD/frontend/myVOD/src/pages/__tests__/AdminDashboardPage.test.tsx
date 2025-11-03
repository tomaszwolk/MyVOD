import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminDashboardPage } from "../AdminDashboardPage";

// Mock dependencies
const mockNavigate = vi.fn();
const mockLogout = vi.fn();
const mockRefetch = vi.fn();

const mockUseAuth = vi.fn();
const mockUseAdminMetrics = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@/hooks/useAdminMetrics", () => ({
  useAdminMetrics: () => mockUseAdminMetrics(),
}));

vi.mock("@/components/library/MediaLibraryLayout", () => ({
  MediaLibraryLayout: ({ children, title, subtitle, tabs, headerActions }: any) => (
    <div data-testid="media-library-layout">
      <div data-testid="title">{title}</div>
      <div data-testid="subtitle">{subtitle}</div>
      {tabs && <div data-testid="tabs">{tabs.map((tab: any) => (
        <button key={tab.id} onClick={tab.onSelect} data-testid={`tab-${tab.id}`}>
          {tab.label}
        </button>
      ))}</div>}
      {headerActions && <div data-testid="header-actions">{headerActions}</div>}
      <div data-testid="layout-content">{children}</div>
    </div>
  ),
}));

vi.mock("@/components/admin/MetricsCardsGrid", () => ({
  MetricsCardsGrid: ({ metrics }: any) => (
    <div data-testid="metrics-cards-grid">Metrics Grid</div>
  ),
}));

vi.mock("@/components/admin/ChartsRow", () => ({
  ChartsRow: ({ metrics }: any) => (
    <div data-testid="charts-row">Charts Row</div>
  ),
}));

vi.mock("@/components/admin/TopMoviesSection", () => ({
  TopMoviesSection: () => (
    <div data-testid="top-movies-section">Top Movies Section</div>
  ),
}));

vi.mock("@/components/admin/ErrorLogsSection", () => ({
  ErrorLogsSection: () => (
    <div data-testid="error-logs-section">Error Logs Section</div>
  ),
}));

vi.mock("@/components/ui/theme-toggle", () => ({
  ThemeToggle: () => <button data-testid="theme-toggle">Theme Toggle</button>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, variant, className }: any) => (
    <button
      onClick={onClick}
      data-testid={`button-${variant || 'default'}`}
      className={className}
    >
      {children}
    </button>
  ),
}));

vi.mock("lucide-react", () => ({
  LogOut: () => <svg data-testid="logout-icon" />,
}));

vi.mock("axios", () => ({
  isAxiosError: vi.fn((error) => error && error.response),
}));

describe("AdminDashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication & Authorization", () => {
    it("should redirect to login when user is not authenticated", () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        logout: mockLogout,
      });
      mockUseAdminMetrics.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<AdminDashboardPage />);

      expect(mockNavigate).toHaveBeenCalledWith("/auth/login", { replace: true });
    });

    it("should display 403 error message when user is not staff", () => {
      const mockError = {
        response: { status: 403 },
      };

      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        logout: mockLogout,
      });
      mockUseAdminMetrics.mockReturnValue({
        data: null,
        isLoading: false,
        error: mockError,
        refetch: mockRefetch,
      });

      render(<AdminDashboardPage />);

      expect(screen.getByText("Admin Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Analytics")).toBeInTheDocument();
      expect(screen.getByText("Brak uprawnień do przeglądania tej sekcji")).toBeInTheDocument();
      expect(screen.getByText("Ta sekcja jest dostępna tylko dla administratorów.")).toBeInTheDocument();
    });

    it("should render dashboard when user is authenticated and staff", () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        logout: mockLogout,
      });
      mockUseAdminMetrics.mockReturnValue({
        data: {},
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<AdminDashboardPage />);

      expect(screen.getByText("Admin Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Analytics i diagnostyka")).toBeInTheDocument();
    });
  });

  describe("Layout & Navigation", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        logout: mockLogout,
      });
      mockUseAdminMetrics.mockReturnValue({
        data: {},
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });
    });

    it("should render page with correct title and subtitle", () => {
      render(<AdminDashboardPage />);

      expect(screen.getByText("Admin Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Analytics i diagnostyka")).toBeInTheDocument();
    });

    it("should render navigation tabs", () => {
      render(<AdminDashboardPage />);

      expect(screen.getByTestId("tab-watchlist")).toBeInTheDocument();
      expect(screen.getByTestId("tab-watched")).toBeInTheDocument();
      expect(screen.getByTestId("tab-profile")).toBeInTheDocument();
      expect(screen.getByTestId("tab-admin")).toBeInTheDocument();
    });

    it("should navigate to watchlist when watchlist tab is clicked", async () => {
      const user = userEvent.setup();
      render(<AdminDashboardPage />);

      await user.click(screen.getByTestId("tab-watchlist"));

      expect(mockNavigate).toHaveBeenCalledWith("/app/watchlist");
    });

    it("should navigate to watched when watched tab is clicked", async () => {
      const user = userEvent.setup();
      render(<AdminDashboardPage />);

      await user.click(screen.getByTestId("tab-watched"));

      expect(mockNavigate).toHaveBeenCalledWith("/app/watched");
    });

    it("should navigate to profile when profile tab is clicked", async () => {
      const user = userEvent.setup();
      render(<AdminDashboardPage />);

      await user.click(screen.getByTestId("tab-profile"));

      expect(mockNavigate).toHaveBeenCalledWith("/app/profile");
    });
  });

  describe("Header Actions", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        logout: mockLogout,
      });
      mockUseAdminMetrics.mockReturnValue({
        data: {},
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });
    });

    it("should render theme toggle and logout button", () => {
      render(<AdminDashboardPage />);

      expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
      expect(screen.getByText("Wyloguj się")).toBeInTheDocument();
      expect(screen.getByTestId("logout-icon")).toBeInTheDocument();
    });

    it("should call logout when logout button is clicked", async () => {
      const user = userEvent.setup();
      render(<AdminDashboardPage />);

      await user.click(screen.getByText("Wyloguj się"));

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe("Loading States", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        logout: mockLogout,
      });
    });

    it("should display loading message when metrics are loading", () => {
      mockUseAdminMetrics.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      });

      render(<AdminDashboardPage />);

      expect(screen.getByText("Ładowanie metryk...")).toBeInTheDocument();
    });

    it("should not render dashboard content during loading", () => {
      mockUseAdminMetrics.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      });

      render(<AdminDashboardPage />);

      expect(screen.queryByTestId("metrics-cards-grid")).not.toBeInTheDocument();
      expect(screen.queryByTestId("charts-row")).not.toBeInTheDocument();
      expect(screen.queryByTestId("top-movies-section")).not.toBeInTheDocument();
      expect(screen.queryByTestId("error-logs-section")).not.toBeInTheDocument();
    });
  });

  describe("Error States", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        logout: mockLogout,
      });
    });

    it("should display error message when metrics fetch fails", () => {
      mockUseAdminMetrics.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error("Network error"),
        refetch: mockRefetch,
      });

      render(<AdminDashboardPage />);

      expect(screen.getByText("Nie udało się załadować metryk")).toBeInTheDocument();
    });

    it("should display retry button when error occurs", () => {
      mockUseAdminMetrics.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error("Network error"),
        refetch: mockRefetch,
      });

      render(<AdminDashboardPage />);

      expect(screen.getByText("Spróbuj ponownie")).toBeInTheDocument();
    });

    it("should call refetch when retry button is clicked", async () => {
      const user = userEvent.setup();
      mockUseAdminMetrics.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error("Network error"),
        refetch: mockRefetch,
      });

      render(<AdminDashboardPage />);

      await user.click(screen.getByText("Spróbuj ponownie"));

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("Content Rendering", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        logout: mockLogout,
      });
      mockUseAdminMetrics.mockReturnValue({
        data: {},
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });
    });

    it("should render MetricsCardsGrid when data is loaded", () => {
      render(<AdminDashboardPage />);

      expect(screen.getByTestId("metrics-cards-grid")).toBeInTheDocument();
    });

    it("should render ChartsRow when data is loaded", () => {
      render(<AdminDashboardPage />);

      expect(screen.getByTestId("charts-row")).toBeInTheDocument();
    });

    it("should render TopMoviesSection when data is loaded", () => {
      render(<AdminDashboardPage />);

      expect(screen.getByTestId("top-movies-section")).toBeInTheDocument();
    });

    it("should render ErrorLogsSection when data is loaded", () => {
      render(<AdminDashboardPage />);

      expect(screen.getByTestId("error-logs-section")).toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        logout: mockLogout,
      });
    });

    it("should handle 403 error gracefully (not staff)", () => {
      const mockError = {
        response: { status: 403 },
      };

      mockUseAdminMetrics.mockReturnValue({
        data: null,
        isLoading: false,
        error: mockError,
        refetch: mockRefetch,
      });

      render(<AdminDashboardPage />);

      expect(screen.getByText("Brak uprawnień do przeglądania tej sekcji")).toBeInTheDocument();
      expect(screen.getByText("Ta sekcja jest dostępna tylko dla administratorów.")).toBeInTheDocument();
    });

    it("should handle network errors gracefully", () => {
      mockUseAdminMetrics.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error("Network error"),
        refetch: mockRefetch,
      });

      render(<AdminDashboardPage />);

      expect(screen.getByText("Nie udało się załadować metryk")).toBeInTheDocument();
      expect(screen.getByText("Spróbuj ponownie")).toBeInTheDocument();
    });
  });
});
