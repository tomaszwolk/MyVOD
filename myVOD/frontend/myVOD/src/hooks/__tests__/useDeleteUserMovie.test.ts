import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDeleteUserMovie } from '../useDeleteUserMovie';
import { deleteUserMovie } from '@/lib/api/movies';

// Mock the API
vi.mock('@/lib/api/movies', () => ({
  deleteUserMovie: vi.fn(),
}));

const mockDeleteUserMovie = vi.mocked(deleteUserMovie);

describe('useDeleteUserMovie', () => {
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
    mockDeleteUserMovie.mockResolvedValue(undefined);

    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useDeleteUserMovie(), { wrapper: Wrapper });

    result.current.mutate(123);

    await waitFor(() => {
      expect(mockDeleteUserMovie).toHaveBeenCalledWith(123);
    });
  });

  it('should invalidate queries on success', async () => {
    mockDeleteUserMovie.mockResolvedValue(undefined);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteUserMovie(), { wrapper: Wrapper });

    result.current.mutate(123);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['user-movies'],
    });
  });

  it('should handle errors', async () => {
    const error = new Error('API Error');
    mockDeleteUserMovie.mockRejectedValue(error);

    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useDeleteUserMovie(), { wrapper: Wrapper });

    result.current.mutate(123);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(error);
  });

  it('should return mutation state correctly', () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useDeleteUserMovie(), { wrapper: Wrapper });

    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.data).toBeUndefined();
  });
});
