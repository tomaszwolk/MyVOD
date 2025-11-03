import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  logIntegrationError,
  logTMDBImageError,
  logWatchmodeError,
  logGeminiError,
  type IntegrationError,
  type IntegrationType,
} from '../error-logger';

describe('error-logger', () => {
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleErrorSpy.mockClear();
  });

  describe('logIntegrationError', () => {
    it('should log correct structure for TMDB error', () => {
      const error: IntegrationError = {
        integration: 'tmdb',
        operation: 'search_movies',
        error: new Error('API timeout'),
        context: { query: 'batman' },
      };

      logIntegrationError(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Integration Error:', {
        timestamp: expect.any(String),
        level: 'error',
        integration: 'tmdb',
        operation: 'search_movies',
        error: new Error('API timeout'),
        context: { query: 'batman' },
      });
    });

    it('should log correct structure for Watchmode error', () => {
      const error: IntegrationError = {
        integration: 'watchmode',
        operation: 'get_movie_details',
        error: 'Network error',
        context: { movieId: 123 },
      };

      logIntegrationError(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Integration Error:', {
        timestamp: expect.any(String),
        level: 'error',
        integration: 'watchmode',
        operation: 'get_movie_details',
        error: 'Network error',
        context: { movieId: 123 },
      });
    });

    it('should handle errors without context', () => {
      const error: IntegrationError = {
        integration: 'gemini',
        operation: 'generate_recommendations',
        error: new Error('Invalid API key'),
      };

      logIntegrationError(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Integration Error:', {
        timestamp: expect.any(String),
        level: 'error',
        integration: 'gemini',
        operation: 'generate_recommendations',
        error: new Error('Invalid API key'),
        context: undefined,
      });
    });

    it('should include error message in log', () => {
      const testError = new Error('Test error message');
      const error: IntegrationError = {
        integration: 'tmdb',
        operation: 'test',
        error: testError,
      };

      logIntegrationError(error);

      const loggedData = consoleErrorSpy.mock.calls[0][1];
      expect(loggedData.error).toBe(testError);
      expect(loggedData.error.message).toBe('Test error message');
    });

    it('should include context data in log', () => {
      const context = { userId: 456, sessionId: 'abc123' };
      const error: IntegrationError = {
        integration: 'watchmode',
        operation: 'test',
        error: 'Test error',
        context,
      };

      logIntegrationError(error);

      const loggedData = consoleErrorSpy.mock.calls[0][1];
      expect(loggedData.context).toBe(context);
    });

    it('should handle Error objects', () => {
      const testError = new Error('Test error with stack trace');
      testError.stack = 'Mock stack trace';

      const error: IntegrationError = {
        integration: 'gemini',
        operation: 'test',
        error: testError,
      };

      logIntegrationError(error);

      const loggedData = consoleErrorSpy.mock.calls[0][1];
      expect(loggedData.error).toBe(testError);
      expect(loggedData.error.stack).toBe('Mock stack trace');
    });

    it('should handle string errors', () => {
      const error: IntegrationError = {
        integration: 'tmdb',
        operation: 'test',
        error: 'Simple string error',
      };

      logIntegrationError(error);

      const loggedData = consoleErrorSpy.mock.calls[0][1];
      expect(loggedData.error).toBe('Simple string error');
    });

    it('should handle unknown error types', () => {
      const error: IntegrationError = {
        integration: 'watchmode',
        operation: 'test',
        error: { customError: true, code: 500 },
      };

      logIntegrationError(error);

      const loggedData = consoleErrorSpy.mock.calls[0][1];
      expect(loggedData.error).toEqual({ customError: true, code: 500 });
    });

    it('should use correct timestamp format', () => {
      const beforeLog = new Date();
      const error: IntegrationError = {
        integration: 'tmdb',
        operation: 'test',
        error: 'test',
      };

      logIntegrationError(error);

      const afterLog = new Date();
      const loggedData = consoleErrorSpy.mock.calls[0][1];

      // Check that timestamp is a valid ISO string
      expect(loggedData.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

      // Check that timestamp is between before and after
      const loggedTime = new Date(loggedData.timestamp);
      expect(loggedTime.getTime()).toBeGreaterThanOrEqual(beforeLog.getTime() - 1000); // Allow 1s tolerance
      expect(loggedTime.getTime()).toBeLessThanOrEqual(afterLog.getTime() + 1000);
    });
  });

  describe('logTMDBImageError', () => {
    it('should call logIntegrationError with correct structure', () => {
      const src = 'https://image.tmdb.org/t/p/w500/test.jpg';
      const alt = 'Test movie poster';
      const context = { movieId: 123 };

      logTMDBImageError(src, alt, context);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Integration Error:', {
        timestamp: expect.any(String),
        level: 'error',
        integration: 'tmdb',
        operation: 'image_load',
        error: expect.any(Error),
        context: {
          imageSrc: src,
          alt,
          movieId: 123,
        },
      });

      const loggedData = consoleErrorSpy.mock.calls[0][1];
      expect(loggedData.error).toBeInstanceOf(Error);
      expect(loggedData.error.message).toBe(`Failed to load TMDB image: ${src}`);
    });
  });

  describe('logWatchmodeError', () => {
    it('should call logIntegrationError with correct structure', () => {
      const operation = 'get_movie_sources';
      const error = new Error('API rate limit exceeded');
      const context = { movieId: 456 };

      logWatchmodeError(operation, error, context);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Integration Error:', {
        timestamp: expect.any(String),
        level: 'error',
        integration: 'watchmode',
        operation,
        error,
        context,
      });
    });
  });

  describe('logGeminiError', () => {
    it('should call logIntegrationError with correct structure', () => {
      const operation = 'generate_recommendations';
      const error = 'Invalid prompt format';
      const context = { userQuery: 'movies like Inception' };

      logGeminiError(operation, error, context);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Integration Error:', {
        timestamp: expect.any(String),
        level: 'error',
        integration: 'gemini',
        operation,
        error,
        context,
      });
    });
  });
});
