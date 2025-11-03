import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import React from "react";

const watchedToolbarMock = vi.fn();
const watchedContentMock = vi.fn();
const setHideUnavailableMock = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ isAuthenticated: true, logout: vi.fn() }),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
  useSearchParams: () => [
    new URLSearchParams(),
    vi.fn(),
  ],
}));

vi.mock("@/components/library/MediaLibraryLayout", () => ({
  MediaLibraryLayout: ({ toolbar, children }: { toolbar: React.ReactNode; children: React.ReactNode }) => (
    <div>
      <div data-testid="toolbar-slot">{toolbar}</div>
      <div data-testid="content-slot">{children}</div>
    </div>
  ),
}));

vi.mock("@/components/watched/WatchedToolbar", () => ({
  WatchedToolbar: (props: any) => {
    watchedToolbarMock(props);
    return <div data-testid="watched-toolbar" />;
  },
}));

vi.mock("@/components/watched/WatchedContent", () => ({
  WatchedContent: (props: any) => {
    watchedContentMock(props);
    return <div data-testid="watched-content" />;
  },
}));

vi.mock("@/components/suggestions/AISuggestionsDialog", () => ({
  AISuggestionsDialog: () => null,
}));

vi.mock("@/components/watchlist/ConfirmDialog", () => ({
  ConfirmDialog: () => null,
}));

vi.mock("@/components/watchlist/ToastViewport", () => ({
  ToastViewport: () => null,
}));

vi.mock("@/components/ui/theme-toggle", () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

vi.mock("@/hooks/useWatchedPreferences", () => ({
  useWatchedPreferences: vi.fn(),
}));

vi.mock("@/hooks/useUserMoviesWatched", () => ({
  useUserMoviesWatched: vi.fn(),
}));

vi.mock("@/hooks/useUserProfile", () => ({
  useUserProfile: vi.fn(),
}));

vi.mock("@/hooks/usePlatforms", () => ({
  usePlatforms: vi.fn(),
}));

vi.mock("@/hooks/useWatchedActions", () => ({
  useRestoreToWatchlist: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteFromWatched: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/hooks/useAddMovie", () => ({
  useAddMovie: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@/hooks/useListUserMovies", () => ({
  useListUserMovies: vi.fn(),
}));

vi.mock("@/hooks/usePatchUserMovie", () => ({
  usePatchUserMovie: () => ({ mutateAsync: vi.fn() }),
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

import { WatchedPage } from "../WatchedPage";
import { useWatchedPreferences } from "@/hooks/useWatchedPreferences";
import { useUserMoviesWatched } from "@/hooks/useUserMoviesWatched";
import { useUserProfile } from "@/hooks/useUserProfile";
import { usePlatforms } from "@/hooks/usePlatforms";
import { useListUserMovies } from "@/hooks/useListUserMovies";

const mockUseWatchedPreferences = vi.mocked(useWatchedPreferences);
const mockUseUserMoviesWatched = vi.mocked(useUserMoviesWatched);
const mockUseUserProfile = vi.mocked(useUserProfile);
const mockUsePlatforms = vi.mocked(usePlatforms);
const mockUseListUserMovies = vi.mocked(useListUserMovies);

describe("WatchedPage filtering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    watchedToolbarMock.mockClear();
    watchedContentMock.mockClear();
    setHideUnavailableMock.mockClear();

    mockUsePlatforms.mockReturnValue({ data: [], isLoading: false });
    mockUseListUserMovies.mockReturnValue({ data: [] });
  });

  const availableItem = {
    id: 1,
    tconst: "tt1",
    title: "Available",
    year: 2020,
    genres: [],
    avgRating: "7.0",
    posterPath: null,
    watchedAt: "2024-01-01",
    watchedAtLabel: "1 stycznia 2024",
    availability: [],
    isAvailableOnAnyPlatform: true,
  };

  const unavailableItem = {
    ...availableItem,
    id: 2,
    tconst: "tt2",
    title: "Unavailable",
    isAvailableOnAnyPlatform: false,
  };

  function setupWatchedPreferences(overrides?: Partial<ReturnType<typeof useWatchedPreferences>>) {
    mockUseWatchedPreferences.mockReturnValue({
      viewMode: "grid",
      sort: "added_desc",
      hideUnavailable: true,
      setViewMode: vi.fn(),
      setSort: vi.fn(),
      setHideUnavailable: setHideUnavailableMock,
      ...overrides,
    });
  }

  it("filters out unavailable items when user has selected platforms", () => {
    setupWatchedPreferences({ hideUnavailable: true });
    mockUseUserProfile.mockReturnValue({ data: { platforms: [{ id: 1 }] }, isLoading: false });
    mockUseUserMoviesWatched.mockReturnValue({
      items: [availableItem, unavailableItem],
      isLoading: false,
      isEmpty: false,
    });

    render(<WatchedPage />);

    expect(watchedContentMock).toHaveBeenCalledTimes(1);
    const contentProps = watchedContentMock.mock.calls[0][0];
    expect(contentProps.items).toHaveLength(1);
    expect(contentProps.items[0].id).toBe(1);
    expect(contentProps.isEmpty).toBe(false);

    const toolbarProps = watchedToolbarMock.mock.calls[0][0];
    expect(toolbarProps.visibleCount).toBe(1);
    expect(toolbarProps.totalCount).toBe(2);
    expect(toolbarProps.hideUnavailable).toBe(true);
    expect(toolbarProps.hasUserPlatforms).toBe(true);

    toolbarProps.onToggleHideUnavailable();
    expect(setHideUnavailableMock).toHaveBeenCalledWith(false);
  });

  it("does not filter items when user has no selected platforms", () => {
    setupWatchedPreferences({ hideUnavailable: true });
    mockUseUserProfile.mockReturnValue({ data: { platforms: [] }, isLoading: false });
    mockUseUserMoviesWatched.mockReturnValue({
      items: [availableItem, unavailableItem],
      isLoading: false,
      isEmpty: false,
    });

    render(<WatchedPage />);

    const contentProps = watchedContentMock.mock.calls[0][0];
    expect(contentProps.items).toHaveLength(2);
    expect(contentProps.isEmpty).toBe(false);

    const toolbarProps = watchedToolbarMock.mock.calls[0][0];
    expect(toolbarProps.visibleCount).toBe(2);
    expect(toolbarProps.totalCount).toBe(2);
    expect(toolbarProps.hasUserPlatforms).toBe(false);
  });

  it("passes empty state when all items are filtered out", () => {
    setupWatchedPreferences({ hideUnavailable: true });
    mockUseUserProfile.mockReturnValue({ data: { platforms: [{ id: 1 }] }, isLoading: false });
    mockUseUserMoviesWatched.mockReturnValue({
      items: [unavailableItem],
      isLoading: false,
      isEmpty: false,
    });

    render(<WatchedPage />);

    const contentProps = watchedContentMock.mock.calls[0][0];
    expect(contentProps.items).toHaveLength(0);
    expect(contentProps.isEmpty).toBe(true);

    const toolbarProps = watchedToolbarMock.mock.calls[0][0];
    expect(toolbarProps.visibleCount).toBe(0);
    expect(toolbarProps.totalCount).toBe(1);

    toolbarProps.onToggleHideUnavailable();
    expect(setHideUnavailableMock).toHaveBeenCalledWith(false);
  });

  it("exposes toggle handler that enables hiding when currently disabled", () => {
    setupWatchedPreferences({ hideUnavailable: false });
    mockUseUserProfile.mockReturnValue({ data: { platforms: [{ id: 1 }] }, isLoading: false });
    mockUseUserMoviesWatched.mockReturnValue({
      items: [availableItem, unavailableItem],
      isLoading: false,
      isEmpty: false,
    });

    render(<WatchedPage />);

    const toolbarProps = watchedToolbarMock.mock.calls[0][0];
    toolbarProps.onToggleHideUnavailable();
    expect(setHideUnavailableMock).toHaveBeenCalledWith(true);
  });
});


