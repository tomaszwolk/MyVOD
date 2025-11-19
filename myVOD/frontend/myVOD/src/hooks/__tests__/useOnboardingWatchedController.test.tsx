import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useOnboardingWatchedController } from "../useOnboardingWatchedController";
import {
  addUserMovie,
  patchUserMovie,
  deleteUserMovie,
  listUserMovies,
  fetchUserMoviesSimpleList,
} from "@/lib/api/movies";
import {
  getNextOnboardingPath,
  useOnboardingStatus,
} from "@/hooks/useOnboardingStatus";
import { toast } from "sonner";
import type { SearchOptionVM, UserMovieDto } from "@/types/api.types";

// Mock dependencies
const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/lib/api/movies", () => ({
  addUserMovie: vi.fn(),
  patchUserMovie: vi.fn(),
  deleteUserMovie: vi.fn(),
  listUserMovies: vi.fn(),
  fetchUserMoviesSimpleList: vi.fn(),
}));

vi.mock("@/hooks/useOnboardingStatus", () => ({
  useOnboardingStatus: vi.fn(),
  getNextOnboardingPath: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const mockAddUserMovie = vi.mocked(addUserMovie);
const mockPatchUserMovie = vi.mocked(patchUserMovie);
const mockDeleteUserMovie = vi.mocked(deleteUserMovie);
const mockListUserMovies = vi.mocked(listUserMovies);
const mockFetchUserMoviesSimpleList = vi.mocked(fetchUserMoviesSimpleList);
const mockUseOnboardingStatus = vi.mocked(useOnboardingStatus);
const mockGetNextOnboardingPath = vi.mocked(getNextOnboardingPath);
const mockToast = vi.mocked(toast);

// Mock data
const mockMovie: SearchOptionVM = {
  tconst: "tt0111161",
  primaryTitle: "The Shawshank Redemption",
  startYear: 1994,
  avgRating: "9.3",
  posterUrl: "/poster.jpg",
};

const mockUserMovieDto: UserMovieDto = {
  id: 123,
  watchlisted_at: "2025-01-01T10:00:00Z",
  watched_at: "2025-01-01T11:00:00Z",
  movie: {
    tconst: "tt0111161",
    primary_title: "The Shawshank Redemption",
    start_year: 1994,
    genres: ["Drama"],
    avg_rating: "9.3",
    poster_path: "/poster.jpg",
  },
  availability: [],
};

const mockWatchedMovie: UserMovieDto = {
  ...mockUserMovieDto,
  id: 456,
  watched_at: "2025-01-02T10:00:00Z",
};

describe("useOnboardingWatchedController", () => {
  let queryClient: QueryClient;
  let navigateSpy: ReturnType<typeof vi.fn>;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    return { Wrapper, queryClient };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock for useOnboardingStatus - empty watchedMovies for most tests
    mockUseOnboardingStatus.mockReturnValue({
      isLoading: false,
      isOnboardingComplete: false,
      requiredStep: null,
      progress: {
        hasPlatforms: true,
        hasWatchlistMovies: true,
        hasWatchedMovies: false,
      },
      profile: null,
      watchlistMovies: [],
      watchedMovies: [], // Empty by default
    });

    mockGetNextOnboardingPath.mockReturnValue("/app");

    navigateSpy = mockNavigate;
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe("initialization", () => {
    it("should initialize with empty state", () => {
      mockUseOnboardingStatus.mockReturnValue({
        isLoading: false,
        isOnboardingComplete: false,
        requiredStep: null,
        progress: {
          hasPlatforms: true,
          hasWatchlistMovies: true,
          hasWatchedMovies: false,
        },
        profile: null,
        watchlistMovies: [],
        watchedMovies: [],
      });

      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useOnboardingWatchedController(), {
        wrapper: Wrapper,
      });

      expect(result.current.viewModel.query).toBe("");
      expect(result.current.viewModel.isSubmitting).toBe(false);
      expect(result.current.viewModel.selected).toEqual([]);
      expect(result.current.viewModel.requiredSelected).toBe(3);
    });

    it("should prefill with existing watched movies", () => {
      const existingWatchedMovies: UserMovieDto[] = [
        {
          id: 1,
          watchlisted_at: "2025-01-01T10:00:00Z",
          watched_at: "2025-01-01T11:00:00Z",
          movie: {
            tconst: "tt0111161",
            primary_title: "The Shawshank Redemption",
            start_year: 1994,
            genres: ["Drama"],
            avg_rating: "9.3",
            poster_path: "/poster.jpg",
          },
          availability: [],
        },
        {
          id: 2,
          watchlisted_at: "2025-01-02T10:00:00Z",
          watched_at: "2025-01-02T11:00:00Z",
          movie: {
            tconst: "tt0068646",
            primary_title: "The Godfather",
            start_year: 1972,
            genres: ["Crime", "Drama"],
            avg_rating: "9.2",
            poster_path: "/godfather.jpg",
          },
          availability: [],
        },
      ];

      // Set custom mock for this test BEFORE creating wrapper
      mockUseOnboardingStatus.mockReturnValueOnce({
        isLoading: false,
        isOnboardingComplete: false,
        requiredStep: null,
        progress: {
          hasPlatforms: true,
          hasWatchlistMovies: true,
          hasWatchedMovies: true,
        },
        profile: null,
        watchlistMovies: [],
        watchedMovies: existingWatchedMovies, // Custom watched movies for this test
      });

      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useOnboardingWatchedController(), {
        wrapper: Wrapper,
      });

      expect(result.current.viewModel.selected).toHaveLength(2);
      expect(result.current.viewModel.selected[0]).toEqual({
        tconst: "tt0111161",
        primary_title: "The Shawshank Redemption",
        start_year: 1994,
        genres: ["Drama"],
        poster_path: "/poster.jpg",
        avg_rating: "9.3",
        user_rating: undefined,
        userMovieId: 1,
        source: "preexisting_watched",
        status: "success",
      });
      expect(result.current.viewModel.selected[1]).toEqual({
        tconst: "tt0068646",
        primary_title: "The Godfather",
        start_year: 1972,
        genres: ["Crime", "Drama"],
        poster_path: "/godfather.jpg",
        avg_rating: "9.2",
        user_rating: undefined,
        userMovieId: 2,
        source: "preexisting_watched",
        status: "success",
      });
    });

    it("should limit prefilled movies to max 3", () => {
      const fourWatchedMovies: UserMovieDto[] = Array.from(
        { length: 4 },
        (_, i) => ({
          id: i + 1,
          watchlisted_at: `2025-01-0${i + 1}T10:00:00Z`,
          watched_at: `2025-01-0${i + 1}T11:00:00Z`,
          movie: {
            tconst: `tt000000${i + 1}`,
            primary_title: `Movie ${i + 1}`,
            start_year: 2000 + i,
            genres: ["Drama"],
            avg_rating: "8.0",
            poster_path: `/movie${i + 1}.jpg`,
          },
          availability: [],
        })
      );

      mockUseOnboardingStatus.mockReturnValue({
        isLoading: false,
        isOnboardingComplete: false,
        requiredStep: null,
        progress: {
          hasPlatforms: true,
          hasWatchlistMovies: true,
          hasWatchedMovies: true,
        },
        profile: null,
        watchlistMovies: [],
        watchedMovies: fourWatchedMovies,
      });

      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useOnboardingWatchedController(), {
        wrapper: Wrapper,
      });

      expect(result.current.viewModel.selected).toHaveLength(3);
    });
  });

  describe("pick() - guards", () => {
    it("should allow adding more than 3 movies", async () => {
      // Add 4 movies
      mockAddUserMovie.mockResolvedValue({
        ...mockUserMovieDto,
        watchlisted_at: null,
      });

      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useOnboardingWatchedController(), {
        wrapper: Wrapper,
      });

      // Add 4 movies
      await act(async () => {
        await result.current.pick({ ...mockMovie, tconst: "tt001" });
        await result.current.pick({ ...mockMovie, tconst: "tt002" });
        await result.current.pick({ ...mockMovie, tconst: "tt003" });
        await result.current.pick({ ...mockMovie, tconst: "tt004" });
      });

      expect(result.current.viewModel.selected).toHaveLength(4);
      expect(mockToast.info).not.toHaveBeenCalledWith(
        "Możesz oznaczyć maksymalnie 3 filmy"
      );
    });

    it("should not add duplicate movie", async () => {
      mockAddUserMovie.mockResolvedValue({
        ...mockUserMovieDto,
        watchlisted_at: null,
      });

      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useOnboardingWatchedController(), {
        wrapper: Wrapper,
      });

      // Add movie first time
      await act(async () => {
        await result.current.pick(mockMovie);
      });

      // Try to add same movie again - should show toast and not add
      await act(async () => {
        await result.current.pick(mockMovie);
      });

      expect(result.current.viewModel.selected).toHaveLength(1);
      expect(mockToast.info).toHaveBeenCalledWith(
        "Ten film został już wybrany"
      );
    });
  });

  describe("pick() - 409 conflict (already on watchlist)", () => {
    it("should handle 409 by looking up userMovieId from watchlist", async () => {
      // POST returns 409 (already exists)
      const conflictError = { status: 409 };
      mockAddUserMovie.mockRejectedValue(conflictError);

      // fetchUserMoviesSimpleList returns existing movie
      mockFetchUserMoviesSimpleList.mockResolvedValue([
        {
          ...mockUserMovieDto,
          watchlisted_at: "2025-01-01T10:00:00Z",
          watched_at: "2025-01-01T11:00:00Z", // Already watched
        },
      ]);

      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useOnboardingWatchedController(), {
        wrapper: Wrapper,
      });

      await act(async () => {
        await result.current.pick(mockMovie);
      });

      expect(mockFetchUserMoviesSimpleList).toHaveBeenCalledWith("watched");
      expect(result.current.viewModel.selected[0]).toMatchObject({
        tconst: "tt0111161",
        source: "preexisting_watched",
        status: "success",
        userMovieId: 123,
      });
      expect(mockToast.info).toHaveBeenCalledWith(
        '"The Shawshank Redemption" był już oznaczony jako obejrzany'
      );
    });

    it("should throw error if lookup fails after 409", async () => {
      // POST returns 409
      const conflictError = { status: 409 };
      mockAddUserMovie.mockRejectedValue(conflictError);

      // fetchUserMoviesSimpleList returns empty array (movie not found)
      mockFetchUserMoviesSimpleList.mockResolvedValue([]);

      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useOnboardingWatchedController(), {
        wrapper: Wrapper,
      });

      await act(async () => {
        await result.current.pick(mockMovie);
      });

      expect(result.current.viewModel.selected).toHaveLength(0); // Movie removed on error
      expect(mockToast.error).toHaveBeenCalledWith(
        "Nie znaleziono filmu na liście obejrzanych mimo 409"
      );
    });
  });

  describe("pick() - errors", () => {
    it("should remove movie from selected on error", async () => {
      mockAddUserMovie.mockRejectedValue(new Error("Network error"));

      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useOnboardingWatchedController(), {
        wrapper: Wrapper,
      });

      await act(async () => {
        await result.current.pick(mockMovie);
      });

      expect(result.current.viewModel.selected).toHaveLength(0);
      expect(mockToast.error).toHaveBeenCalledWith("Network error");
    });

    it("should handle network errors", async () => {
      mockAddUserMovie.mockRejectedValue(new Error("Network Error"));

      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useOnboardingWatchedController(), {
        wrapper: Wrapper,
      });

      await act(async () => {
        await result.current.pick(mockMovie);
      });

      expect(mockToast.error).toHaveBeenCalledWith("Network Error");
    });
  });

  describe("undo() - newly created", () => {
    it("should DELETE newly created movie", async () => {
      // First add a movie
      mockAddUserMovie.mockResolvedValue({
        ...mockUserMovieDto,
        watchlisted_at: null, // newly created
      });

      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useOnboardingWatchedController(), {
        wrapper: Wrapper,
      });

      // Add movie
      await act(async () => {
        await result.current.pick(mockMovie);
      });

      // Undo it
      mockDeleteUserMovie.mockResolvedValue(undefined);

      await act(async () => {
        await result.current.undo(result.current.viewModel.selected[0]);
      });

      expect(mockDeleteUserMovie).toHaveBeenCalledWith(123, expect.any(Object));
      expect(result.current.viewModel.selected).toHaveLength(0);
      expect(mockToast.success).toHaveBeenCalledWith(
        "Anulowano oznaczenie filmu"
      );
    });
  });

  describe("undo() - preexisting watchlist", () => {
    it("should PATCH restore_to_watchlist for preexisting movies", async () => {
      // Add movie that already exists on watchlist
      mockAddUserMovie.mockResolvedValue({
        ...mockUserMovieDto,
        watchlisted_at: "2025-01-01T10:00:00Z", // preexisting
      });

      mockPatchUserMovie.mockResolvedValue({
        ...mockUserMovieDto,
        watched_at: null, // restored
      });

      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useOnboardingWatchedController(), {
        wrapper: Wrapper,
      });

      // Add movie
      await act(async () => {
        await result.current.pick(mockMovie);
      });

      // Undo it
      await act(async () => {
        await result.current.undo(result.current.viewModel.selected[0]);
      });

      expect(mockPatchUserMovie).toHaveBeenCalledWith(123, {
        action: "restore_to_watchlist",
      });
      expect(result.current.viewModel.selected).toHaveLength(0);
      expect(mockToast.success).toHaveBeenCalledWith(
        "Film przywrócono do watchlisty"
      );
    });
  });

  describe("finish() & skip()", () => {
    it("should set onboardingComplete and navigate to next path", async () => {
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useOnboardingWatchedController(), {
        wrapper: Wrapper,
      });

      act(() => {
        result.current.finish();
      });

      expect(result.current.viewModel.isSubmitting).toBe(true);
      expect(mockToast.success).toHaveBeenCalledWith("Onboarding zakończony!");
      expect(mockGetNextOnboardingPath).toHaveBeenCalledWith(
        expect.objectContaining({
          hasPlatforms: true,
          hasWatchlistMovies: true,
          hasWatchedMovies: false,
        }),
        { fromStep: "watched" }
      );
      expect(navigateSpy).toHaveBeenCalledWith("/app", { replace: true });
    });

    it("should skip navigate without marking movies", async () => {
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useOnboardingWatchedController(), {
        wrapper: Wrapper,
      });

      act(() => {
        result.current.skip();
      });

      expect(result.current.viewModel.isSubmitting).toBe(true);
      expect(mockToast.success).not.toHaveBeenCalled();
      expect(mockGetNextOnboardingPath).toHaveBeenCalledWith(
        expect.objectContaining({
          hasPlatforms: true,
          hasWatchlistMovies: true,
          hasWatchedMovies: false,
        }),
        { fromStep: "watched" }
      );
      expect(navigateSpy).toHaveBeenCalledWith("/app", { replace: true });
    });
  });

  describe("pick() - happy path", () => {
    it("should add movie to selected with loading status", async () => {
      mockAddUserMovie.mockResolvedValue({
        ...mockUserMovieDto,
        watchlisted_at: null, // Not previously on watchlist - newly created
      });

      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useOnboardingWatchedController(), {
        wrapper: Wrapper,
      });

      await act(async () => {
        await result.current.pick(mockMovie);
      });

      expect(result.current.viewModel.selected).toHaveLength(1);
      expect(result.current.viewModel.selected[0]).toMatchObject({
        tconst: "tt0111161",
        primary_title: "The Shawshank Redemption",
        start_year: 1994,
        poster_path: "/poster.jpg",
        userMovieId: 123,
        source: "newly_created",
        status: "success",
      });
    });

    it("should call POST /api/user-movies with tconst and action=mark_as_watched", async () => {
      mockAddUserMovie.mockResolvedValue({
        ...mockUserMovieDto,
        watchlisted_at: null,
      });

      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useOnboardingWatchedController(), {
        wrapper: Wrapper,
      });

      await act(async () => {
        await result.current.pick(mockMovie);
      });

      expect(mockAddUserMovie).toHaveBeenCalledWith(
        {
          tconst: "tt0111161",
          action: "mark_as_watched",
        },
        expect.any(Object) // Additional mutation options
      );
      expect(mockAddUserMovie).toHaveBeenCalledTimes(1);
    });

    it("should handle successful movie addition with action=mark_as_watched", async () => {
      // POST with action="mark_as_watched" should handle everything in one call
      mockAddUserMovie.mockResolvedValue({
        ...mockUserMovieDto,
        watchlisted_at: null, // newly created
        watched_at: "2025-01-01T11:00:00Z", // already marked as watched by backend
      });

      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useOnboardingWatchedController(), {
        wrapper: Wrapper,
      });

      await act(async () => {
        await result.current.pick(mockMovie);
      });

      expect(mockAddUserMovie).toHaveBeenCalledWith(
        {
          tconst: "tt0111161",
          action: "mark_as_watched",
        },
        expect.any(Object)
      );
      // PATCH should not be called since POST handles mark_as_watched
      expect(mockPatchUserMovie).not.toHaveBeenCalled();
    });

    it("should show success toast after marking as watched", async () => {
      mockAddUserMovie.mockResolvedValue({
        ...mockUserMovieDto,
        watchlisted_at: "2025-01-01T10:00:00Z",
      });

      mockPatchUserMovie.mockResolvedValue({
        ...mockUserMovieDto,
        watched_at: "2025-01-01T11:00:00Z",
      });

      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useOnboardingWatchedController(), {
        wrapper: Wrapper,
      });

      await act(async () => {
        await result.current.pick(mockMovie);
      });

      expect(mockToast.success).toHaveBeenCalledWith(
        '"The Shawshank Redemption" oznaczono jako obejrzany'
      );
    });
  });
});
