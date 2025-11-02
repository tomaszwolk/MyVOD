import { http } from "@/lib/http";
import type { MovieSearchResultDto, UserMovieDto, AddUserMovieCommand, UpdateUserMovieCommand, AISuggestionsDto } from "@/types/api.types";

/**
 * API client for movie-related endpoints.
 */

/**
 * Search for movies by query string.
 * Corresponds to GET /api/movies/?search=<query>
 * @param query - Search query (minimum 2 characters)
 * @returns Promise<MovieSearchResultDto[]>
 */
type SearchMoviesOptions = {
  signal?: AbortSignal;
};

export async function searchMovies(query: string, options: SearchMoviesOptions = {}): Promise<MovieSearchResultDto[]> {
  if (query.length < 2) {
    return [];
  }

  const response = await http.get<MovieSearchResultDto[]>("/movies/", {
    params: { search: query },
    signal: options.signal,
  });

  return response.data;
}

/**
 * Add a movie to the user's watchlist.
 * Corresponds to POST /api/user-movies/
 * @param command - Add movie command with tconst
 * @returns Promise<UserMovieDto>
 */
export async function addUserMovie(command: AddUserMovieCommand): Promise<UserMovieDto> {
  const response = await http.post<UserMovieDto>("/user-movies/", command);
  return response.data;
}

/**
 * Update a user movie (mark as watched or restore to watchlist).
 * Corresponds to PATCH /api/user-movies/:id
 * @param id - User movie ID
 * @param command - Update command with action
 * @returns Promise<UserMovieDto>
 */
export async function patchUserMovie(id: number, command: UpdateUserMovieCommand): Promise<UserMovieDto> {
  const response = await http.patch<UserMovieDto>(`/user-movies/${id}/`, command);
  return response.data;
}

/**
 * Delete a user movie (soft delete).
 * Corresponds to DELETE /api/user-movies/:id
 * @param id - User movie ID
 * @returns Promise<void>
 */
export async function deleteUserMovie(id: number): Promise<void> {
  await http.delete(`/user-movies/${id}/`);
}

/**
 * List user movies filtered by status and ordering.
 * Corresponds to GET /api/user-movies/?status=<status>&ordering=<ordering>
 * @param status - Filter by status ('watchlist' or 'watched')
 * @param ordering - Optional ordering parameter
 * @returns Promise<UserMovieDto[]>
 */
export async function listUserMovies(status?: 'watchlist' | 'watched', ordering?: string): Promise<UserMovieDto[]> {
  const params: Record<string, string> = {};
  if (status) params.status = status;
  if (ordering) params.ordering = ordering;

  const response = await http.get<UserMovieDto[]>("/user-movies/", {
    params: Object.keys(params).length > 0 ? params : undefined,
  });
  return response.data;
}

/**
 * Restore a movie from watched back to watchlist.
 * Corresponds to PATCH /api/user-movies/:id with action: 'restore_to_watchlist'
 * @param id - User movie ID
 * @returns Promise<UserMovieDto>
 */
export async function restoreUserMovie(id: number): Promise<UserMovieDto> {
  const response = await http.patch<UserMovieDto>(`/user-movies/${id}/`, {
    action: 'restore_to_watchlist'
  });
  return response.data;
}

/**
 * Get AI-powered movie suggestions for the user.
 * Corresponds to GET /api/suggestions/
 * @param options - Optional parameters including debug flag
 * @returns Promise<AISuggestionsDto>
 */
type GetAISuggestionsOptions = {
  debug?: boolean;
};

export async function getAISuggestions(options: GetAISuggestionsOptions = {}): Promise<AISuggestionsDto> {
  const params: Record<string, string> = {};
  if (options.debug) {
    params.debug = 'true';
  }

  const response = await http.get<AISuggestionsDto>("/suggestions/", {
    params: Object.keys(params).length > 0 ? params : undefined,
  });
  return response.data;
}
