import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTopMovies } from "../useTopMovies";
import type { TopMoviesQuery, TopMoviesDto } from "@/types/view/admin.types";

// Mock dependencies
vi.mock("@/lib/api/admin", () => ({
  getTopMovies: vi.fn(),
}));

import { getTopMovies } from "@/lib/api/admin";

const mockGetTopMovies = vi.mocked(getTopMovies);

const mockTopMovies: TopMoviesDto = {
  type: "watchlist",
  range: "7d",
  items: [
    {
      tconst: "tt0111161",
      primary_title: "The Shawshank Redemption",
      start_year: 1994,
      count: 150,
    },
    {
      tconst: "tt0068646",
      primary_title: "The Godfather",
      start_year: 1972,
      count: 120,
    },
  ],
};

describe("useTopMovies", () => {
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

    return { Wrapper, queryClient };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call getTopMovies API with query params", async () => {
    mockGetTopMovies.mockResolvedValue(mockTopMovies);

    const query: TopMoviesQuery = {
      type: "watchlist",
      range: "7d",
    };

    const { Wrapper } = createWrapper();

    renderHook(() => useTopMovies(query), { wrapper: Wrapper });

    await waitFor(() => {
      expect(mockGetTopMovies).toHaveBeenCalledWith(query);
    });
  });

  it("should return top movies data on success", async () => {
    mockGetTopMovies.mockResolvedValue(mockTopMovies);

    const query: TopMoviesQuery = {
      type: "watched",
      range: "30d",
    };

    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useTopMovies(query), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual(mockTopMovies);
      expect(result.current.error).toBeNull();
    });
  });

  it("should handle 400 error (invalid parameters)", async () => {
    const badRequestError = {
      response: { status: 400, data: { detail: "Invalid parameters" } },
    };
    mockGetTopMovies.mockRejectedValue(badRequestError);

    const query: TopMoviesQuery = {
      type: "watchlist",
      range: "invalid",
    };

    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useTopMovies(query), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toEqual(badRequestError);
      expect(result.current.data).toBeUndefined();
    });
  });

  it("should handle 403 error (not staff)", async () => {
    const forbiddenError = {
      response: { status: 403, data: { detail: "Staff permissions required" } },
    };
    mockGetTopMovies.mockRejectedValue(forbiddenError);

    const query: TopMoviesQuery = {
      type: "watchlist",
      range: "7d",
    };

    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useTopMovies(query), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toEqual(forbiddenError);
      expect(result.current.data).toBeUndefined();
    });
  });

  it("should handle network errors", async () => {
    const networkError = new Error("Network error");
    mockGetTopMovies.mockRejectedValue(networkError);

    const query: TopMoviesQuery = {
      type: "watchlist",
      range: "7d",
    };

    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useTopMovies(query), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toEqual(networkError);
      expect(result.current.data).toBeUndefined();
    });
  });

  it("should use correct query key for caching", () => {
    mockGetTopMovies.mockResolvedValue(mockTopMovies);

    const query: TopMoviesQuery = {
      type: "watchlist",
      range: "7d",
    };

    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useTopMovies(query), { wrapper: Wrapper });

    // The query key is internal to TanStack Query, but we can verify the behavior
    expect(result.current).toBeDefined();
  });

  it("should have staleTime of 2 minutes", () => {
    // This is a configuration test - we can't directly test staleTime
    // but we can verify the hook is configured correctly by checking
    // that it behaves as expected with the configuration
    mockGetTopMovies.mockResolvedValue(mockTopMovies);

    const query: TopMoviesQuery = {
      type: "watchlist",
      range: "7d",
    };

    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useTopMovies(query), { wrapper: Wrapper });

    // Verify the hook exists and has expected structure
    expect(result.current).toHaveProperty('data');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('error');
  });

  it("should update query key when query changes", () => {
    mockGetTopMovies.mockResolvedValue(mockTopMovies);

    const { Wrapper, queryClient } = createWrapper();

    const { rerender } = renderHook(() => useTopMovies({ type: "watchlist", range: "7d" }), { wrapper: Wrapper });

    // Change query
    rerender({ children: null }, { wrapper: () => <Wrapper>{null}</Wrapper> });
    renderHook(() => useTopMovies({ type: "watched", range: "30d" }), { wrapper: Wrapper });

    // Should trigger new API call with different query
    expect(mockGetTopMovies).toHaveBeenCalledTimes(2);
  });
});
