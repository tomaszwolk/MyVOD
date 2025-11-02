import { describe, it, expect, beforeEach, vi } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { http } from '@/lib/http';
import { patchUserMovie, deleteUserMovie, listUserMovies } from '../movies';
import type { UserMovieDto, UpdateUserMovieCommand } from '@/types/api.types';

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

    await listUserMovies();

    expect(mock.history.get).toHaveLength(1);
    expect(mock.history.get[0].url).toBe('/user-movies/');
    expect(mock.history.get[0].params).toBeUndefined();
  });

  it('should call GET /api/user-movies?status=watchlist', async () => {
    mock.onGet('/user-movies/').reply(200, mockUserMovies);

    await listUserMovies('watchlist');

    expect(mock.history.get).toHaveLength(1);
    expect(mock.history.get[0].params).toEqual({ status: 'watchlist' });
  });

  it('should call GET /api/user-movies?status=watched', async () => {
    mock.onGet('/user-movies/').reply(200, mockUserMovies);

    await listUserMovies('watched');

    expect(mock.history.get).toHaveLength(1);
    expect(mock.history.get[0].params).toEqual({ status: 'watched' });
  });

  it('should return UserMovieDto[]', async () => {
    mock.onGet('/user-movies/').reply(200, mockUserMovies);

    const result = await listUserMovies();

    expect(result).toEqual(mockUserMovies);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(123);
    expect(result[1].id).toBe(456);
  });

  it('should handle errors', async () => {
    mock.onGet('/user-movies/').reply(500, { detail: 'Internal server error' });

    await expect(listUserMovies()).rejects.toThrow();
  });
});
