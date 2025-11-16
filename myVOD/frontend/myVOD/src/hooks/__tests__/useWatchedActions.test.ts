import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRestoreToWatchlist } from '../useWatchedActions';
import type { UserMovieDto } from '@/types/api.types';
import type { UserMoviesInfiniteData } from '@/lib/userMoviesInfiniteUtils';

// Mock the API and toast
vi.mock('@/lib/api/movies', () => ({
  restoreUserMovie: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { restoreUserMovie } from '@/lib/api/movies';
import { toast } from 'sonner';

const mockRestoreUserMovie = vi.mocked(restoreUserMovie);
const mockToastSuccess = vi.mocked(toast.success);
const mockToastError = vi.mocked(toast.error);

const createInfiniteData = (
  movies: Array<Partial<UserMovieDto> & { id: number; movie: { primary_title: string } }>
): UserMoviesInfiniteData => ({
  pages: [
    {
      count: movies.length,
      next: null,
      previous: null,
      results: movies as UserMovieDto[],
    },
  ],
  pageParams: [1],
});

describe('useRestoreToWatchlist', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        mutations: {
          retry: false,
        },
      },
    });

    mockRestoreUserMovie.mockClear();
    mockToastSuccess.mockClear();
    mockToastError.mockClear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  it('should call restoreUserMovie with correct id', async () => {
    const mockResponse = {
      id: 1,
      movie: {
        primary_title: 'Test Movie',
      },
    };

    mockRestoreUserMovie.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useRestoreToWatchlist(), { wrapper });

    result.current.mutate(1);

    await waitFor(() => {
      expect(mockRestoreUserMovie).toHaveBeenCalledWith(1);
    });
  });

  it('should show success toast on successful restore', async () => {
    const mockResponse = {
      id: 1,
      movie: {
        primary_title: 'Test Movie',
      },
    };

    mockRestoreUserMovie.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useRestoreToWatchlist(), { wrapper });

    result.current.mutate(1);

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith('"Test Movie" został przywrócony do watchlisty');
    });
  });

  it('should show error toast on failure', async () => {
    const error = new Error('API Error');
    mockRestoreUserMovie.mockRejectedValue(error);

    const { result } = renderHook(() => useRestoreToWatchlist(), { wrapper });

    result.current.mutate(1);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Nie udało się przywrócić filmu. Spróbuj ponownie.');
    });
  });

  it('should optimistically remove movie from watched list', async () => {
    // Set up initial data
    const initialData = createInfiniteData([
      { id: 1, movie: { primary_title: 'Movie 1' } },
      { id: 2, movie: { primary_title: 'Movie 2' } },
    ]);
    queryClient.setQueryData(['user-movies', 'watched'], initialData);

    const mockResponse = {
      id: 1,
      movie: {
        primary_title: 'Movie 1',
      },
    };

    mockRestoreUserMovie.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useRestoreToWatchlist(), { wrapper });

    result.current.mutate(1);

    await waitFor(() => {
      const currentData = queryClient.getQueryData<UserMoviesInfiniteData>(['user-movies', 'watched']);
      expect(currentData?.pages[0]?.results.map((movie) => movie.id)).toEqual([2]);
    });
  });

  it('should rollback optimistic update on error', async () => {
    const originalData = createInfiniteData([
      { id: 1, movie: { primary_title: 'Movie 1' } },
      { id: 2, movie: { primary_title: 'Movie 2' } },
    ]);

    // Set up initial data
    queryClient.setQueryData(['user-movies', 'watched'], originalData);

    mockRestoreUserMovie.mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useRestoreToWatchlist(), { wrapper });

    result.current.mutate(1);

    // Should rollback to original data on error
    await waitFor(() => {
      const currentData = queryClient.getQueryData<UserMoviesInfiniteData>(['user-movies', 'watched']);
      expect(currentData).toEqual(originalData);
    });
  });

  it('should invalidate watched and watchlist queries on success', async () => {
    const mockResponse = {
      id: 1,
      movie: {
        primary_title: 'Test Movie',
      },
    };

    mockRestoreUserMovie.mockResolvedValue(mockResponse);

    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useRestoreToWatchlist(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(1);
    });

    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['user-movies', 'watched']
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['user-movies', 'watchlist']
      });
    });

    invalidateQueriesSpy.mockRestore();
  });

  it('should expose mutation state', () => {
    const { result } = renderHook(() => useRestoreToWatchlist(), { wrapper });

    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.isSuccess).toBe(false);
  });
});
