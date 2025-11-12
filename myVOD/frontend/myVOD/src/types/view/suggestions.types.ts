// AI Suggestions View Model Types

import type { MovieAvailabilityDto } from "../api.types";

/**
 * ViewModel for a single suggestion card.
 * Maps API DTO to UI-friendly format with poster URL handling.
 */
export type AISuggestionCardVM = {
  tconst: string;
  title: string;
  year: number | null;
  genres: string[] | null;
  justification: string;
  posterUrl: string | null; // TMDB URL or null for placeholder
  availability: MovieAvailabilityDto[];
};

/**
 * ViewModel for AI suggestions view.
 * Contains processed suggestions data and metadata.
 */
export type AISuggestionsViewModel = {
  expiresAt: string | null;
  items: AISuggestionCardVM[];
  isRateLimited: boolean;
  errorMessage?: string;
};

/**
 * Simplified API error shape for UI handling.
 */
export type ApiError = {
  status: number;
  message?: string;
};

/**
 * Empty state variant for different error scenarios.
 */
export type EmptyStateVariant =
  | "no-data"
  | "rate-limited"
  | "no-suggestions"
  | "error";
