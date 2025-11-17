import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { http } from '@/lib/http';
import { patchUserMovie, deleteUserMovie, listUserMovies, searchMovies, addUserMovie, restoreUserMovie, getAISuggestions } from '../movies';
import type { UserMovieDto, UpdateUserMovieCommand, MovieSearchResultDto, AddUserMovieCommand, AISuggestionsDto } from '@/types/api.types';

// Mock data
const mockUserMovieDto: UserMovieDto = {
  id: 123,
  watchlisted_at: '2025-01-01T10:00:00Z',
  watched_at: '2025-01-01T11:00:00Z',
  movie: {
    tconst: 'tt0111161',
    primary_title: 'The Shawshank Redemption',
    start_year: 1994,
    genres: ['Drama'],
    avg_rating: '9.3',
    poster_path: '/poster.jpg',
  },
  availability: [
    { platform_slug: 'netflix', platform_name: 'Netflix' },
  ],
};

const mockUserMovies: UserMovieDto[] = [
  mockUserMovieDto,
  {
    id: 456,
    watchlisted_at: '2025-01-02T10:00:00Z',
    watched_at: null,
    movie: {
      tconst: 'tt0068646',
      primary_title: 'The Godfather',
      start_year: 1972,
      genres: ['Crime', 'Drama'],
      avg_rating: '9.2',
      poster_path: '/godfather.jpg',
    },
    availability: [
      { platform_slug: 'hbo', platform_name: 'HBO Max' },
    ],
  },
];

const mockMovieSearchResult: MovieSearchResultDto = {
  tconst: 'tt0111161',
  primary_title: 'The Shawshank Redemption',
  start_year: 1994,
  poster_path: '/shawshank.jpg',
  avg_rating: '9.3',
};

const mockMovieSearchResults: MovieSearchResultDto[] = [
  mockMovieSearchResult,
  {
    tconst: 'tt0068646',
    primary_title: 'The Godfather',
    start_year: 1972,
    poster_path: '/godfather.jpg',
    avg_rating: '9.2',
  },
];

const mockAISuggestionsDto: AISuggestionsDto = {
  expires_at: '2025-11-03T22:00:00Z',
  suggestions: [
    {
      tconst: 'tt0111161',
      primary_title: 'The Shawshank Redemption',
      start_year: 1994,
      poster_path: '/shawshank.jpg',
      justification: 'Based on your interest in drama films',
      availability: [
        { platform_slug: 'netflix', platform_name: 'Netflix' },
      ],
    },
    {
      tconst: 'tt0068646',
      primary_title: 'The Godfather',
      start_year: 1972,
      poster_path: '/godfather.jpg',
      justification: 'Classic crime drama you might enjoy',
      availability: [
        { platform_slug: 'hbo', platform_name: 'HBO Max' },
      ],
    },
  ],
};

describe('patchUserMovie', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(http);
  });

  afterEach(() => {
    mock.restore();
  });

  it('should call PATCH /api/user-movies/:id', async () => {
    const id = 123;
    const command: UpdateUserMovieCommand = { action: 'mark_as_watched' };
    mock.onPatch(`/user-movies/${id}/`).reply(200, mockUserMovieDto);

    await patchUserMovie(id, command);

    expect(mock.history.patch).toHaveLength(1);
    expect(mock.history.patch[0].url).toBe(`/user-movies/${id}/`);
  });

  it('should send UpdateUserMovieCommand in body', async () => {
    const id = 123;
    const command: UpdateUserMovieCommand = { action: 'mark_as_watched' };
    mock.onPatch(`/user-movies/${id}/`).reply(200, mockUserMovieDto);

    await patchUserMovie(id, command);

    const requestData = JSON.parse(mock.history.patch[0].data);
    expect(requestData).toEqual(command);
    expect(requestData.action).toBe('mark_as_watched');
  });

  it('should return UserMovieDto', async () => {
    const id = 123;
    const command: UpdateUserMovieCommand = { action: 'mark_as_watched' };
    mock.onPatch(`/user-movies/${id}/`).reply(200, mockUserMovieDto);

    const result = await patchUserMovie(id, command);

    expect(result).toEqual(mockUserMovieDto);
    expect(result.id).toBe(123);
    expect(result.movie.primary_title).toBe('The Shawshank Redemption');
  });

  it('should handle 400 already watched', async () => {
    const id = 123;
    const command: UpdateUserMovieCommand = { action: 'mark_as_watched' };
    mock.onPatch(`/user-movies/${id}/`).reply(400, { detail: 'Movie already watched' });

    await expect(patchUserMovie(id, command)).rejects.toThrow();
  });

  it('should handle 401 Unauthorized', async () => {
    const id = 123;
    const command: UpdateUserMovieCommand = { action: 'mark_as_watched' };
    mock.onPatch(`/user-movies/${id}/`).reply(401, { detail: 'Unauthorized' });

    await expect(patchUserMovie(id, command)).rejects.toThrow();
  });
});

describe('patchUserMovie - Comprehensive Error Handling', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(http);
  });

  afterEach(() => {
    mock.restore();
  });

  it('should handle network connection refused (ECONNREFUSED)', async () => {
    const id = 123;
    const command: UpdateUserMovieCommand = { action: 'mark_as_watched' };
    mock.onPatch(`/user-movies/${id}/`).networkError();

    await expect(patchUserMovie(id, command)).rejects.toThrow();
  });

  it('should handle network timeout (408)', async () => {
    const id = 123;
    const command: UpdateUserMovieCommand = { action: 'mark_as_watched' };
    mock.onPatch(`/user-movies/${id}/`).reply(408, {
      detail: 'Request timeout'
    });

    await expect(patchUserMovie(id, command)).rejects.toThrow();
  });

  it('should handle server unavailable (503)', async () => {
    const id = 123;
    const command: UpdateUserMovieCommand = { action: 'mark_as_watched' };
    mock.onPatch(`/user-movies/${id}/`).reply(503, {
      detail: 'Service temporarily unavailable'
    });

    await expect(patchUserMovie(id, command)).rejects.toThrow();
  });

  it('should handle gateway timeout (504)', async () => {
    const id = 123;
    const command: UpdateUserMovieCommand = { action: 'mark_as_watched' };
    mock.onPatch(`/user-movies/${id}/`).reply(504, {
      detail: 'Gateway timeout'
    });

    await expect(patchUserMovie(id, command)).rejects.toThrow();
  });

  it('should handle malformed JSON response (500)', async () => {
    const id = 123;
    const command: UpdateUserMovieCommand = { action: 'mark_as_watched' };
    mock.onPatch(`/user-movies/${id}/`).reply(500, 'Internal server error - not JSON');

    await expect(patchUserMovie(id, command)).rejects.toThrow();
  });

  it('should handle HTML error response instead of JSON (500)', async () => {
    const id = 123;
    const command: UpdateUserMovieCommand = { action: 'mark_as_watched' };
    mock.onPatch(`/user-movies/${id}/`).reply(500, '<html><body>Server Error</body></html>', {
      'content-type': 'text/html'
    });

    await expect(patchUserMovie(id, command)).rejects.toThrow();
  });

  it('should handle forbidden access (403)', async () => {
    const id = 123;
    const command: UpdateUserMovieCommand = { action: 'mark_as_watched' };
    mock.onPatch(`/user-movies/${id}/`).reply(403, {
      detail: 'Movie update forbidden'
    });

    await expect(patchUserMovie(id, command)).rejects.toThrow();
  });

  it('should handle too many requests (429)', async () => {
    const id = 123;
    const command: UpdateUserMovieCommand = { action: 'mark_as_watched' };
    mock.onPatch(`/user-movies/${id}/`).reply(429, {
      detail: 'Too many update requests. Try again later.'
    });

    await expect(patchUserMovie(id, command)).rejects.toThrow();
  });

  it('should handle unprocessable entity (422)', async () => {
    const id = 123;
    const command: UpdateUserMovieCommand = { action: 'mark_as_watched' };
    mock.onPatch(`/user-movies/${id}/`).reply(422, {
      detail: 'Invalid update action'
    });

    await expect(patchUserMovie(id, command)).rejects.toThrow();
  });

  it('should handle bad gateway (502)', async () => {
    const id = 123;
    const command: UpdateUserMovieCommand = { action: 'mark_as_watched' };
    mock.onPatch(`/user-movies/${id}/`).reply(502, {
      detail: 'Bad gateway'
    });

    await expect(patchUserMovie(id, command)).rejects.toThrow();
  });
});

describe('deleteUserMovie', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(http);
  });

  afterEach(() => {
    mock.restore();
  });

  it('should call DELETE /api/user-movies/:id', async () => {
    const id = 123;
    mock.onDelete(`/user-movies/${id}/`).reply(204);

    await deleteUserMovie(id);

    expect(mock.history.delete).toHaveLength(1);
    expect(mock.history.delete[0].url).toBe(`/user-movies/${id}/`);
  });

  it('should return void (204)', async () => {
    const id = 123;
    mock.onDelete(`/user-movies/${id}/`).reply(204);

    const result = await deleteUserMovie(id);

    expect(result).toBeUndefined();
  });

  it('should handle 404 Not Found', async () => {
    const id = 999;
    mock.onDelete(`/user-movies/${id}/`).reply(404, { detail: 'Not found' });

    await expect(deleteUserMovie(id)).rejects.toThrow();
  });

  it('should handle 401 Unauthorized', async () => {
    const id = 123;
    mock.onDelete(`/user-movies/${id}/`).reply(401, { detail: 'Unauthorized' });

    await expect(deleteUserMovie(id)).rejects.toThrow();
  });
});

describe('deleteUserMovie - Comprehensive Error Handling', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(http);
  });

  afterEach(() => {
    mock.restore();
  });

  it('should handle network connection refused (ECONNREFUSED)', async () => {
    const id = 123;
    mock.onDelete(`/user-movies/${id}/`).networkError();

    await expect(deleteUserMovie(id)).rejects.toThrow();
  });

  it('should handle network timeout (408)', async () => {
    const id = 123;
    mock.onDelete(`/user-movies/${id}/`).reply(408, {
      detail: 'Request timeout'
    });

    await expect(deleteUserMovie(id)).rejects.toThrow();
  });

  it('should handle server unavailable (503)', async () => {
    const id = 123;
    mock.onDelete(`/user-movies/${id}/`).reply(503, {
      detail: 'Service temporarily unavailable'
    });

    await expect(deleteUserMovie(id)).rejects.toThrow();
  });

  it('should handle gateway timeout (504)', async () => {
    const id = 123;
    mock.onDelete(`/user-movies/${id}/`).reply(504, {
      detail: 'Gateway timeout'
    });

    await expect(deleteUserMovie(id)).rejects.toThrow();
  });

  it('should handle malformed JSON response (500)', async () => {
    const id = 123;
    mock.onDelete(`/user-movies/${id}/`).reply(500, 'Internal server error - not JSON');

    await expect(deleteUserMovie(id)).rejects.toThrow();
  });

  it('should handle HTML error response instead of JSON (500)', async () => {
    const id = 123;
    mock.onDelete(`/user-movies/${id}/`).reply(500, '<html><body>Server Error</body></html>', {
      'content-type': 'text/html'
    });

    await expect(deleteUserMovie(id)).rejects.toThrow();
  });

  it('should handle forbidden access (403)', async () => {
    const id = 123;
    mock.onDelete(`/user-movies/${id}/`).reply(403, {
      detail: 'Delete forbidden'
    });

    await expect(deleteUserMovie(id)).rejects.toThrow();
  });

  it('should handle too many requests (429)', async () => {
    const id = 123;
    mock.onDelete(`/user-movies/${id}/`).reply(429, {
      detail: 'Too many delete requests. Try again later.'
    });

    await expect(deleteUserMovie(id)).rejects.toThrow();
  });

  it('should handle conflict state (409)', async () => {
    const id = 123;
    mock.onDelete(`/user-movies/${id}/`).reply(409, {
      detail: 'Delete conflict'
    });

    await expect(deleteUserMovie(id)).rejects.toThrow();
  });

  it('should handle unprocessable entity (422)', async () => {
    const id = 123;
    mock.onDelete(`/user-movies/${id}/`).reply(422, {
      detail: 'Invalid delete request'
    });

    await expect(deleteUserMovie(id)).rejects.toThrow();
  });

  it('should handle bad gateway (502)', async () => {
    const id = 123;
    mock.onDelete(`/user-movies/${id}/`).reply(502, {
      detail: 'Bad gateway'
    });

    await expect(deleteUserMovie(id)).rejects.toThrow();
  });
});

describe('listUserMovies', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(http);
  });

  afterEach(() => {
    mock.restore();
  });

  it('should call GET /api/user-movies without params', async () => {
    mock.onGet('/user-movies/').reply(200, mockUserMovies);

    await listUserMovies({});

    expect(mock.history.get).toHaveLength(1);
    expect(mock.history.get[0].url).toBe('/user-movies/');
    expect(mock.history.get[0].params).toEqual({ page: 1 });
  });

  it('should call GET /api/user-movies?status=watchlist', async () => {
    mock.onGet('/user-movies/').reply(200, mockUserMovies);

    await listUserMovies({ status: 'watchlist' });

    expect(mock.history.get).toHaveLength(1);
    expect(mock.history.get[0].params).toEqual({ status: 'watchlist', page: 1 });
  });

  it('should call GET /api/user-movies?status=watched', async () => {
    mock.onGet('/user-movies/').reply(200, mockUserMovies);

    await listUserMovies({ status: 'watched' });

    expect(mock.history.get).toHaveLength(1);
    expect(mock.history.get[0].params).toEqual({ status: 'watched', page: 1 });
  });

  it('should return UserMovieDto[]', async () => {
    const paginatedResponse = { results: mockUserMovies, count: mockUserMovies.length, next: null };
    mock.onGet('/user-movies/').reply(200, paginatedResponse);

    const result = await listUserMovies({});

    expect(result.results).toEqual(mockUserMovies);
    expect(result.results).toHaveLength(2);
    expect(result.results[0].id).toBe(123);
    expect(result.results[1].id).toBe(456);
  });

  it('should handle errors', async () => {
    mock.onGet('/user-movies/').reply(500, { detail: 'Internal server error' });

    await expect(listUserMovies()).rejects.toThrow();
  });
});

describe('listUserMovies - Comprehensive Error Handling', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(http);
  });

  afterEach(() => {
    mock.restore();
  });

  it('should handle network connection refused (ECONNREFUSED)', async () => {
    mock.onGet('/user-movies/').networkError();

    await expect(listUserMovies()).rejects.toThrow();
  });

  it('should handle network timeout (408)', async () => {
    mock.onGet('/user-movies/').reply(408, {
      detail: 'Request timeout'
    });

    await expect(listUserMovies()).rejects.toThrow();
  });

  it('should handle server unavailable (503)', async () => {
    mock.onGet('/user-movies/').reply(503, {
      detail: 'Service temporarily unavailable'
    });

    await expect(listUserMovies()).rejects.toThrow();
  });

  it('should handle gateway timeout (504)', async () => {
    mock.onGet('/user-movies/').reply(504, {
      detail: 'Gateway timeout'
    });

    await expect(listUserMovies()).rejects.toThrow();
  });

  it('should handle malformed JSON response (500)', async () => {
    mock.onGet('/user-movies/').reply(500, 'Internal server error - not JSON');

    await expect(listUserMovies()).rejects.toThrow();
  });

  it('should handle HTML error response instead of JSON (500)', async () => {
    mock.onGet('/user-movies/').reply(500, '<html><body>Server Error</body></html>', {
      'content-type': 'text/html'
    });

    await expect(listUserMovies()).rejects.toThrow();
  });

  it('should handle forbidden access (403)', async () => {
    mock.onGet('/user-movies/').reply(403, {
      detail: 'Access forbidden'
    });

    await expect(listUserMovies()).rejects.toThrow();
  });

  it('should handle too many requests (429)', async () => {
    mock.onGet('/user-movies/').reply(429, {
      detail: 'Too many list requests. Try again later.'
    });

    await expect(listUserMovies()).rejects.toThrow();
  });

  it('should handle conflict state (409)', async () => {
    mock.onGet('/user-movies/').reply(409, {
      detail: 'List conflict'
    });

    await expect(listUserMovies()).rejects.toThrow();
  });

  it('should handle unprocessable entity (422)', async () => {
    mock.onGet('/user-movies/').reply(422, {
      detail: 'Invalid list request'
    });

    await expect(listUserMovies()).rejects.toThrow();
  });

  it('should handle bad gateway (502)', async () => {
    mock.onGet('/user-movies/').reply(502, {
      detail: 'Bad gateway'
    });

    await expect(listUserMovies()).rejects.toThrow();
  });
});

describe('searchMovies', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(http);
  });

  afterEach(() => {
    mock.restore();
  });

  it('should return empty array for queries < 2 characters', async () => {
    const result = await searchMovies('a');

    expect(result).toEqual([]);
    expect(mock.history.get).toHaveLength(0);
  });

  it('should return empty array for empty query', async () => {
    const result = await searchMovies('');

    expect(result).toEqual([]);
    expect(mock.history.get).toHaveLength(0);
  });

  it('should call GET /movies/?search=query for queries >= 2 chars', async () => {
    mock.onGet('/movies/').reply(200, mockMovieSearchResults);

    await searchMovies('shawshank');

    expect(mock.history.get).toHaveLength(1);
    expect(mock.history.get[0].url).toBe('/movies/');
    expect(mock.history.get[0].params).toEqual({ search: 'shawshank' });
  });

  it('should pass AbortSignal to request', async () => {
    const abortController = new AbortController();
    mock.onGet('/movies/').reply(200, mockMovieSearchResults);

    await searchMovies('shawshank', { signal: abortController.signal });

    expect(mock.history.get).toHaveLength(1);
    expect(mock.history.get[0].signal).toBe(abortController.signal);
  });

  it('should return MovieSearchResultDto[] on success', async () => {
    mock.onGet('/movies/').reply(200, mockMovieSearchResults);

    const result = await searchMovies('shawshank');

    expect(result).toEqual(mockMovieSearchResults);
    expect(result).toHaveLength(2);
    expect(result[0].tconst).toBe('tt0111161');
    expect(result[0].primary_title).toBe('The Shawshank Redemption');
    expect(result[1].primary_title).toBe('The Godfather');
  });

  it('should handle API errors', async () => {
    mock.onGet('/movies/').reply(500, { detail: 'Internal server error' });

    await expect(searchMovies('shawshank')).rejects.toThrow();
  });
});

describe('searchMovies - Comprehensive Error Handling', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(http);
  });

  afterEach(() => {
    mock.restore();
  });

  it('should handle network connection refused (ECONNREFUSED)', async () => {
    mock.onGet('/movies/').networkError();

    await expect(searchMovies('shawshank')).rejects.toThrow();
  });

  it('should handle network timeout (408)', async () => {
    mock.onGet('/movies/').reply(408, {
      detail: 'Request timeout'
    });

    await expect(searchMovies('shawshank')).rejects.toThrow();
  });

  it('should handle server unavailable (503)', async () => {
    mock.onGet('/movies/').reply(503, {
      detail: 'Service temporarily unavailable'
    });

    await expect(searchMovies('shawshank')).rejects.toThrow();
  });

  it('should handle gateway timeout (504)', async () => {
    mock.onGet('/movies/').reply(504, {
      detail: 'Gateway timeout'
    });

    await expect(searchMovies('shawshank')).rejects.toThrow();
  });

  it('should handle malformed JSON response (500)', async () => {
    mock.onGet('/movies/').reply(500, 'Internal server error - not JSON');

    await expect(searchMovies('shawshank')).rejects.toThrow();
  });

  it('should handle HTML error response instead of JSON (500)', async () => {
    mock.onGet('/movies/').reply(500, '<html><body>Server Error</body></html>', {
      'content-type': 'text/html'
    });

    await expect(searchMovies('shawshank')).rejects.toThrow();
  });

  it('should handle forbidden access (403)', async () => {
    mock.onGet('/movies/').reply(403, {
      detail: 'Access forbidden'
    });

    await expect(searchMovies('shawshank')).rejects.toThrow();
  });

  it('should handle too many requests (429)', async () => {
    mock.onGet('/movies/').reply(429, {
      detail: 'Too many search requests. Try again later.'
    });

    await expect(searchMovies('shawshank')).rejects.toThrow();
  });

  it('should handle conflict state (409)', async () => {
    mock.onGet('/movies/').reply(409, {
      detail: 'Search conflict'
    });

    await expect(searchMovies('shawshank')).rejects.toThrow();
  });

  it('should handle unprocessable entity (422)', async () => {
    mock.onGet('/movies/').reply(422, {
      detail: 'Invalid search query'
    });

    await expect(searchMovies('shawshank')).rejects.toThrow();
  });

  it('should handle bad gateway (502)', async () => {
    mock.onGet('/movies/').reply(502, {
      detail: 'Bad gateway'
    });

    await expect(searchMovies('shawshank')).rejects.toThrow();
  });
});

describe('addUserMovie', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(http);
  });

  afterEach(() => {
    mock.restore();
  });

  it('should call POST /user-movies/ with AddUserMovieCommand', async () => {
    const command: AddUserMovieCommand = { tconst: 'tt0111161' };
    mock.onPost('/user-movies/').reply(201, mockUserMovieDto);

    await addUserMovie(command);

    expect(mock.history.post).toHaveLength(1);
    expect(mock.history.post[0].url).toBe('/user-movies/');
  });

  it('should send AddUserMovieCommand in body', async () => {
    const command: AddUserMovieCommand = {
      tconst: 'tt0111161',
      mark_as_watched: true,
      added_from_ai_suggestion: false
    };
    mock.onPost('/user-movies/').reply(201, mockUserMovieDto);

    await addUserMovie(command);

    const requestData = JSON.parse(mock.history.post[0].data);
    expect(requestData).toEqual(command);
    expect(requestData.tconst).toBe('tt0111161');
    expect(requestData.mark_as_watched).toBe(true);
    expect(requestData.added_from_ai_suggestion).toBe(false);
  });

  it('should return UserMovieDto on success (201)', async () => {
    const command: AddUserMovieCommand = { tconst: 'tt0111161' };
    mock.onPost('/user-movies/').reply(201, mockUserMovieDto);

    const result = await addUserMovie(command);

    expect(result).toEqual(mockUserMovieDto);
    expect(result.id).toBe(123);
    expect(result.movie.tconst).toBe('tt0111161');
    expect(result.movie.primary_title).toBe('The Shawshank Redemption');
  });

  it('should handle duplicate movie errors (409)', async () => {
    const command: AddUserMovieCommand = { tconst: 'tt0111161' };
    mock.onPost('/user-movies/').reply(409, {
      detail: 'Movie already exists in your watchlist'
    });

    await expect(addUserMovie(command)).rejects.toThrow();
  });

  it('should handle validation errors (400)', async () => {
    const command: AddUserMovieCommand = { tconst: 'invalid-tconst' };
    mock.onPost('/user-movies/').reply(400, {
      tconst: ['Invalid tconst format']
    });

    await expect(addUserMovie(command)).rejects.toThrow();
  });
});

describe('addUserMovie - Comprehensive Error Handling', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(http);
  });

  afterEach(() => {
    mock.restore();
  });

  it('should handle network connection refused (ECONNREFUSED)', async () => {
    const command: AddUserMovieCommand = { tconst: 'tt0111161' };
    mock.onPost('/user-movies/').networkError();

    await expect(addUserMovie(command)).rejects.toThrow();
  });

  it('should handle network timeout (408)', async () => {
    const command: AddUserMovieCommand = { tconst: 'tt0111161' };
    mock.onPost('/user-movies/').reply(408, {
      detail: 'Request timeout'
    });

    await expect(addUserMovie(command)).rejects.toThrow();
  });

  it('should handle server unavailable (503)', async () => {
    const command: AddUserMovieCommand = { tconst: 'tt0111161' };
    mock.onPost('/user-movies/').reply(503, {
      detail: 'Service temporarily unavailable'
    });

    await expect(addUserMovie(command)).rejects.toThrow();
  });

  it('should handle gateway timeout (504)', async () => {
    const command: AddUserMovieCommand = { tconst: 'tt0111161' };
    mock.onPost('/user-movies/').reply(504, {
      detail: 'Gateway timeout'
    });

    await expect(addUserMovie(command)).rejects.toThrow();
  });

  it('should handle malformed JSON response (500)', async () => {
    const command: AddUserMovieCommand = { tconst: 'tt0111161' };
    mock.onPost('/user-movies/').reply(500, 'Internal server error - not JSON');

    await expect(addUserMovie(command)).rejects.toThrow();
  });

  it('should handle HTML error response instead of JSON (500)', async () => {
    const command: AddUserMovieCommand = { tconst: 'tt0111161' };
    mock.onPost('/user-movies/').reply(500, '<html><body>Server Error</body></html>', {
      'content-type': 'text/html'
    });

    await expect(addUserMovie(command)).rejects.toThrow();
  });

  it('should handle forbidden access (403)', async () => {
    const command: AddUserMovieCommand = { tconst: 'tt0111161' };
    mock.onPost('/user-movies/').reply(403, {
      detail: 'Adding movies forbidden'
    });

    await expect(addUserMovie(command)).rejects.toThrow();
  });

  it('should handle too many requests (429)', async () => {
    const command: AddUserMovieCommand = { tconst: 'tt0111161' };
    mock.onPost('/user-movies/').reply(429, {
      detail: 'Too many add requests. Try again later.'
    });

    await expect(addUserMovie(command)).rejects.toThrow();
  });

  it('should handle unprocessable entity (422)', async () => {
    const command: AddUserMovieCommand = { tconst: 'tt0111161' };
    mock.onPost('/user-movies/').reply(422, {
      detail: 'Invalid movie data'
    });

    await expect(addUserMovie(command)).rejects.toThrow();
  });

  it('should handle bad gateway (502)', async () => {
    const command: AddUserMovieCommand = { tconst: 'tt0111161' };
    mock.onPost('/user-movies/').reply(502, {
      detail: 'Bad gateway'
    });

    await expect(addUserMovie(command)).rejects.toThrow();
  });
});

describe('restoreUserMovie', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(http);
  });

  afterEach(() => {
    mock.restore();
  });

  it('should call PATCH /user-movies/:id with restore_to_watchlist action', async () => {
    const id = 123;
    mock.onPatch(`/user-movies/${id}/`).reply(200, mockUserMovieDto);

    await restoreUserMovie(id);

    expect(mock.history.patch).toHaveLength(1);
    expect(mock.history.patch[0].url).toBe(`/user-movies/${id}/`);
  });

  it('should send action in body', async () => {
    const id = 123;
    mock.onPatch(`/user-movies/${id}/`).reply(200, mockUserMovieDto);

    await restoreUserMovie(id);

    const requestData = JSON.parse(mock.history.patch[0].data);
    expect(requestData).toEqual({ action: 'restore_to_watchlist' });
    expect(requestData.action).toBe('restore_to_watchlist');
  });

  it('should return UserMovieDto on success (200)', async () => {
    const id = 123;
    mock.onPatch(`/user-movies/${id}/`).reply(200, mockUserMovieDto);

    const result = await restoreUserMovie(id);

    expect(result).toEqual(mockUserMovieDto);
    expect(result.id).toBe(123);
    expect(result.movie.primary_title).toBe('The Shawshank Redemption');
  });

  it('should handle not found errors (404)', async () => {
    const id = 999;
    mock.onPatch(`/user-movies/${id}/`).reply(404, {
      detail: 'User movie not found'
    });

    await expect(restoreUserMovie(id)).rejects.toThrow();
  });

  it('should handle invalid action errors (400)', async () => {
    const id = 123;
    mock.onPatch(`/user-movies/${id}/`).reply(400, {
      action: ['Invalid action for this movie state']
    });

    await expect(restoreUserMovie(id)).rejects.toThrow();
  });
});

describe('restoreUserMovie - Comprehensive Error Handling', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(http);
  });

  afterEach(() => {
    mock.restore();
  });

  it('should handle network connection refused (ECONNREFUSED)', async () => {
    const id = 123;
    mock.onPatch(`/user-movies/${id}/`).networkError();

    await expect(restoreUserMovie(id)).rejects.toThrow();
  });

  it('should handle network timeout (408)', async () => {
    const id = 123;
    mock.onPatch(`/user-movies/${id}/`).reply(408, {
      detail: 'Request timeout'
    });

    await expect(restoreUserMovie(id)).rejects.toThrow();
  });

  it('should handle server unavailable (503)', async () => {
    const id = 123;
    mock.onPatch(`/user-movies/${id}/`).reply(503, {
      detail: 'Service temporarily unavailable'
    });

    await expect(restoreUserMovie(id)).rejects.toThrow();
  });

  it('should handle gateway timeout (504)', async () => {
    const id = 123;
    mock.onPatch(`/user-movies/${id}/`).reply(504, {
      detail: 'Gateway timeout'
    });

    await expect(restoreUserMovie(id)).rejects.toThrow();
  });

  it('should handle malformed JSON response (500)', async () => {
    const id = 123;
    mock.onPatch(`/user-movies/${id}/`).reply(500, 'Internal server error - not JSON');

    await expect(restoreUserMovie(id)).rejects.toThrow();
  });

  it('should handle HTML error response instead of JSON (500)', async () => {
    const id = 123;
    mock.onPatch(`/user-movies/${id}/`).reply(500, '<html><body>Server Error</body></html>', {
      'content-type': 'text/html'
    });

    await expect(restoreUserMovie(id)).rejects.toThrow();
  });

  it('should handle forbidden access (403)', async () => {
    const id = 123;
    mock.onPatch(`/user-movies/${id}/`).reply(403, {
      detail: 'Restore forbidden'
    });

    await expect(restoreUserMovie(id)).rejects.toThrow();
  });

  it('should handle too many requests (429)', async () => {
    const id = 123;
    mock.onPatch(`/user-movies/${id}/`).reply(429, {
      detail: 'Too many restore requests. Try again later.'
    });

    await expect(restoreUserMovie(id)).rejects.toThrow();
  });

  it('should handle conflict state (409)', async () => {
    const id = 123;
    mock.onPatch(`/user-movies/${id}/`).reply(409, {
      detail: 'Restore conflict'
    });

    await expect(restoreUserMovie(id)).rejects.toThrow();
  });

  it('should handle unprocessable entity (422)', async () => {
    const id = 123;
    mock.onPatch(`/user-movies/${id}/`).reply(422, {
      detail: 'Invalid restore request'
    });

    await expect(restoreUserMovie(id)).rejects.toThrow();
  });

  it('should handle bad gateway (502)', async () => {
    const id = 123;
    mock.onPatch(`/user-movies/${id}/`).reply(502, {
      detail: 'Bad gateway'
    });

    await expect(restoreUserMovie(id)).rejects.toThrow();
  });
});

describe('getAISuggestions', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(http);
  });

  afterEach(() => {
    mock.restore();
  });

  it('should call GET /suggestions/ without params by default', async () => {
    mock.onGet('/suggestions/').reply(200, mockAISuggestionsDto);

    await getAISuggestions();

    expect(mock.history.get).toHaveLength(1);
    expect(mock.history.get[0].url).toBe('/suggestions/');
    expect(mock.history.get[0].params).toBeUndefined();
  });

  it('should call GET /suggestions/?debug=true when debug=true', async () => {
    mock.onGet('/suggestions/').reply(200, mockAISuggestionsDto);

    await getAISuggestions({ debug: true });

    expect(mock.history.get).toHaveLength(1);
    expect(mock.history.get[0].params).toEqual({ debug: 'true' });
  });

  it('should return AISuggestionsDto on success', async () => {
    mock.onGet('/suggestions/').reply(200, mockAISuggestionsDto);

    const result = await getAISuggestions();

    expect(result).toEqual(mockAISuggestionsDto);
    expect(result.expires_at).toBe('2025-11-03T22:00:00Z');
    expect(result.suggestions).toHaveLength(2);
    expect(result.suggestions[0].tconst).toBe('tt0111161');
    expect(result.suggestions[0].justification).toBe('Based on your interest in drama films');
    expect(result.suggestions[1].primary_title).toBe('The Godfather');
  });

  it('should handle 401 Unauthorized', async () => {
    mock.onGet('/suggestions/').reply(401, {
      detail: 'Authentication credentials were not provided.'
    });

    await expect(getAISuggestions()).rejects.toThrow();
  });

  it('should handle server errors (500)', async () => {
    mock.onGet('/suggestions/').reply(500, {
      detail: 'AI service temporarily unavailable'
    });

    await expect(getAISuggestions()).rejects.toThrow();
  });
});

describe('getAISuggestions - Comprehensive Error Handling', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(http);
  });

  afterEach(() => {
    mock.restore();
  });

  it('should handle network connection refused (ECONNREFUSED)', async () => {
    mock.onGet('/suggestions/').networkError();

    await expect(getAISuggestions()).rejects.toThrow();
  });

  it('should handle network timeout (408)', async () => {
    mock.onGet('/suggestions/').reply(408, {
      detail: 'Request timeout'
    });

    await expect(getAISuggestions()).rejects.toThrow();
  });

  it('should handle server unavailable (503)', async () => {
    mock.onGet('/suggestions/').reply(503, {
      detail: 'Service temporarily unavailable'
    });

    await expect(getAISuggestions()).rejects.toThrow();
  });

  it('should handle gateway timeout (504)', async () => {
    mock.onGet('/suggestions/').reply(504, {
      detail: 'Gateway timeout'
    });

    await expect(getAISuggestions()).rejects.toThrow();
  });

  it('should handle malformed JSON response (500)', async () => {
    mock.onGet('/suggestions/').reply(500, 'Internal server error - not JSON');

    await expect(getAISuggestions()).rejects.toThrow();
  });

  it('should handle HTML error response instead of JSON (500)', async () => {
    mock.onGet('/suggestions/').reply(500, '<html><body>Server Error</body></html>', {
      'content-type': 'text/html'
    });

    await expect(getAISuggestions()).rejects.toThrow();
  });

  it('should handle forbidden access (403)', async () => {
    mock.onGet('/suggestions/').reply(403, {
      detail: 'AI suggestions forbidden'
    });

    await expect(getAISuggestions()).rejects.toThrow();
  });

  it('should handle too many requests (429)', async () => {
    mock.onGet('/suggestions/').reply(429, {
      detail: 'Too many AI requests. Try again later.'
    });

    await expect(getAISuggestions()).rejects.toThrow();
  });

  it('should handle conflict state (409)', async () => {
    mock.onGet('/suggestions/').reply(409, {
      detail: 'AI suggestions conflict'
    });

    await expect(getAISuggestions()).rejects.toThrow();
  });

  it('should handle unprocessable entity (422)', async () => {
    mock.onGet('/suggestions/').reply(422, {
      detail: 'Invalid AI suggestions request'
    });

    await expect(getAISuggestions()).rejects.toThrow();
  });

  it('should handle bad gateway (502)', async () => {
    mock.onGet('/suggestions/').reply(502, {
      detail: 'Bad gateway'
    });

    await expect(getAISuggestions()).rejects.toThrow();
  });
});
