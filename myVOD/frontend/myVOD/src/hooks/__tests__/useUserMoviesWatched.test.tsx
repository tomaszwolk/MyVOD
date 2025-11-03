import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUserMoviesWatched } from '../useUserMoviesWatched';
import type { WatchedSortKey, PlatformDto } from '@/types/view/watched.types';

// Mock the API
vi.mock('@/lib/api/movies', () => ({
  listUserMovies: vi.fn(),
}));

import { listUserMovies } from '@/lib/api/movies';

const mockListUserMovies = vi.mocked(listUserMovies);

describe('useUserMoviesWatched', () => {
  let queryClient: QueryClient;
  let mockPlatforms: PlatformDto[];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    mockPlatforms = [
      { id: 1, platform_slug: 'netflix', platform_name: 'Netflix' },
      { id: 2, platform_slug: 'hbo', platform_name: 'HBO' },
    ];

    mockListUserMovies.mockClear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  it('should return empty items when no data', () => {
    mockListUserMovies.mockResolvedValue([]);

    const { result } = renderHook(
      () => useUserMoviesWatched({ sortKey: 'added_desc', userPlatforms: mockPlatforms }),
      { wrapper }
    );

    expect(result.current.items).toEqual([]);
    expect(result.current.isEmpty).toBe(true);
  });

  it('should map UserMovieDto to WatchedMovieItemVM correctly', async () => {
    const mockData = [
      {
        id: 1,
        watchlisted_at: '2024-01-01T00:00:00Z',
        watched_at: '2024-01-02T00:00:00Z',
        movie: {
          tconst: 'tt0111161',
          primary_title: 'The Shawshank Redemption',
          start_year: 1994,
          genres: ['Drama', 'Crime'],
          avg_rating: '9.3',
          poster_path: '/shawshank.jpg',
        },
        availability: [
          { platform_id: 1, platform_name: 'Netflix', is_available: true },
          { platform_id: 2, platform_name: 'HBO', is_available: false },
        ],
      },
    ];

    mockListUserMovies.mockResolvedValue(mockData);

    const { result } = renderHook(
      () => useUserMoviesWatched({ sortKey: 'added_desc', userPlatforms: mockPlatforms }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.items).toHaveLength(1);
    });

    const item = result.current.items[0];
    expect(item.id).toBe(1);
    expect(item.tconst).toBe('tt0111161');
    expect(item.title).toBe('The Shawshank Redemption');
    expect(item.year).toBe(1994);
    expect(item.genres).toEqual(['Drama', 'Crime']);
    expect(item.avgRating).toBe('9.3');
    expect(item.posterPath).toBe('/shawshank.jpg');
    expect(item.watchedAt).toBe('2024-01-02T00:00:00Z');
    expect(item.watchedAtLabel).toMatch(/2 stycznia 2024/); // Polish date format
    expect(item.availability).toHaveLength(2);
    expect(item.isAvailableOnAnyPlatform).toBe(true);
  });

  it('should call API with correct parameters for watched_at_desc sort', () => {
    mockListUserMovies.mockResolvedValue([]);

    renderHook(
      () => useUserMoviesWatched({ sortKey: 'added_desc', userPlatforms: mockPlatforms }),
      { wrapper }
    );

    expect(mockListUserMovies).toHaveBeenCalledWith('watched', undefined);
  });

  it('should call API with ordering parameter for rating_desc sort', () => {
    mockListUserMovies.mockResolvedValue([]);

    renderHook(
      () => useUserMoviesWatched({ sortKey: 'imdb_desc', userPlatforms: mockPlatforms }),
      { wrapper }
    );

    expect(mockListUserMovies).toHaveBeenCalledWith('watched', '-tconst__avg_rating');
  });

  it('should sort by watched date descending when sortKey is watched_at_desc', async () => {
    const mockData = [
      {
        id: 1,
        watchlisted_at: '2024-01-01T00:00:00Z',
        watched_at: '2024-01-03T00:00:00Z', // Newer
        movie: {
          tconst: 'tt0111161',
          primary_title: 'Movie 1',
          start_year: 1994,
          genres: ['Drama'],
          avg_rating: '9.3',
          poster_path: '/movie1.jpg',
        },
        availability: [],
      },
      {
        id: 2,
        watchlisted_at: '2024-01-02T00:00:00Z',
        watched_at: '2024-01-01T00:00:00Z', // Older
        movie: {
          tconst: 'tt0111162',
          primary_title: 'Movie 2',
          start_year: 1995,
          genres: ['Crime'],
          avg_rating: '9.2',
          poster_path: '/movie2.jpg',
        },
        availability: [],
      },
    ];

    mockListUserMovies.mockResolvedValue(mockData);

    const { result } = renderHook(
      () => useUserMoviesWatched({ sortKey: 'added_desc', userPlatforms: mockPlatforms }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.items).toHaveLength(2);
    });

    expect(result.current.items[0].title).toBe('Movie 1'); // Newer first
    expect(result.current.items[1].title).toBe('Movie 2'); // Older second
  });

  it('should handle movies without watched_at (place them at end)', async () => {
    const mockData = [
      {
        id: 1,
        watchlisted_at: '2024-01-01T00:00:00Z',
        watched_at: '2024-01-02T00:00:00Z',
        movie: {
          tconst: 'tt0111161',
          primary_title: 'Movie 1',
          start_year: 1994,
          genres: ['Drama'],
          avg_rating: '9.3',
          poster_path: '/movie1.jpg',
        },
        availability: [],
      },
      {
        id: 2,
        watchlisted_at: '2024-01-02T00:00:00Z',
        watched_at: null, // No watched date
        movie: {
          tconst: 'tt0111162',
          primary_title: 'Movie 2',
          start_year: 1995,
          genres: ['Crime'],
          avg_rating: '9.2',
          poster_path: '/movie2.jpg',
        },
        availability: [],
      },
    ];

    mockListUserMovies.mockResolvedValue(mockData);

    const { result } = renderHook(
      () => useUserMoviesWatched({ sortKey: 'added_desc', userPlatforms: mockPlatforms }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.items).toHaveLength(2);
    });

    expect(result.current.items[0].title).toBe('Movie 1'); // With watched_at first
    expect(result.current.items[1].title).toBe('Movie 2'); // Without watched_at last
  });

  it('should calculate isAvailableOnAnyPlatform correctly', async () => {
    const mockData = [
      {
        id: 1,
        watchlisted_at: '2024-01-01T00:00:00Z',
        watched_at: '2024-01-02T00:00:00Z',
        movie: {
          tconst: 'tt0111161',
          primary_title: 'Movie 1',
          start_year: 1994,
          genres: ['Drama'],
          avg_rating: '9.3',
          poster_path: '/movie1.jpg',
        },
        availability: [
          { platform_id: 1, platform_name: 'Netflix', is_available: true }, // User's platform
        ],
      },
      {
        id: 2,
        watchlisted_at: '2024-01-02T00:00:00Z',
        watched_at: '2024-01-03T00:00:00Z',
        movie: {
          tconst: 'tt0111162',
          primary_title: 'Movie 2',
          start_year: 1995,
          genres: ['Crime'],
          avg_rating: '9.2',
          poster_path: '/movie2.jpg',
        },
        availability: [
          { platform_id: 3, platform_name: 'Amazon', is_available: true }, // Not user's platform
        ],
      },
    ];

    mockListUserMovies.mockResolvedValue(mockData);

    const { result } = renderHook(
      () => useUserMoviesWatched({ sortKey: 'added_desc', userPlatforms: mockPlatforms }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.items).toHaveLength(2);
    });

    const netflixMovie = result.current.items.find(item => item.id === 1);
    const amazonMovie = result.current.items.find(item => item.id === 2);

    expect(netflixMovie?.isAvailableOnAnyPlatform).toBe(true); // Netflix
    expect(amazonMovie?.isAvailableOnAnyPlatform).toBe(false); // Amazon not in user platforms
  });
});
