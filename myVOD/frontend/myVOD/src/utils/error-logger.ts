/**
 * Error logging utilities for integration monitoring
 */

export type IntegrationType = 'tmdb' | 'watchmode' | 'gemini';

export interface IntegrationError {
  integration: IntegrationType;
  operation: string;
  error: unknown;
  context?: Record<string, unknown>;
}

/**
 * Logs integration errors to console for admin monitoring.
 * In production, this could be extended to send logs to monitoring services.
 */
export function logIntegrationError(error: IntegrationError) {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    level: 'error',
    integration: error.integration,
    operation: error.operation,
    error: error.error,
    context: error.context,
  };

  // Log to console for admin monitoring
  console.error('Integration Error:', logData);

  // In future: send to monitoring service like Sentry, LogRocket, etc.
  // Example: monitoringService.captureException(error.error, { extra: logData });
}

/**
 * Helper function for TMDB image loading errors
 */
export function logTMDBImageError(src: string, alt: string, context?: Record<string, unknown>) {
  logIntegrationError({
    integration: 'tmdb',
    operation: 'image_load',
    error: new Error(`Failed to load TMDB image: ${src}`),
    context: {
      imageSrc: src,
      alt,
      ...context,
    },
  });
}

/**
 * Helper function for Watchmode API errors
 */
export function logWatchmodeError(operation: string, error: unknown, context?: Record<string, unknown>) {
  logIntegrationError({
    integration: 'watchmode',
    operation,
    error,
    context,
  });
}

/**
 * Helper function for Gemini API errors
 */
export function logGeminiError(operation: string, error: unknown, context?: Record<string, unknown>) {
  logIntegrationError({
    integration: 'gemini',
    operation,
    error,
    context,
  });
}
