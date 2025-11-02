import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePatchUserMovie } from '../usePatchUserMovie';
import { patchUserMovie } from '@/lib/api/movies';
import type { UserMovieDto, UpdateUserMovieCommand } from '@/types/api.types';

// Mock the API
vi.mock('@/lib/api/movies', () => ({
  patchUserMovie: vi.fn(),
}));

const mockPatchUserMovie = vi.mocked(patchUserMovie);

const mockUserMovieDto: UserMovieDto = {
  id: 123,
  watchlisted_at: '2025-01-01T10:00:00Z',
  watched_at: '2025-01-01T11:00:00Z',
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
};

describe('usePatchUserMovie', () => {
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
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    return { Wrapper, queryClient };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call API function with correct params', async () => {
    mockPatchUserMovie.mockResolvedValue(mockUserMovieDto);

    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => usePatchUserMovie(), { wrapper: Wrapper });

    const params = { id: 123, command: { action: 'mark_as_watched' } as UpdateUserMovieCommand };
    result.current.mutate(params);

    await waitFor(() => {
      expect(mockPatchUserMovie).toHaveBeenCalledWith(123, { action: 'mark_as_watched' });
    });
  });

  it('should invalidate queries on success', async () => {
    mockPatchUserMovie.mockResolvedValue(mockUserMovieDto);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => usePatchUserMovie(), { wrapper: Wrapper });

    result.current.mutate({ id: 123, command: { action: 'mark_as_watched' } });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['user-movies'],
    });
  });

  it('should handle errors', async () => {
    const error = new Error('API Error');
    mockPatchUserMovie.mockRejectedValue(error);

    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => usePatchUserMovie(), { wrapper: Wrapper });

    result.current.mutate({ id: 123, command: { action: 'mark_as_watched' } });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(error);
  });

  it('should return mutation state correctly', () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => usePatchUserMovie(), { wrapper: Wrapper });

    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.data).toBeUndefined();
  });
});
