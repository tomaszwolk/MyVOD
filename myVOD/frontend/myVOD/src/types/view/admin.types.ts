import type React from 'react';

// Admin Dashboard Types

/**
 * Admin metrics DTO returned from GET /admin/analytics/api/metrics/
 */
export type AdminMetricsDto = {
  total_users?: number | null;
  new_users?: {
    today?: number | null;
    last_7_days?: number | null;
    last_30_days?: number | null;
  } | null;
  retention_7d_percent?: number | null;
  retention_30d_percent?: number | null;
  pct_users_with_min_10_movies?: number | null;
  pct_users_used_ai?: number | null;
  pct_users_added_ai_movies?: number | null;
  avg_movies_per_user?: number | null;
  retention_timeseries?: RetentionPoint[];
  new_users_timeseries?: UsersGrowthPoint[];
  last_updated_at?: string; // ISO datetime
};

/**
 * Single data point for retention chart
 */
export type RetentionPoint = {
  date: string; // ISO date
  retention_7d: number; // 0-100
  retention_30d: number; // 0-100
};

/**
 * Single data point for users growth chart
 */
export type UsersGrowthPoint = {
  date: string; // ISO date
  count: number; // >= 0
};

/**
 * Query parameters for top movies endpoint
 */
export type TopMoviesQuery = {
  type: 'watchlist' | 'watched';
  range: '7d' | '30d' | 'all';
};

/**
 * Single item in top movies list
 */
export type TopMoviesItemDto = {
  tconst: string;
  primary_title: string;
  start_year: number | null;
  count: number;
};

/**
 * Top movies DTO returned from GET /admin/analytics/api/top-movies/
 */
export type TopMoviesDto = {
  type: TopMoviesQuery['type'];
  range: TopMoviesQuery['range'];
  items: TopMoviesItemDto[]; // max 10
};

/**
 * Query parameters for error logs endpoint
 */
export type ErrorLogsQuery = {
  api_type?: ('watchmode' | 'tmdb' | 'gemini')[];
  date_from?: string; // ISO date
  date_to?: string; // ISO date
  user_id?: string;
  page?: number; // default 1
  page_size?: number; // default 50
  sort?: 'occurred_at' | '-occurred_at'; // default '-occurred_at'
};

/**
 * Single error log item
 */
export type ErrorLogItemDto = {
  id: number;
  occurred_at: string; // ISO datetime
  api_type: 'watchmode' | 'tmdb' | 'gemini';
  error_message: string;
  user_id: string | null;
};

/**
 * Paginated error logs DTO returned from GET /admin/analytics/api/error-logs/
 */
export type PaginatedErrorLogsDto = {
  items: ErrorLogItemDto[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

/**
 * ViewModel for metric card display
 */
export type MetricCardVM = {
  label: string;
  value: string | number;
  hint?: string;
  tooltip?: string;
  icon?: React.ReactNode;
};

