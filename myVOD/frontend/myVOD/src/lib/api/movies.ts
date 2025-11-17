import { http } from "@/lib/http";
import type {
  MovieSearchResultDto,
  UserMovieDto,
  AddUserMovieCommand,
  UpdateUserMovieCommand,
  AISuggestionsDto,
  PaginatedResponse,
} from "@/types/api.types";

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

export async function searchMovies(
  query: string,
  options: SearchMoviesOptions = {}
): Promise<MovieSearchResultDto[]> {
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
export async function addUserMovie(
  command: AddUserMovieCommand
): Promise<UserMovieDto> {
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
export async function patchUserMovie(
  id: number,
  command: UpdateUserMovieCommand
): Promise<UserMovieDto> {
  const response = await http.patch<UserMovieDto>(
    `/user-movies/${id}/`,
    command
  );
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
 * Note: This endpoint returns a direct array (pagination disabled in backend)
 * @param status - Filter by status ('watchlist' or 'watched')
 * @param ordering - Optional ordering parameter
 * @returns Promise<UserMovieDto[]>
 */

type ListUserMoviesParams = {
  status?: "watchlist" | "watched";
  ordering?: string;
  page?: number;
};

export async function listUserMovies({
  status,
  ordering,
  page = 1,
}: ListUserMoviesParams): Promise<PaginatedResponse<UserMovieDto>> {
  const params: Record<string, string | number> = { page };
  if (status) params.status = status;
  if (ordering) params.ordering = ordering;

  const response = await http.get<PaginatedResponse<UserMovieDto>>(
    "/user-movies/",
    {
      params,
    }
  );
  return response.data;
}

/**
 * Fetches the first page of user movies and returns a simple array.
 * To be used in places where pagination is not needed (e.g., onboarding checks).
 * @param status - Filter by status ('watchlist' or 'watched')
 * @returns Promise<UserMovieDto[]>
 */
export async function fetchUserMoviesSimpleList(
  status?: "watchlist" | "watched"
): Promise<UserMovieDto[]> {
  const response = await listUserMovies({ status, page: 1 });
  return response.results;
}

/**
 * Fetches all pages of user movies and returns a single flat array.
 * @param status - Filter by status ('watchlist' or 'watched')
 * @returns Promise<UserMovieDto[]>
 */
export async function fetchAllUserMovies(
  status?: "watchlist" | "watched"
): Promise<UserMovieDto[]> {
  let page = 1;
  let allMovies: UserMovieDto[] = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const response = await listUserMovies({ status, page });
    allMovies = allMovies.concat(response.results);
    if (!response.next) {
      break;
    }
    page += 1;
  }
  return allMovies;
}

/**
 * Restore a movie from watched back to watchlist.
 * Corresponds to PATCH /api/user-movies/:id with action: 'restore_to_watchlist'
 * @param id - User movie ID
 * @returns Promise<UserMovieDto>
 */
export async function restoreUserMovie(id: number): Promise<UserMovieDto> {
  const response = await http.patch<UserMovieDto>(`/user-movies/${id}/`, {
    action: "restore_to_watchlist",
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

/**
 * List movies available on VOD platforms with optional platform filtering.
 * Corresponds to GET /api/on-vod-movies/?page=<page>&platform_ids=<ids>
 * @param platformIds - Optional comma-separated platform IDs
 * @param page - Page number for pagination
 * @returns Promise<PaginatedResponse<UserMovieDto>>
 */
type ListOnVODMoviesParams = {
  platformIds?: number[];
  page?: number;
};

export async function listOnVODMovies({
  platformIds,
  page = 1,
}: ListOnVODMoviesParams): Promise<PaginatedResponse<UserMovieDto>> {
  const params: Record<string, string | number> = { page };
  if (platformIds && platformIds.length > 0) {
    params.platform_ids = platformIds.join(",");
  }

  const response = await http.get<PaginatedResponse<UserMovieDto>>(
    "/on-vod-movies/",
    {
      params,
    }
  );
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

export async function getAISuggestions(
  options: GetAISuggestionsOptions = {}
): Promise<AISuggestionsDto> {
  const params: Record<string, string> = {};
  if (options.debug) {
    params.debug = "true";
  }

  const response = await http.get<AISuggestionsDto>("/suggestions/", {
    params: Object.keys(params).length > 0 ? params : undefined,
  });
  return response.data;
}
