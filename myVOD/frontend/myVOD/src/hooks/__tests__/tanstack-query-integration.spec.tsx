import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { logGeminiError, logWatchmodeError } from '@/utils/error-logger';

// Mock the error logger functions
vi.mock('@/utils/error-logger', () => ({
  logGeminiError: vi.fn(),
  logWatchmodeError: vi.fn(),
}));

describe('TanStack Query Integration - Global Error Handling', () => {
  let queryClient: QueryClient;
  const logGeminiErrorMock = vi.mocked(logGeminiError);
  const logWatchmodeErrorMock = vi.mocked(logWatchmodeError);

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a fresh QueryClient with the same configuration as in main.tsx
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          refetchOnWindowFocus: false,
          retry: 1,
          onError: (error: Error, query: any) => {
            const meta = query.meta as any;

            // Log integration errors
            if (meta?.integration) {
              if (meta.integration === 'gemini') {
                logGeminiError(meta.operation || 'unknown', error, {
                  queryKey: query.queryKey,
                });
              } else if (meta.integration === 'watchmode') {
                logWatchmodeError(meta.operation || 'unknown', error, {
                  queryKey: query.queryKey,
                });
              }
            }
          },
        },
        mutations: {
          onError: (error: Error, variables: any, context: any, mutation: any) => {
            const meta = mutation.meta as any;

            // Log integration errors
            if (meta?.integration) {
              if (meta.integration === 'gemini') {
                logGeminiError(meta.operation || 'unknown', error, {
                  queryKey: mutation.mutationKey,
                  variables,
                });
              } else if (meta.integration === 'watchmode') {
                logWatchmodeError(meta.operation || 'unknown', error, {
                  queryKey: mutation.mutationKey,
                  variables,
                });
              }
            }
          },
        },
      },
    });
  });

  describe('Query Error Handling', () => {
    it('should call global onError for queries', async () => {
      const testError = new Error('Query failed');
      const query = {
        meta: { integration: 'gemini', operation: 'generate_recommendations' },
        queryKey: ['recommendations', 'test'],
      };

      // Simulate query error
      const onError = queryClient.getDefaultOptions().queries?.onError;
      onError?.(testError, query);

      expect(logGeminiErrorMock).toHaveBeenCalledWith(
        'generate_recommendations',
        testError,
        { queryKey: ['recommendations', 'test'] }
      );
    });

    it('should call global onError for mutations', async () => {
      const testError = new Error('Mutation failed');
      const mutation = {
        meta: { integration: 'watchmode', operation: 'add_to_watchlist' },
        mutationKey: ['watchlist'],
      };
      const variables = { movieId: 123 };

      // Simulate mutation error
      const onError = queryClient.getDefaultOptions().mutations?.onError;
      onError?.(testError, variables, null, mutation);

      expect(logWatchmodeErrorMock).toHaveBeenCalledWith(
        'add_to_watchlist',
        testError,
        { queryKey: ['watchlist'], variables }
      );
    });

    it('should log integration errors with meta', () => {
      const testError = new Error('API timeout');
      const query = {
        meta: { integration: 'gemini', operation: 'generate_suggestions' },
        queryKey: ['suggestions', { userId: 456 }],
      };

      const onError = queryClient.getDefaultOptions().queries?.onError;
      onError?.(testError, query);

      expect(logGeminiErrorMock).toHaveBeenCalledWith(
        'generate_suggestions',
        testError,
        { queryKey: ['suggestions', { userId: 456 }] }
      );
    });

    it('should handle TMDB errors', () => {
      // Note: TMDB errors are not handled by global handler in current implementation
      // They are handled directly in components using logTMDBImageError
      const testError = new Error('TMDB API error');
      const query = {
        meta: { integration: 'tmdb', operation: 'search_movies' },
        queryKey: ['movies', 'search'],
      };

      const onError = queryClient.getDefaultOptions().queries?.onError;
      onError?.(testError, query);

      // TMDB is not handled by global handler, so no calls should be made
      expect(logGeminiErrorMock).not.toHaveBeenCalled();
      expect(logWatchmodeErrorMock).not.toHaveBeenCalled();
    });

    it('should handle Gemini errors', () => {
      const testError = new Error('Gemini API quota exceeded');
      const mutation = {
        meta: { integration: 'gemini', operation: 'generate_recommendations' },
        mutationKey: ['recommendations'],
      };

      const onError = queryClient.getDefaultOptions().mutations?.onError;
      onError?.(testError, {}, null, mutation);

      expect(logGeminiErrorMock).toHaveBeenCalledWith(
        'generate_recommendations',
        testError,
        { queryKey: ['recommendations'], variables: {} }
      );
    });

    it('should handle Watchmode errors', () => {
      const testError = new Error('Watchmode service unavailable');
      const query = {
        meta: { integration: 'watchmode', operation: 'get_movie_sources' },
        queryKey: ['sources', 123],
      };

      const onError = queryClient.getDefaultOptions().queries?.onError;
      onError?.(testError, query);

      expect(logWatchmodeErrorMock).toHaveBeenCalledWith(
        'get_movie_sources',
        testError,
        { queryKey: ['sources', 123] }
      );
    });

    it('should use default operation when meta.operation is missing', () => {
      const testError = new Error('Unknown operation error');
      const query = {
        meta: { integration: 'gemini' }, // no operation specified
        queryKey: ['unknown'],
      };

      const onError = queryClient.getDefaultOptions().queries?.onError;
      onError?.(testError, query);

      expect(logGeminiErrorMock).toHaveBeenCalledWith(
        'unknown', // default value
        testError,
        { queryKey: ['unknown'] }
      );
    });

    it('should not log errors without integration meta', () => {
      const testError = new Error('Regular error');
      const query = {
        meta: {}, // no integration
        queryKey: ['regular-query'],
      };

      const onError = queryClient.getDefaultOptions().queries?.onError;
      onError?.(testError, query);

      expect(logGeminiErrorMock).not.toHaveBeenCalled();
      expect(logWatchmodeErrorMock).not.toHaveBeenCalled();
    });

    it('should not log errors with unknown integration', () => {
      const testError = new Error('Unknown integration error');
      const query = {
        meta: { integration: 'unknown-service', operation: 'test' },
        queryKey: ['unknown'],
      };

      const onError = queryClient.getDefaultOptions().queries?.onError;
      onError?.(testError, query);

      expect(logGeminiErrorMock).not.toHaveBeenCalled();
      expect(logWatchmodeErrorMock).not.toHaveBeenCalled();
    });
  });
});
