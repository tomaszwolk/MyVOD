import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAddUserMovie } from "../useAddUserMovie";
import { addUserMovie } from "@/lib/api/movies";
import type { UserMovieDto, AddUserMovieCommand } from "@/types/api.types";

// Mock the API
vi.mock("@/lib/api/movies", () => ({
  addUserMovie: vi.fn(),
}));

const mockAddUserMovie = vi.mocked(addUserMovie);

const mockUserMovieDto: UserMovieDto = {
  id: 123,
  watchlisted_at: "2025-01-01T10:00:00Z",
  watched_at: null,
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

describe("useAddUserMovie", () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
          retry: false,
        },
      },
    });

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    return { Wrapper, queryClient };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return the user movie data on successful mutation", async () => {
    mockAddUserMovie.mockResolvedValue(mockUserMovieDto);

    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useAddUserMovie(), {
      wrapper: Wrapper,
    });

    result.current.mutate({ tconst: "tt0111161" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockUserMovieDto);
  });

  it("should call addUserMovie API with correct parameters", async () => {
    mockAddUserMovie.mockResolvedValue(mockUserMovieDto);

    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useAddUserMovie(), {
      wrapper: Wrapper,
    });

    const command: AddUserMovieCommand = { tconst: "tt0111161" };
    result.current.mutate(command);

    await waitFor(() => {
      expect(mockAddUserMovie).toHaveBeenCalledWith(command, expect.anything());
    });
    expect(mockAddUserMovie).toHaveBeenCalledTimes(1);
  });

  it("should invalidate user-movies queries on success", async () => {
    mockAddUserMovie.mockResolvedValue(mockUserMovieDto);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useAddUserMovie(), {
      wrapper: Wrapper,
    });

    const command: AddUserMovieCommand = {
      tconst: "tt0111161",
      action: "mark_as_watched",
    };
    result.current.mutate(command);

    await waitFor(() => {
      expect(mockAddUserMovie).toHaveBeenCalledWith(command, expect.anything());
    });
  });

  it("should handle 409 Conflict error", async () => {
    const conflictError = {
      response: {
        status: 409,
        data: { detail: "Movie already in watchlist" },
      },
    };
    mockAddUserMovie.mockRejectedValue(conflictError);

    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useAddUserMovie(), {
      wrapper: Wrapper,
    });

    result.current.mutate({ tconst: "tt0111161" });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(conflictError);
  });

  it("should handle 400 Bad Request error", async () => {
    const badRequestError = {
      response: {
        status: 400,
        data: { tconst: ["Invalid tconst format"] },
      },
    };
    mockAddUserMovie.mockRejectedValue(badRequestError);

    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useAddUserMovie(), {
      wrapper: Wrapper,
    });

    result.current.mutate({ tconst: "invalid" });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(badRequestError);
  });

  it("should handle 5xx Server Error", async () => {
    const serverError = {
      response: {
        status: 500,
        data: { detail: "Internal server error" },
      },
    };
    mockAddUserMovie.mockRejectedValue(serverError);

    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useAddUserMovie(), {
      wrapper: Wrapper,
    });

    result.current.mutate({ tconst: "tt0111161" });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(serverError);
  });

  it("should handle network errors", async () => {
    const networkError = new Error("Network Error");
    mockAddUserMovie.mockRejectedValue(networkError);

    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useAddUserMovie(), {
      wrapper: Wrapper,
    });

    result.current.mutate({ tconst: "tt0111161" });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(networkError);
  });

  it("should support mark_as_watched parameter", async () => {
    mockAddUserMovie.mockResolvedValue({
      ...mockUserMovieDto,
      watched_at: "2025-01-01T11:00:00Z",
    });

    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useAddUserMovie(), {
      wrapper: Wrapper,
    });

    const command: AddUserMovieCommand = {
      tconst: "tt0111161",
      mark_as_watched: true,
    };
    result.current.mutate(command);

    await waitFor(() => {
      expect(mockAddUserMovie).toHaveBeenCalledWith(command, expect.anything());
    });
  });

  it("should return mutation state correctly", () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useAddUserMovie(), {
      wrapper: Wrapper,
    });

    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it("should return correct data for a different movie", async () => {
    const differentMovie: UserMovieDto = {
      ...mockUserMovieDto,
      id: 456,
      movie: {
        ...mockUserMovieDto.movie,
        tconst: "tt0068646",
        primary_title: "The Godfather",
        start_year: 1972,
        poster_path: null,
      },
    };

    mockAddUserMovie.mockResolvedValue(differentMovie);

    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useAddUserMovie(), {
      wrapper: Wrapper,
    });

    result.current.mutate({ tconst: "tt0068646" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(differentMovie);
  });
});
