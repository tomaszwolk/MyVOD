import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWatchlistSelectors } from '../useWatchlistSelectors';
import type { UserMovieDto, PlatformDto } from '@/types/api.types';

describe('useWatchlistSelectors', () => {
  // Mock data
  const mockPlatforms: PlatformDto[] = [
    { id: 1, platform_slug: 'netflix', platform_name: 'Netflix' },
    { id: 2, platform_slug: 'hbo', platform_name: 'HBO' },
  ];

  const mockMovies: UserMovieDto[] = [
    {
      id: 1,
      watchlisted_at: '2024-01-03T00:00:00Z',
      watched_at: null,
      movie: {
        tconst: 'tt0111161',
        primary_title: 'The Shawshank Redemption',
        start_year: 1994,
        genres: ['Drama'],
        avg_rating: '9.3',
        poster_path: '/shawshank.jpg',
      },
      availability: [
        { platform_id: 1, platform_name: 'Netflix', is_available: true },
      ],
    },
    {
      id: 2,
      watchlisted_at: '2024-01-01T00:00:00Z',
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
        { platform_id: 2, platform_name: 'HBO', is_available: true },
      ],
    },
    {
      id: 3,
      watchlisted_at: '2024-01-02T00:00:00Z',
      watched_at: null,
      movie: {
        tconst: 'tt0071562',
        primary_title: 'The Godfather: Part II',
        start_year: 1974,
        genres: ['Crime', 'Drama'],
        avg_rating: '9.0',
        poster_path: '/godfather2.jpg',
      },
      availability: [
        { platform_id: 1, platform_name: 'Netflix', is_available: false },
        { platform_id: 2, platform_name: 'HBO', is_available: true },
      ],
    },
    {
      id: 4,
      watchlisted_at: '2024-01-04T00:00:00Z',
      watched_at: null,
      movie: {
        tconst: 'tt0047478',
        primary_title: 'Seven Samurai',
        start_year: 1954,
        genres: ['Action', 'Drama'],
        avg_rating: '8.6',
        poster_path: '/sevensamurai.jpg',
      },
      availability: [
        { platform_id: 3, platform_name: 'Amazon Prime', is_available: true }, // Platform 3 nie jest w userPlatforms
      ],
    },
  ];

  it('should return empty results when no data provided', () => {
    const { result } = renderHook(() =>
      useWatchlistSelectors({
        data: undefined,
        userPlatforms: mockPlatforms,
        sortOption: 'added_desc',
        filters: { showOnlyAvailable: false },
      })
    );

    expect(result.current.items).toEqual([]);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.visibleCount).toBe(0);
  });

  it('should sort by added_desc (newest first)', () => {
    const { result } = renderHook(() =>
      useWatchlistSelectors({
        data: mockMovies,
        userPlatforms: mockPlatforms,
        sortOption: 'added_desc',
        filters: { showOnlyAvailable: false },
      })
    );

    expect(result.current.items).toHaveLength(4);
    expect(result.current.items[0].movie.primary_title).toBe('Seven Samurai'); // 2024-01-04
    expect(result.current.items[1].movie.primary_title).toBe('The Shawshank Redemption'); // 2024-01-03
    expect(result.current.items[2].movie.primary_title).toBe('The Godfather: Part II'); // 2024-01-02
    expect(result.current.items[3].movie.primary_title).toBe('The Godfather'); // 2024-01-01
  });

  it('should sort by imdb_desc (highest rating first)', () => {
    const { result } = renderHook(() =>
      useWatchlistSelectors({
        data: mockMovies,
        userPlatforms: mockPlatforms,
        sortOption: 'imdb_desc',
        filters: { showOnlyAvailable: false },
      })
    );

    expect(result.current.items[0].movie.primary_title).toBe('The Shawshank Redemption'); // 9.3
    expect(result.current.items[1].movie.primary_title).toBe('The Godfather'); // 9.2
    expect(result.current.items[2].movie.primary_title).toBe('The Godfather: Part II'); // 9.0
  });

  it('should sort by year_desc (newest year first)', () => {
    const { result } = renderHook(() =>
      useWatchlistSelectors({
        data: mockMovies,
        userPlatforms: mockPlatforms,
        sortOption: 'year_desc',
        filters: { showOnlyAvailable: false },
      })
    );

    expect(result.current.items[0].movie.primary_title).toBe('The Shawshank Redemption'); // 1994
    expect(result.current.items[1].movie.primary_title).toBe('The Godfather: Part II'); // 1974
    expect(result.current.items[2].movie.primary_title).toBe('The Godfather'); // 1972
  });

  it('should sort by year_asc (oldest year first)', () => {
    const { result } = renderHook(() =>
      useWatchlistSelectors({
        data: mockMovies,
        userPlatforms: mockPlatforms,
        sortOption: 'year_asc',
        filters: { showOnlyAvailable: false },
      })
    );

    expect(result.current.items[0].movie.primary_title).toBe('Seven Samurai'); // 1954
    expect(result.current.items[1].movie.primary_title).toBe('The Godfather'); // 1972
    expect(result.current.items[2].movie.primary_title).toBe('The Godfather: Part II'); // 1974
    expect(result.current.items[3].movie.primary_title).toBe('The Shawshank Redemption'); // 1994
  });

  it('should filter only available movies when onlyAvailable is true', () => {
    const { result } = renderHook(() =>
      useWatchlistSelectors({
        data: mockMovies,
        userPlatforms: mockPlatforms,
        sortOption: 'added_desc',
        filters: { showOnlyAvailable: true },
      })
    );

    expect(result.current.items).toHaveLength(3);
    expect(result.current.totalCount).toBe(4);
    expect(result.current.visibleCount).toBe(3);

    // Should show movies available on user's platforms (Netflix or HBO)
    const titles = result.current.items.map(item => item.movie.primary_title);
    expect(titles).toContain('The Shawshank Redemption'); // Available on Netflix
    expect(titles).toContain('The Godfather'); // Available on HBO
    expect(titles).toContain('The Godfather: Part II'); // Available on HBO
    expect(titles).not.toContain('Seven Samurai'); // Not available on user's platforms
  });

  it('should handle movies with null ratings (sort them last)', () => {
    const moviesWithNullRating = [
      ...mockMovies,
      {
        ...mockMovies[0],
        id: 4,
        movie: {
          ...mockMovies[0].movie,
          tconst: 'tt0047478',
          primary_title: 'Seven Samurai',
          avg_rating: null,
        },
      },
    ];

    const { result } = renderHook(() =>
      useWatchlistSelectors({
        data: moviesWithNullRating,
        userPlatforms: mockPlatforms,
        sortOption: 'imdb_desc',
        filters: { showOnlyAvailable: false },
      })
    );

    expect(result.current.items[3].movie.primary_title).toBe('Seven Samurai'); // Null rating last
  });

  it('should handle movies with null years (sort them last)', () => {
    const moviesWithNullYear = [
      ...mockMovies,
      {
        ...mockMovies[0],
        id: 4,
        movie: {
          ...mockMovies[0].movie,
          tconst: 'tt0047478',
          primary_title: 'Seven Samurai',
          start_year: null,
        },
      },
    ];

    const { result } = renderHook(() =>
      useWatchlistSelectors({
        data: moviesWithNullYear,
        userPlatforms: mockPlatforms,
        sortOption: 'year_desc',
        filters: { showOnlyAvailable: false },
      })
    );

    expect(result.current.items[3].movie.primary_title).toBe('Seven Samurai'); // Null year last
  });

  it('should correctly calculate availability summary', () => {
    const { result } = renderHook(() =>
      useWatchlistSelectors({
        data: mockMovies,
        userPlatforms: mockPlatforms,
        sortOption: 'added_desc',
        filters: { showOnlyAvailable: false },
      })
    );

    expect(result.current.items[0].availabilitySummary.isAvailableOnAny).toBe(false); // Seven Samurai - no user platforms
    expect(result.current.items[0].availabilitySummary.availablePlatformIds).toEqual([]);

    expect(result.current.items[1].availabilitySummary.isAvailableOnAny).toBe(true); // Netflix
    expect(result.current.items[1].availabilitySummary.availablePlatformIds).toEqual([1]);

    expect(result.current.items[2].availabilitySummary.isAvailableOnAny).toBe(true); // HBO
    expect(result.current.items[2].availabilitySummary.availablePlatformIds).toEqual([2]);

    expect(result.current.items[3].availabilitySummary.isAvailableOnAny).toBe(true); // HBO (despite Netflix being false)
    expect(result.current.items[3].availabilitySummary.availablePlatformIds).toEqual([2]);
  });
});
