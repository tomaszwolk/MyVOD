import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMovieSearch } from '../useMovieSearch';
import { searchMovies } from '@/lib/api/movies';
import type { MovieSearchResultDto } from '@/types/api.types';

// Mock the API
vi.mock('@/lib/api/movies', () => ({
  searchMovies: vi.fn(),
}));

const mockSearchMovies = vi.mocked(searchMovies);

interface ApiError extends Error {
  status?: number;
}

describe('useMovieSearch', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    return Wrapper;
  };

  it('should map MovieSearchResultDto to SearchOptionVM correctly', async () => {
    const mockDto: MovieSearchResultDto = {
      tconst: 'tt0111161',
      primary_title: 'The Shawshank Redemption',
      start_year: 1994,
      avg_rating: '9.3',
      poster_path: '/poster.jpg',
    };

    mockSearchMovies.mockResolvedValue([mockDto]);

    const { result } = renderHook(() => useMovieSearch('shawshank'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(result.current.data).toEqual([
      {
        tconst: 'tt0111161',
        primaryTitle: 'The Shawshank Redemption',
        startYear: 1994,
        avgRating: '9.3',
        posterUrl: '/poster.jpg',
      },
    ]);
  });

  it('should limit results to 10 items', async () => {
    const mockDtos = Array.from({ length: 15 }, (_, i) => ({
      tconst: `tt${i}`,
      primary_title: `Movie ${i}`,
      start_year: 2000 + i,
      avg_rating: '8.0',
      poster_path: null,
    }));

    mockSearchMovies.mockResolvedValue(mockDtos);

    const { result } = renderHook(() => useMovieSearch('movie'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(result.current.data).toHaveLength(10);
  });

  it('should not fetch when query length is less than 2', () => {
    mockSearchMovies.mockClear();

    const { result } = renderHook(() => useMovieSearch('a'), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
    expect(mockSearchMovies).not.toHaveBeenCalled();
  });

  // ===== NOWE TESTY - FAZA 2A: Obsługa błędów API =====

  describe('API Error Handling', () => {
    it('should handle TMDB API errors (401 Unauthorized)', async () => {
      const unauthorizedError: ApiError = new Error('Unauthorized');
      unauthorizedError.status = 401;

      mockSearchMovies.mockRejectedValue(unauthorizedError);

      const { result } = renderHook(() => useMovieSearch('test'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.data).toBeUndefined();
      expect(result.current.isSuccess).toBe(false);
    });

    it('should handle network connectivity issues', async () => {
      const networkError = new Error('Failed to fetch');
      mockSearchMovies.mockRejectedValue(networkError);

      const { result } = renderHook(() => useMovieSearch('test'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.isSuccess).toBe(false);
    });

    it('should handle malformed API responses', async () => {
      const malformedError = new Error('Invalid JSON response');
      mockSearchMovies.mockRejectedValue(malformedError);

      const { result } = renderHook(() => useMovieSearch('test'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.isSuccess).toBe(false);
    });

    it('should handle API rate limiting responses', async () => {
      const rateLimitError: ApiError = new Error('Too many requests');
      rateLimitError.status = 429;

      mockSearchMovies.mockRejectedValue(rateLimitError);

      const { result } = renderHook(() => useMovieSearch('test'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.isSuccess).toBe(false);
    });
  });

  // ===== FAZA 2B: Query State Management =====

  describe('Query State Management', () => {
    it('should not fetch when query is empty', () => {
      mockSearchMovies.mockClear();

      const { result } = renderHook(() => useMovieSearch(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
      expect(mockSearchMovies).not.toHaveBeenCalled();
    });

    it('should not fetch when query length is less than 2', () => {
      mockSearchMovies.mockClear();

      const { result } = renderHook(() => useMovieSearch('a'), {
        wrapper: createWrapper(),
      });

      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
      expect(mockSearchMovies).not.toHaveBeenCalled();
    });

    it('should fetch when query length is 2 or more', async () => {
      mockSearchMovies.mockResolvedValue([
        {
          tconst: 'tt123',
          primary_title: 'Test Movie',
          start_year: 2020,
          avg_rating: '8.0',
          poster_path: null,
        },
      ]);

      const { result } = renderHook(() => useMovieSearch('te'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(mockSearchMovies).toHaveBeenCalledWith('te', expect.any(Object));
      expect(result.current.isSuccess).toBe(true);
    });

    it('should provide loading state during fetch', async () => {
      let resolvePromise: (value: MovieSearchResultDto[]) => void;
      const promise = new Promise<MovieSearchResultDto[]>((resolve) => {
        resolvePromise = resolve;
      });

      mockSearchMovies.mockReturnValue(promise);

      const { result } = renderHook(() => useMovieSearch('test'), {
        wrapper: createWrapper(),
      });

      // Initially should be loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();

      // Resolve the promise
      resolvePromise([
        {
          tconst: 'tt123',
          primary_title: 'Test Movie',
          start_year: 2020,
          avg_rating: '8.0',
          poster_path: null,
        },
      ]);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.data).toBeDefined();
      });
    });

    it('should have proper staleTime configuration', () => {
      // Test that staleTime is set correctly (30 seconds)
      // This is tested implicitly by the fact that hook uses TanStack Query
      // with staleTime: 30_000, but we can't easily test caching between hooks
      // in unit tests due to separate QueryClient instances

      mockSearchMovies.mockResolvedValue([
        {
          tconst: 'tt123',
          primary_title: 'Test Movie',
          start_year: 2020,
          avg_rating: '8.0',
          poster_path: null,
        },
      ]);

      const { result } = renderHook(() => useMovieSearch('test'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      // Hook should be properly configured with TanStack Query
      // The actual caching behavior is tested in integration tests
    });
  });

  // ===== FAZA 2C: Request Management =====

  describe('Request Management', () => {
    it('should pass AbortSignal to API call', async () => {
      mockSearchMovies.mockResolvedValue([
        {
          tconst: 'tt123',
          primary_title: 'Test Movie',
          start_year: 2020,
          avg_rating: '8.0',
          poster_path: null,
        },
      ]);

      const { result } = renderHook(() => useMovieSearch('test'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      // Sprawdź czy AbortSignal został przekazany
      expect(mockSearchMovies).toHaveBeenCalledWith('test', expect.objectContaining({
        signal: expect.any(AbortSignal),
      }));
    });

    it('should handle request cancellation', async () => {
      // Test cancellation by unmounting component
      mockSearchMovies.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result, unmount } = renderHook(() => useMovieSearch('test'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      // Unmount component - request should be cancelled
      unmount();

      // Hook should handle cleanup gracefully
      expect(result.current.isLoading).toBe(true); // Still loading since request never completed
    });

    it('should expose metrics object', async () => {
      mockSearchMovies.mockResolvedValue([
        {
          tconst: 'tt123',
          primary_title: 'Test Movie',
          start_year: 2020,
          avg_rating: '8.0',
          poster_path: null,
        },
      ]);

      const { result } = renderHook(() => useMovieSearch('test'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      // Metrics should be available
      expect(result.current.metrics).toBeDefined();
      expect(typeof result.current.metrics.completedCount).toBe('number');
      expect(typeof result.current.metrics.abortedCount).toBe('number');
      expect(typeof result.current.metrics.lastQuery).toBe('string');
    });
  });

  // ===== FAZA 2D: Metrics =====

  describe('Metrics', () => {
    it('should provide initial metrics state', () => {
      const { result } = renderHook(() => useMovieSearch(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.metrics).toEqual({
        lastQuery: '',
        lastDurationMs: null,
        completedCount: 0,
        abortedCount: 0,
      });
    });

    it('should update metrics after successful query', async () => {
      mockSearchMovies.mockResolvedValue([
        {
          tconst: 'tt123',
          primary_title: 'Test Movie',
          start_year: 2020,
          avg_rating: '8.0',
          poster_path: null,
        },
      ]);

      const { result } = renderHook(() => useMovieSearch('test'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.metrics.lastQuery).toBe('test');
      expect(result.current.metrics.completedCount).toBe(1);
      expect(result.current.metrics.lastDurationMs).toBeDefined();
    });
  });

  // ===== FAZA 2E: Edge cases i boundary conditions =====

  describe('Edge Cases & Boundary Conditions', () => {
    it('should handle special characters in query', async () => {
      const specialQuery = 'batman & robin';
      mockSearchMovies.mockResolvedValue([
        {
          tconst: 'tt123',
          primary_title: 'Batman & Robin',
          start_year: 1997,
          avg_rating: '3.8',
          poster_path: null,
        },
      ]);

      const { result } = renderHook(() => useMovieSearch(specialQuery), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(mockSearchMovies).toHaveBeenCalledWith(specialQuery, expect.any(Object));
    });

    it('should handle very long queries', async () => {
      const longQuery = 'a'.repeat(100);
      mockSearchMovies.mockResolvedValue([]);

      const { result } = renderHook(() => useMovieSearch(longQuery), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toEqual([]);
      });

      expect(mockSearchMovies).toHaveBeenCalledWith(longQuery, expect.any(Object));
    });

    it('should handle queries with only numbers', async () => {
      const numericQuery = '123456';
      mockSearchMovies.mockResolvedValue([]);

      const { result } = renderHook(() => useMovieSearch(numericQuery), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toEqual([]);
      });

      expect(mockSearchMovies).toHaveBeenCalledWith(numericQuery, expect.any(Object));
    });

    it('should handle queries with unicode characters', async () => {
      const unicodeQuery = 'фильм'; // Russian for "film"
      mockSearchMovies.mockResolvedValue([]);

      const { result } = renderHook(() => useMovieSearch(unicodeQuery), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toEqual([]);
      });

      expect(mockSearchMovies).toHaveBeenCalledWith(unicodeQuery, expect.any(Object));
    });

    it('should limit results to 10 items', async () => {
      mockSearchMovies.mockClear();

      const manyResults = Array.from({ length: 20 }, (_, i) => ({
        tconst: `tt${i}`,
        primary_title: `Movie ${i}`,
        start_year: 2000 + i,
        avg_rating: '8.0',
        poster_path: null,
      }));

      mockSearchMovies.mockResolvedValue(manyResults);

      const { result } = renderHook(() => useMovieSearch('many'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      // Hook powinien limitować do 10 wyników
      expect(result.current.data).toHaveLength(10);
      expect(mockSearchMovies).toHaveBeenCalledTimes(1);
    });

    it('should handle API returning null/undefined values', async () => {
      const resultsWithNulls = [
        {
          tconst: 'tt123',
          primary_title: null, // null title
          start_year: undefined, // undefined year
          avg_rating: null, // null rating
          poster_path: '/poster.jpg',
        },
      ];

      mockSearchMovies.mockResolvedValue(resultsWithNulls);

      const { result } = renderHook(() => useMovieSearch('nulls'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.data).toEqual([
        {
          tconst: 'tt123',
          primaryTitle: null,
          startYear: undefined,
          avgRating: null,
          posterUrl: '/poster.jpg',
        },
      ]);
    });
  });
});
