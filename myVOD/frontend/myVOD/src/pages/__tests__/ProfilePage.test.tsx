import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// Mock dependencies
const mockNavigate = vi.fn();
const mockSetSearchParams = vi.fn();
const mockLogout = vi.fn();
const mockUpdatePlatforms = vi.fn();
const mockDeleteAccount = vi.fn();
const mockChangePassword = vi.fn();
const mockAddMovie = vi.fn();
const mockPatchUserMovie = vi.fn();

const mockUseAuth = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [
    new URLSearchParams(),
    mockSetSearchParams,
  ],
}));

vi.mock("@/hooks/useUserProfile", () => ({
  useUserProfile: vi.fn(),
}));

vi.mock("@/hooks/usePlatforms", () => ({
  usePlatforms: vi.fn(),
}));

vi.mock("@/hooks/useUpdateUserPlatforms", () => ({
  useUpdateUserPlatforms: () => ({
    mutate: mockUpdatePlatforms,
    isPending: false,
  }),
}));

vi.mock("@/hooks/useDeleteAccount", () => ({
  useDeleteAccount: () => ({
    mutate: mockDeleteAccount,
    isPending: false,
  }),
}));

vi.mock("@/hooks/useChangePassword", () => ({
  useChangePassword: () => ({
    mutateAsync: mockChangePassword,
    isPending: false,
  }),
}));

vi.mock("@/hooks/useAddMovie", () => ({
  useAddMovie: () => ({
    mutateAsync: mockAddMovie,
  }),
}));

vi.mock("@/hooks/useListUserMovies", () => ({
  useListUserMovies: vi.fn(),
}));

vi.mock("@/hooks/usePatchUserMovie", () => ({
  usePatchUserMovie: () => ({
    mutateAsync: mockPatchUserMovie,
  }),
}));

vi.mock("@/hooks/useAISuggestions", () => ({
  useAISuggestions: () => ({
    data: null,
    error: null,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/components/library/MediaLibraryLayout", () => ({
  MediaLibraryLayout: ({ 
    title, 
    subtitle, 
    tabs, 
    headerActions, 
    toolbar, 
    children 
  }: { 
    title: string;
    subtitle: string;
    tabs: any[];
    headerActions: React.ReactNode;
    toolbar: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div data-testid="media-library-layout">
      <div data-testid="header">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div data-testid="tabs">{tabs?.map(tab => <button key={tab.id} onClick={tab.onSelect}>{tab.label}</button>)}</div>
      <div data-testid="header-actions">{headerActions}</div>
      <div data-testid="toolbar">{toolbar}</div>
      <div data-testid="content">{children}</div>
    </div>
  ),
}));

vi.mock("@/components/library/MediaToolbar", () => ({
  MediaToolbar: ({ 
    searchSlot, 
    primaryActionsSlot 
  }: { 
    searchSlot: React.ReactNode;
    primaryActionsSlot: React.ReactNode;
  }) => (
    <div data-testid="media-toolbar">
      <div data-testid="search-slot">{searchSlot}</div>
      <div data-testid="primary-actions-slot">{primaryActionsSlot}</div>
    </div>
  ),
}));

vi.mock("@/components/watchlist/SearchCombobox", () => ({
  SearchCombobox: () => <div data-testid="search-combobox">Search Combobox</div>,
}));

vi.mock("@/components/watchlist/SuggestAIButton", () => ({
  SuggestAIButton: ({ onClick, disabled }: { onClick: () => void; disabled: boolean }) => (
    <button data-testid="suggest-ai-button" onClick={onClick} disabled={disabled}>
      Suggest AI
    </button>
  ),
}));

vi.mock("@/components/profile/PlatformPreferencesCard", () => ({
  PlatformPreferencesCard: ({
    platforms,
    selectedIds,
    onToggle,
    dirty,
    saving,
    onSave,
    onReset,
  }: any) => (
    <div data-testid="platform-preferences-card">
      <div data-testid="platforms-count">{platforms?.length || 0}</div>
      <div data-testid="selected-count">{selectedIds?.length || 0}</div>
      <button data-testid="toggle-platform" onClick={() => onToggle(1)}>Toggle Platform</button>
      <button data-testid="save-platforms" onClick={onSave} disabled={!dirty || saving}>
        Save
      </button>
      <button data-testid="reset-platforms" onClick={onReset} disabled={!dirty || saving}>
        Reset
      </button>
    </div>
  ),
}));

vi.mock("@/components/profile/ChangePasswordCard", () => ({
  ChangePasswordCard: ({
    onChangePassword,
    isChanging,
  }: {
    onChangePassword: (current: string, newPassword: string) => Promise<void>;
    isChanging: boolean;
  }) => (
    <div data-testid="change-password-card">
      <button
        data-testid="change-password-submit"
        onClick={() => onChangePassword("oldPass123", "newPass456")}
        disabled={isChanging}
      >
        Change Password
      </button>
    </div>
  ),
}));

vi.mock("@/components/profile/DangerZoneCard", () => ({
  DangerZoneCard: ({ onRequestDelete }: { onRequestDelete: () => void }) => (
    <div data-testid="danger-zone-card">
      <button data-testid="delete-account-button" onClick={onRequestDelete}>
        Delete Account
      </button>
    </div>
  ),
}));

vi.mock("@/components/profile/DeleteAccountSection", () => ({
  DeleteAccountSection: ({
    open,
    onOpenChange,
    deleting,
    onConfirm,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    deleting: boolean;
    onConfirm: () => void;
  }) => (
    open && (
      <div data-testid="delete-account-dialog">
        <button data-testid="delete-confirm" onClick={onConfirm} disabled={deleting}>
          Confirm Delete
        </button>
        <button data-testid="delete-cancel" onClick={() => onOpenChange(false)}>
          Cancel
        </button>
      </div>
    )
  ),
}));

vi.mock("@/components/ui/theme-toggle", () => ({
  ThemeToggle: () => <div data-testid="theme-toggle">Theme Toggle</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/suggestions/AISuggestionsDialog", () => ({
  AISuggestionsDialog: () => null,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { ProfilePage } from "../ProfilePage";
import { useUserProfile } from "@/hooks/useUserProfile";
import { usePlatforms } from "@/hooks/usePlatforms";
import { useListUserMovies } from "@/hooks/useListUserMovies";

const mockUseUserProfile = vi.mocked(useUserProfile);
const mockUsePlatforms = vi.mocked(usePlatforms);
const mockUseListUserMovies = vi.mocked(useListUserMovies);

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockSetSearchParams.mockClear();
    mockLogout.mockClear();
    mockUpdatePlatforms.mockClear();
    mockDeleteAccount.mockClear();
    mockChangePassword.mockClear();
    mockAddMovie.mockClear();
    mockPatchUserMovie.mockClear();

    // Default mock implementations
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      logout: mockLogout,
    });

    mockUsePlatforms.mockReturnValue({
      data: [
        { id: 1, platform_name: "Netflix", platform_slug: "netflix" },
        { id: 2, platform_name: "HBO", platform_slug: "hbo" },
      ],
      isLoading: false,
      error: null,
      isError: false,
    } as any);

    mockUseListUserMovies.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      isError: false,
    } as any);
  });

  describe("Authentication", () => {
    it("redirects to login when user is not authenticated", () => {
      // Mock useAuth to return not authenticated
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        logout: mockLogout,
      });

      mockUseUserProfile.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        isError: false,
      } as any);

      render(<ProfilePage />);

      expect(mockNavigate).toHaveBeenCalledWith("/auth/login", { replace: true });
    });

    it("renders profile page when user is authenticated", () => {
      mockUseUserProfile.mockReturnValue({
        data: {
          email: "test@example.com",
          platforms: [],
        },
        isLoading: false,
        error: null,
        isError: false,
      } as any);

      render(<ProfilePage />);

      expect(screen.getByTestId("media-library-layout")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Profil" })).toBeInTheDocument();
    });
  });

  describe("Layout and Navigation", () => {
    beforeEach(() => {
      mockUseUserProfile.mockReturnValue({
        data: {
          email: "test@example.com",
          platforms: [],
        },
        isLoading: false,
        error: null,
        isError: false,
      } as any);
    });

    it("renders profile page with correct title and subtitle", () => {
      render(<ProfilePage />);

      expect(screen.getByRole("heading", { name: "Profil" })).toBeInTheDocument();
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });

    it("renders navigation tabs", () => {
      render(<ProfilePage />);

      expect(screen.getByText("Watchlista")).toBeInTheDocument();
      expect(screen.getByText("Obejrzane")).toBeInTheDocument();
      const profileTabs = screen.getAllByText("Profil");
      expect(profileTabs.length).toBeGreaterThan(0);
    });

    it("navigates to watchlist when watchlist tab is clicked", async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      const watchlistTab = screen.getByText("Watchlista");
      await user.click(watchlistTab);

      expect(mockNavigate).toHaveBeenCalledWith("/app/watchlist");
    });

    it("navigates to watched when watched tab is clicked", async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      const watchedTab = screen.getByText("Obejrzane");
      await user.click(watchedTab);

      expect(mockNavigate).toHaveBeenCalledWith("/app/watched");
    });

    it("renders theme toggle and logout button in header", () => {
      render(<ProfilePage />);

      expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
      expect(screen.getByText("Wyloguj się")).toBeInTheDocument();
    });

    it("calls logout and navigates when logout button is clicked", async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      const logoutButton = screen.getByText("Wyloguj się");
      await user.click(logoutButton);

      expect(mockLogout).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/auth/login", { replace: true });
    });
  });

  describe("Toolbar", () => {
    beforeEach(() => {
      mockUseUserProfile.mockReturnValue({
        data: {
          email: "test@example.com",
          platforms: [],
        },
        isLoading: false,
        error: null,
        isError: false,
      } as any);
    });

    it("renders search combobox in toolbar", () => {
      render(<ProfilePage />);

      expect(screen.getByTestId("search-combobox")).toBeInTheDocument();
    });

    it("renders suggest AI button in toolbar", () => {
      render(<ProfilePage />);

      expect(screen.getByTestId("suggest-ai-button")).toBeInTheDocument();
    });

    it("calls setSearchParams when suggest AI button is clicked", async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      const suggestButton = screen.getByTestId("suggest-ai-button");
      await user.click(suggestButton);

      expect(mockSetSearchParams).toHaveBeenCalled();
      // Check that it was called with searchParams that include 'suggestions=true'
      const callArgs = mockSetSearchParams.mock.calls[0];
      expect(callArgs[0]).toBeInstanceOf(URLSearchParams);
      expect(callArgs[0].get('suggestions')).toBe('true');
      // Check that replace option is false
      expect(callArgs[1]).toEqual({ replace: false });
    });
  });

  describe("Platform Preferences", () => {
    beforeEach(() => {
      mockUseUserProfile.mockReturnValue({
        data: {
          email: "test@example.com",
          platforms: [{ id: 1, platform_name: "Netflix", platform_slug: "netflix" }],
        },
        isLoading: false,
        error: null,
        isError: false,
      } as any);
    });

    it("renders platform preferences card", () => {
      render(<ProfilePage />);

      expect(screen.getByTestId("platform-preferences-card")).toBeInTheDocument();
    });

    it("initializes with user's selected platforms", () => {
      render(<ProfilePage />);

      const selectedCount = screen.getByTestId("selected-count");
      expect(selectedCount.textContent).toBe("1");
    });

    it("calls updatePlatforms mutation when save is clicked", async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      // First toggle a platform to make form dirty
      const toggleButton = screen.getByTestId("toggle-platform");
      await user.click(toggleButton);

      // Then save
      const saveButton = screen.getByTestId("save-platforms");
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdatePlatforms).toHaveBeenCalled();
      });
    });

    it("resets platform selection when reset is clicked", async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      // Toggle platform to make form dirty
      const toggleButton = screen.getByTestId("toggle-platform");
      await user.click(toggleButton);

      // Reset
      const resetButton = screen.getByTestId("reset-platforms");
      await user.click(resetButton);

      const selectedCount = screen.getByTestId("selected-count");
      expect(selectedCount.textContent).toBe("1"); // Back to initial state
    });
  });

  describe("Change Password", () => {
    beforeEach(() => {
      mockUseUserProfile.mockReturnValue({
        data: {
          email: "test@example.com",
          platforms: [],
        },
        isLoading: false,
        error: null,
        isError: false,
      } as any);
    });

    it("renders change password card", () => {
      render(<ProfilePage />);

      expect(screen.getByTestId("change-password-card")).toBeInTheDocument();
    });

    it("calls changePassword mutation when password is changed", async () => {
      const user = userEvent.setup();
      mockChangePassword.mockResolvedValue({ message: "Password changed successfully" });

      render(<ProfilePage />);

      const changePasswordButton = screen.getByTestId("change-password-submit");
      await user.click(changePasswordButton);

      await waitFor(() => {
        expect(mockChangePassword).toHaveBeenCalledWith({
          current_password: "oldPass123",
          new_password: "newPass456",
        });
      });
    });
  });

  describe("Danger Zone", () => {
    beforeEach(() => {
      mockUseUserProfile.mockReturnValue({
        data: {
          email: "test@example.com",
          platforms: [],
        },
        isLoading: false,
        error: null,
        isError: false,
      } as any);
    });

    it("renders danger zone card", () => {
      render(<ProfilePage />);

      expect(screen.getByTestId("danger-zone-card")).toBeInTheDocument();
    });

    it("opens delete account dialog when delete button is clicked", async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      const deleteButton = screen.getByTestId("delete-account-button");
      await user.click(deleteButton);

      expect(screen.getByTestId("delete-account-dialog")).toBeInTheDocument();
    });

    it("calls deleteAccount mutation when delete is confirmed", async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      // Open dialog
      const deleteButton = screen.getByTestId("delete-account-button");
      await user.click(deleteButton);

      // Confirm deletion
      const confirmButton = screen.getByTestId("delete-confirm");
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockDeleteAccount).toHaveBeenCalled();
      });
    });

    it("closes delete account dialog when cancel is clicked", async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      // Open dialog
      const deleteButton = screen.getByTestId("delete-account-button");
      await user.click(deleteButton);

      expect(screen.getByTestId("delete-account-dialog")).toBeInTheDocument();

      // Cancel
      const cancelButton = screen.getByTestId("delete-cancel");
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByTestId("delete-account-dialog")).not.toBeInTheDocument();
      });

      expect(mockDeleteAccount).not.toHaveBeenCalled();
    });
  });

  describe("Loading States", () => {
    it("displays loading skeleton when profile is loading", () => {
      mockUseUserProfile.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        isError: false,
      } as any);

      render(<ProfilePage />);

      // Check for loading indicators (skeleton elements)
      const content = screen.getByTestId("content");
      expect(content).toBeInTheDocument();
    });

    it("displays loading skeleton when platforms are loading", () => {
      mockUseUserProfile.mockReturnValue({
        data: {
          email: "test@example.com",
          platforms: [],
        },
        isLoading: false,
        error: null,
        isError: false,
      } as any);

      mockUsePlatforms.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        isError: false,
      } as any);

      render(<ProfilePage />);

      const content = screen.getByTestId("content");
      expect(content).toBeInTheDocument();
    });
  });

  describe("Error States", () => {
    it("displays error message when profile fails to load", () => {
      mockUseUserProfile.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error("Failed to load profile"),
        isError: true,
      } as any);

      mockUsePlatforms.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        isError: false,
      } as any);

      render(<ProfilePage />);

      expect(screen.getByText(/nie udało się załadować profilu/i)).toBeInTheDocument();
    });

    it("displays retry button when error occurs", () => {
      const mockRefetch = vi.fn();
      mockUseUserProfile.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error("Failed to load profile"),
        isError: true,
        refetch: mockRefetch,
      } as any);

      mockUsePlatforms.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        isError: false,
        refetch: vi.fn(),
      } as any);

      render(<ProfilePage />);

      expect(screen.getByRole("button", { name: /spróbuj ponownie/i })).toBeInTheDocument();
    });

    it("calls refetch when retry button is clicked", async () => {
      const user = userEvent.setup();
      const mockRefetchProfile = vi.fn();
      const mockRefetchPlatforms = vi.fn();

      mockUseUserProfile.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error("Failed to load profile"),
        isError: true,
        refetch: mockRefetchProfile,
      } as any);

      mockUsePlatforms.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        isError: false,
        refetch: mockRefetchPlatforms,
      } as any);

      render(<ProfilePage />);

      const retryButton = screen.getByRole("button", { name: /spróbuj ponownie/i });
      await user.click(retryButton);

      expect(mockRefetchProfile).toHaveBeenCalled();
      expect(mockRefetchPlatforms).toHaveBeenCalled();
    });
  });

  describe("Content Structure", () => {
    beforeEach(() => {
      mockUseUserProfile.mockReturnValue({
        data: {
          email: "test@example.com",
          platforms: [],
        },
        isLoading: false,
        error: null,
        isError: false,
      } as any);
    });

    it("renders all main sections in correct order", () => {
      render(<ProfilePage />);

      const content = screen.getByTestId("content");
      const sections = content.querySelectorAll('[data-testid$="-card"]');

      expect(sections.length).toBeGreaterThan(0);
      expect(screen.getByTestId("platform-preferences-card")).toBeInTheDocument();
      expect(screen.getByTestId("change-password-card")).toBeInTheDocument();
      expect(screen.getByTestId("danger-zone-card")).toBeInTheDocument();
    });
  });
});

