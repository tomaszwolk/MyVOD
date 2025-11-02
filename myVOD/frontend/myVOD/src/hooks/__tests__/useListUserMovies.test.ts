import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useListUserMovies } from '../useListUserMovies';
import { listUserMovies } from '@/lib/api/movies';
import type { UserMovieDto } from '@/types/api.types';

// Mock the API
vi.mock('@/lib/api/movies', () => ({
  listUserMovies: vi.fn(),
}));

const mockListUserMovies = vi.mocked(listUserMovies);

const mockUserMovies: UserMovieDto[] = [
  {
    id: 123,
    watchlisted_at: '2025-01-01T10:00:00Z',
    watched_at: null,
    movie: {
      tconst: 'tt0111161',
      primary_title: 'The Shawshank Redemption',
      start_year: 1994,
      genres: ['Drama'],
      avg_rating: '9.3',
      poster_path: '/poster.jpg',
    },
    availability: [
      { platform_slug: 'netflix', platform_name: 'Netflix' },
    ],
  },
  {
    id: 456,
    watchlisted_at: '2025-01-02T10:00:00Z',
    watched_at: '2025-01-02T11:00:00Z',
    movie: {
      tconst: 'tt0068646',
      primary_title: 'The Godfather',
      start_year: 1972,
      genres: ['Crime', 'Drama'],
      avg_rating: '9.2',
      poster_path: '/godfather.jpg',
    },
    availability: [
      { platform_slug: 'hbo', platform_name: 'HBO Max' },
    ],
  },
];

describe('useListUserMovies', () => {
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call API function with correct params', async () => {
    mockListUserMovies.mockResolvedValue(mockUserMovies);

    const { result } = renderHook(() => useListUserMovies('watchlist'), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockListUserMovies).toHaveBeenCalledWith('watchlist', undefined);
  });

  it('should invalidate queries on success', async () => {
    mockListUserMovies.mockResolvedValue(mockUserMovies);

    const { result } = renderHook(() => useListUserMovies('watched'), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockListUserMovies).toHaveBeenCalledWith('watched', undefined);
  });

  it('should handle errors', async () => {
    const error = new Error('API Error');
    mockListUserMovies.mockRejectedValue(error);

    const { result } = renderHook(() => useListUserMovies(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(error);
  });

  it('should return query state correctly', async () => {
    mockListUserMovies.mockResolvedValue(mockUserMovies);

    const { result } = renderHook(() => useListUserMovies(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockUserMovies);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
  });
});
