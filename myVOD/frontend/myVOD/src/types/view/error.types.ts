// Error View Types for MyVOD application

/**
 * Rodzaj błędu do ujednoliconej prezentacji
 */
export type ErrorKind =
  | 'not_found'
  | 'unauthorized'
  | 'offline'
  | 'api_generic'
  | 'suggestions_error';

export type ErrorAction = {
  id: 'login' | 'retry' | 'home' | 'watchlist' | 'refresh';
  label: string;
  variant?: 'primary' | 'secondary' | 'link';
  onClick?: () => void;
};

export type ErrorViewModel = {
  title: string;
  description: string;
  actions: ErrorAction[];
};

// Meta do komunikatów o dostępności (Watchmode)
export type AvailabilityMeta = {
  lastCheckedAt?: string; // ISO string, prezentowane jako „Stan z: [data]”
  source?: 'cache' | 'live' | 'unknown';
};

// Model dla banera fallbackowego
export type FallbackBannerModel = {
  message: string;
  meta?: AvailabilityMeta;
  variant?: 'info' | 'warning';
};
