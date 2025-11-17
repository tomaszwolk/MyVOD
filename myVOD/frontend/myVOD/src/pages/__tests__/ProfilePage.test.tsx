import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ProfilePage } from "../ProfilePage";

const mockNavigate = vi.fn();
const mockSetSearchParams = vi.fn();
const mockLogout = vi.fn();
const mockUpdatePlatforms = vi.fn();
const mockDeleteAccount = vi.fn();
const mockChangePassword = vi.fn();
const mockAddMovie = vi.fn();
const mockPatchUserMovie = vi.fn();

const mockUseAuth = vi.fn();
const mockUseUserProfile = vi.fn();
const mockUsePlatforms = vi.fn();
const mockUseUpdateUserPlatforms = vi.fn();
const mockUseDeleteAccount = vi.fn();
const mockUseChangePassword = vi.fn();
const mockUseAddMovie = vi.fn();
const mockUseListUserMovies = vi.fn();
const mockUsePatchUserMovie = vi.fn();
const mockUseAISuggestions = vi.fn();
const mockUseIsStaff = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams(), mockSetSearchParams] as const,
}));

vi.mock("@/hooks/useUserProfile", () => ({
  useUserProfile: () => mockUseUserProfile(),
}));

vi.mock("@/hooks/usePlatforms", () => ({
  usePlatforms: () => mockUsePlatforms(),
}));

vi.mock("@/hooks/useUpdateUserPlatforms", () => ({
  useUpdateUserPlatforms: () => mockUseUpdateUserPlatforms(),
}));

vi.mock("@/hooks/useDeleteAccount", () => ({
  useDeleteAccount: () => mockUseDeleteAccount(),
}));

vi.mock("@/hooks/useChangePassword", () => ({
  useChangePassword: () => mockUseChangePassword(),
}));

vi.mock("@/hooks/useAddMovie", () => ({
  useAddMovie: () => mockUseAddMovie(),
}));

vi.mock("@/hooks/useListUserMovies", () => ({
  useListUserMovies: (type: "watchlist" | "watched") => mockUseListUserMovies(type),
}));

vi.mock("@/hooks/usePatchUserMovie", () => ({
  usePatchUserMovie: () => mockUsePatchUserMovie(),
}));

vi.mock("@/hooks/useAISuggestions", () => ({
  useAISuggestions: () => mockUseAISuggestions(),
}));

vi.mock("@/components/suggestions/AISuggestionsDialog", () => ({
  AISuggestionsDialog: ({ open }: { open: boolean }) => (
    open ? <div data-testid="ai-suggestions-dialog" /> : null
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

vi.mock("@/components/library/MediaLibraryLayout", () => ({
  MediaLibraryLayout: ({
    title,
    subtitle,
    tabs,
    headerActions,
    toolbar,
    children,
  }: {
    title: string;
    subtitle: string;
    tabs: Array<{ id: string; label: string; onSelect: () => void; isActive: boolean }>;
    headerActions: React.ReactNode;
    toolbar: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div data-testid="media-library-layout">
      <div data-testid="header">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div data-testid="tabs">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={tab.onSelect} aria-pressed={tab.isActive}>
            {tab.label}
          </button>
        ))}
      </div>
      <div data-testid="header-actions">{headerActions}</div>
      <div data-testid="toolbar">{toolbar}</div>
      <div data-testid="content">{children}</div>
    </div>
  ),
}));

vi.mock("@/components/library/MediaToolbar", () => ({
  MediaToolbar: ({
    searchSlot,
    primaryActionsSlot,
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

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

const defaultPlatforms = () => [
  { id: 1, platform_name: "Netflix", platform_slug: "netflix" },
  { id: 2, platform_name: "HBO Max", platform_slug: "hbo-max" },
  { id: 3, platform_name: "Disney+", platform_slug: "disney-plus" },
];

let profileRefetch: ReturnType<typeof vi.fn>;
let platformsRefetch: ReturnType<typeof vi.fn>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  return Wrapper;
};

beforeEach(() => {
  vi.clearAllMocks();

  profileRefetch = vi.fn();
  platformsRefetch = vi.fn();

  mockUseAuth.mockReturnValue({
    isAuthenticated: true,
    logout: mockLogout,
  });

  mockUseUserProfile.mockReturnValue({
    data: {
      email: "test@example.com",
      platforms: [defaultPlatforms()[0]],
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: profileRefetch,
  });

  mockUsePlatforms.mockReturnValue({
    data: defaultPlatforms(),
    isLoading: false,
    isError: false,
    error: null,
    refetch: platformsRefetch,
  });

  mockUpdatePlatforms.mockImplementation((ids: number[], options?: { onSuccess?: (data: { platforms: Array<{ id: number }> }) => void }) => {
    options?.onSuccess?.({ platforms: ids.map((id) => ({ id })) });
  });

  mockUseUpdateUserPlatforms.mockReturnValue({
    mutate: mockUpdatePlatforms,
    isPending: false,
  });

  mockChangePassword.mockResolvedValue({ message: "changed" });
  mockUseChangePassword.mockReturnValue({
    mutateAsync: mockChangePassword,
    isPending: false,
  });

  mockUseDeleteAccount.mockReturnValue({
    mutate: mockDeleteAccount,
    isPending: false,
  });

  mockUseAddMovie.mockReturnValue({ mutateAsync: mockAddMovie });
  mockUsePatchUserMovie.mockReturnValue({ mutateAsync: mockPatchUserMovie });

  mockUseListUserMovies.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
  });

  mockUseAISuggestions.mockReturnValue({
    data: null,
    error: null,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });

  mockUseIsStaff.mockReturnValue(false);
});

afterEach(() => {
  mockNavigate.mockClear();
  mockSetSearchParams.mockClear();
});

describe("ProfilePage", () => {
  it("redirects unauthenticated users to login", () => {
    mockUseAuth.mockReturnValueOnce({ isAuthenticated: false, logout: mockLogout });

    render(<ProfilePage />, { wrapper: createWrapper() });

    expect(mockNavigate).toHaveBeenCalledWith("/auth/login", { replace: true });
  });

  it("renders user information and platform preferences", () => {
    render(<ProfilePage />, { wrapper: createWrapper() });

    expect(screen.getByRole("heading", { name: "Profil" })).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
    expect(screen.getByTestId("platform-preferences-card")).toBeInTheDocument();
    expect(screen.getByTestId("platforms-count")).toHaveTextContent("3");
    expect(screen.getByTestId("selected-count")).toHaveTextContent("1");
  });

  it("navigates to other tabs when clicked", async () => {
    const user = userEvent.setup();
    render(<ProfilePage />, { wrapper: createWrapper() });

    await user.click(screen.getByText("Watchlista"));
    expect(mockNavigate).toHaveBeenCalledWith("/app/watchlist");

    await user.click(screen.getByText("Obejrzane"));
    expect(mockNavigate).toHaveBeenCalledWith("/app/watched");
  });

  it("saves platform preference changes after toggling a platform", async () => {
    const user = userEvent.setup();
    render(<ProfilePage />, { wrapper: createWrapper() });

    const targetPlatform = screen.getByRole("checkbox", { name: /hbo max/i });
    await user.click(targetPlatform);

    const saveButton = screen.getByTestId("save-platforms");
    await user.click(saveButton);

    expect(mockUpdatePlatforms).toHaveBeenCalledWith([1, 2], expect.any(Object));
  });

  it("submits change password form with provided credentials", async () => {
    const user = userEvent.setup();
    render(<ProfilePage />, { wrapper: createWrapper() });

    await user.type(screen.getByLabelText(/Obecne hasło/i), "oldpass123");
    await user.type(screen.getByLabelText(/^Nowe hasło$/i), "newpass123");
    await user.type(screen.getByLabelText(/Potwierdź nowe hasło/i), "newpass123");

    await user.click(screen.getByTestId("change-password-submit"));

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith({
        current_password: "oldpass123",
        new_password: "newpass123",
      });
    });
  });

  it("shows loading skeleton while data is fetching", () => {
    mockUseUserProfile.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: profileRefetch,
    });

    render(<ProfilePage />, { wrapper: createWrapper() });

    expect(screen.getByTestId("skeleton-heading")).toBeInTheDocument();
    expect(screen.getByTestId("skeleton-content")).toBeInTheDocument();
  });

  it("renders error state and retries when requested", async () => {
    const refetchProfile = vi.fn();
    const refetchPlatforms = vi.fn();

    mockUseUserProfile.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Failed"),
      refetch: refetchProfile,
    });

    mockUsePlatforms.mockReturnValueOnce({
      data: [],
      isLoading: false,
      isError: true,
      error: new Error("Failed"),
      refetch: refetchPlatforms,
    });

    const user = userEvent.setup();
    render(<ProfilePage />, { wrapper: createWrapper() });

    expect(screen.getByText(/Nie udało się załadować profilu/i)).toBeInTheDocument();

    const retryButton = screen.getByRole("button", { name: /spróbuj ponownie/i });
    await user.click(retryButton);

    expect(refetchProfile).toHaveBeenCalled();
    expect(refetchPlatforms).toHaveBeenCalled();
  });

  it("updates search params when AI suggestions button is pressed", async () => {
    const user = userEvent.setup();
    render(<ProfilePage />, { wrapper: createWrapper() });

    await user.click(screen.getByTestId("suggest-ai-button"));

    expect(mockSetSearchParams).toHaveBeenCalledTimes(1);
    const [params, options] = mockSetSearchParams.mock.calls[0];
    expect(params).toBeInstanceOf(URLSearchParams);
    expect(params.get("suggestions")).toBe("true");
    expect(options).toEqual({ replace: false });
  });
});

