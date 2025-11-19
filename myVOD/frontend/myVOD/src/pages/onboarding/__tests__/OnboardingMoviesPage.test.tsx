import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { OnboardingMoviesPage } from "../OnboardingMoviesPage";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAddUserMovie } from "@/hooks/useAddUserMovie";
import { useRateMovie } from "@/hooks/useRateMovie";

// --- MOCKS ---

vi.mock("@/hooks/useAddUserMovie", () => ({
  useAddUserMovie: vi.fn(),
}));
vi.mock("@/hooks/useRateMovie", () => ({
  useRateMovie: vi.fn(),
}));

// Mock onboarding components
vi.mock("@/components/onboarding/OnboardingLayout", () => ({
  OnboardingLayout: ({
    children,
    title,
  }: {
    children: React.ReactNode;
    title: string;
  }) => (
    <div data-testid="onboarding-layout" data-title={title}>
      {children}
    </div>
  ),
}));

vi.mock("@/components/onboarding/ProgressBar", () => ({
  ProgressBar: ({ current, total }: { current: number; total: number }) => (
    <div data-testid="progress-bar" data-current={current} data-total={total} />
  ),
}));

vi.mock("@/components/onboarding/OnboardingHeader", () => ({
  OnboardingHeader: ({ title, hint }: { title: string; hint: string }) => (
    <div data-testid="onboarding-header">
      <h1>{title}</h1>
      <p>{hint}</p>
    </div>
  ),
}));

vi.mock("@/components/onboarding/MovieSearchCombobox", () => ({
  MovieSearchCombobox: ({
    onAddToWatchlist,
    onMarkAsWatched,
    onRate,
  }: {
    onAddToWatchlist: (movie: any) => void;
    onMarkAsWatched: (movie: any) => void;
    onRate: (movie: any) => void;
  }) => (
    <div data-testid="movie-search-combobox">
      <button
        onClick={() =>
          onAddToWatchlist({
            tconst: "tt0111161",
            primaryTitle: "The Shawshank Redemption",
          })
        }
      >
        Add to Watchlist
      </button>
      <button
        onClick={() =>
          onMarkAsWatched({
            tconst: "tt0111162",
            primaryTitle: "The Godfather",
          })
        }
      >
        Mark as Watched
      </button>
      <button
        onClick={() =>
          onRate({ tconst: "tt0111163", primaryTitle: "The Dark Knight" })
        }
      >
        Rate Movie
      </button>
    </div>
  ),
}));

vi.mock("@/components/onboarding/AddedMoviesList", () => ({
  AddedMoviesList: ({ items }: { items: any[] }) => (
    <div data-testid="added-movies-list" data-item-count={items.length}>
      Added Movies List
    </div>
  ),
}));

vi.mock("@/components/onboarding/OnboardingFooterNav", () => ({
  OnboardingFooterNav: () => (
    <div data-testid="onboarding-footer-nav">Footer Navigation</div>
  ),
}));

vi.mock("@/components/watched/RatingModal", () => ({
  RatingModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="rating-modal">Rating Modal</div> : null,
}));

// --- TEST SETUP ---

const mockAddUserMovie = vi.fn();
const mockRateMovie = vi.fn();

vi.mocked(useAddUserMovie).mockReturnValue({
  mutateAsync: mockAddUserMovie,
} as any);

vi.mocked(useRateMovie).mockReturnValue({
  mutateAsync: mockRateMovie,
} as any);

describe("OnboardingMoviesPage", () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render all required components", () => {
    render(<OnboardingMoviesPage />, { wrapper: createWrapper() });

    expect(screen.getByTestId("onboarding-layout")).toBeInTheDocument();
    expect(screen.getByTestId("progress-bar")).toBeInTheDocument();
    expect(screen.getByTestId("onboarding-header")).toBeInTheDocument();
    expect(screen.getByTestId("movie-search-combobox")).toBeInTheDocument();
    expect(screen.getByTestId("added-movies-list")).toBeInTheDocument();
    expect(screen.getByTestId("onboarding-footer-nav")).toBeInTheDocument();
  });

  it("should display correct title and progress", () => {
    render(<OnboardingMoviesPage />, { wrapper: createWrapper() });

    const layout = screen.getByTestId("onboarding-layout");
    expect(layout).toHaveAttribute("data-title", "Dodaj lub oznacz filmy");

    const progressBar = screen.getByTestId("progress-bar");
    expect(progressBar).toHaveAttribute("data-current", "2");
    expect(progressBar).toHaveAttribute("data-total", "2");
  });

  describe("User Interactions", () => {
    it("should call addUserMovie mutation when adding to watchlist", async () => {
      mockAddUserMovie.mockResolvedValueOnce({
        movie: { primary_title: "Test" },
      });
      render(<OnboardingMoviesPage />, { wrapper: createWrapper() });

      const addToWatchlistButton = screen.getByText("Add to Watchlist");
      fireEvent.click(addToWatchlistButton);

      expect(mockAddUserMovie).toHaveBeenCalledWith({
        tconst: "tt0111161",
      });
    });

    it("should call addUserMovie mutation with correct action when marking as watched", async () => {
      mockAddUserMovie.mockResolvedValueOnce({
        movie: { primary_title: "Test" },
      });
      render(<OnboardingMoviesPage />, { wrapper: createWrapper() });

      const markAsWatchedButton = screen.getByText("Mark as Watched");
      fireEvent.click(markAsWatchedButton);

      expect(mockAddUserMovie).toHaveBeenCalledWith({
        tconst: "tt0111162",
        action: "mark_as_watched",
      });
    });

    it("should open rating modal when rating a movie", async () => {
      render(<OnboardingMoviesPage />, { wrapper: createWrapper() });

      const rateMovieButton = screen.getByText("Rate Movie");
      fireEvent.click(rateMovieButton);

      expect(screen.getByTestId("rating-modal")).toBeInTheDocument();
    });
  });
});
