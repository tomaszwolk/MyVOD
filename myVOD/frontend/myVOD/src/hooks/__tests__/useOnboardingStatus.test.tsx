import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOnboardingStatus, getNextOnboardingPath, type OnboardingProgress } from '../useOnboardingStatus';
import { getUserProfile } from '@/lib/api/auth';
import { listUserMovies } from '@/lib/api/movies';
import type { UserProfileDto, UserMovieDto } from '@/types/api.types';

// Mock API functions
vi.mock('@/lib/api/auth', () => ({
  getUserProfile: vi.fn(),
}));

vi.mock('@/lib/api/movies', () => ({
  listUserMovies: vi.fn(),
}));

const mockGetUserProfile = vi.mocked(getUserProfile);
const mockListUserMovies = vi.mocked(listUserMovies);

describe('useOnboardingStatus', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockGetUserProfile.mockReset();
    mockListUserMovies.mockReset();
  });

  const createWrapper = () => {
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
    return Wrapper;
  };

  const mockUserProfile: UserProfileDto = {
    id: 1,
    email: 'user@example.com',
    platforms: [1, 2], // Has platforms
  };

  const mockWatchlistMovies: UserMovieDto[] = [
    { id: 1, movie: { tconst: 'tt1', primary_title: 'Movie 1', start_year: 2020, genres: [], avg_rating: '8.0', poster_path: null }, availability: [], watchlisted_at: '2024-01-01T00:00:00Z', watched_at: null },
    { id: 2, movie: { tconst: 'tt2', primary_title: 'Movie 2', start_year: 2021, genres: [], avg_rating: '7.5', poster_path: null }, availability: [], watchlisted_at: '2024-01-02T00:00:00Z', watched_at: null },
    { id: 3, movie: { tconst: 'tt3', primary_title: 'Movie 3', start_year: 2022, genres: [], avg_rating: '9.0', poster_path: null }, availability: [], watchlisted_at: '2024-01-03T00:00:00Z', watched_at: null },
  ];

  const mockWatchedMovies: UserMovieDto[] = [
    { id: 4, movie: { tconst: 'tt4', primary_title: 'Movie 4', start_year: 2023, genres: [], avg_rating: '8.5', poster_path: null }, availability: [], watchlisted_at: '2024-01-04T00:00:00Z', watched_at: '2024-01-05T00:00:00Z' },
    { id: 5, movie: { tconst: 'tt5', primary_title: 'Movie 5', start_year: 2024, genres: [], avg_rating: '7.0', poster_path: null }, availability: [], watchlisted_at: '2024-01-05T00:00:00Z', watched_at: '2024-01-06T00:00:00Z' },
    { id: 6, movie: { tconst: 'tt6', primary_title: 'Movie 6', start_year: 2025, genres: [], avg_rating: '8.2', poster_path: null }, availability: [], watchlisted_at: '2024-01-06T00:00:00Z', watched_at: '2024-01-07T00:00:00Z' },
  ];

  // ===== FAZA 2A: Testy podstawowej funkcjonalności =====

  describe('Basic Functionality', () => {
    it('should return loading state initially', () => {
      mockGetUserProfile.mockReturnValue(new Promise(() => {})); // Never resolves
      mockListUserMovies.mockReturnValue(new Promise(() => {}));

      const { result } = renderHook(() => useOnboardingStatus(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isOnboardingComplete).toBe(false);
      expect(result.current.requiredStep).toBeNull();
    });

    it('should return complete onboarding when all requirements met', async () => {
      mockGetUserProfile.mockResolvedValue(mockUserProfile);
      mockListUserMovies.mockImplementation((status) =>
        Promise.resolve(status === 'watchlist' ? mockWatchlistMovies : mockWatchedMovies)
      );

      const { result } = renderHook(() => useOnboardingStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isOnboardingComplete).toBe(true);
      expect(result.current.requiredStep).toBeNull();
      expect(result.current.progress).toEqual({
        hasPlatforms: true,
        hasWatchlistMovies: true,
        hasWatchedMovies: true,
      });
    });

    it('should return platforms step when no platforms selected', async () => {
      const profileWithoutPlatforms = { ...mockUserProfile, platforms: [] };
      mockGetUserProfile.mockResolvedValue(profileWithoutPlatforms);
      mockListUserMovies.mockResolvedValue([]);

      const { result } = renderHook(() => useOnboardingStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isOnboardingComplete).toBe(false);
      expect(result.current.requiredStep).toBe('/onboarding/platforms');
      expect(result.current.progress.hasPlatforms).toBe(false);
    });

    it('should return add step when platforms selected but no watchlist movies', async () => {
      mockGetUserProfile.mockResolvedValue(mockUserProfile);
      mockListUserMovies.mockImplementation((status) =>
        Promise.resolve(status === 'watchlist' ? [] : [])
      );

      const { result } = renderHook(() => useOnboardingStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isOnboardingComplete).toBe(false);
      expect(result.current.requiredStep).toBe('/onboarding/add');
      expect(result.current.progress).toEqual({
        hasPlatforms: true,
        hasWatchlistMovies: false,
        hasWatchedMovies: false,
      });
    });

    it('should return watched step when platforms and watchlist complete but no watched movies', async () => {
      mockGetUserProfile.mockResolvedValue(mockUserProfile);
      mockListUserMovies.mockImplementation((status) =>
        Promise.resolve(status === 'watchlist' ? mockWatchlistMovies : [])
      );

      const { result } = renderHook(() => useOnboardingStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isOnboardingComplete).toBe(false);
      expect(result.current.requiredStep).toBe('/onboarding/watched');
      expect(result.current.progress).toEqual({
        hasPlatforms: true,
        hasWatchlistMovies: true,
        hasWatchedMovies: false,
      });
    });
  });

  // ===== FAZA 2B: Testy edge cases i błędów =====

  describe('Edge Cases & Error Handling', () => {
    it('should handle profile loading error gracefully', async () => {
      mockGetUserProfile.mockRejectedValue(new Error('Network error'));
      mockListUserMovies.mockResolvedValue([]);

      const { result } = renderHook(() => useOnboardingStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should assume no platforms when profile fails to load
      expect(result.current.progress.hasPlatforms).toBe(false);
      expect(result.current.requiredStep).toBe('/onboarding/platforms');
    });

    it('should handle watchlist loading error gracefully', async () => {
      mockGetUserProfile.mockResolvedValue(mockUserProfile);
      mockListUserMovies.mockImplementation((status) => {
        if (status === 'watchlist') {
          return Promise.reject(new Error('Watchlist error'));
        }
        return Promise.resolve([]);
      });

      const { result } = renderHook(() => useOnboardingStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should assume no watchlist movies when loading fails
      expect(result.current.progress.hasWatchlistMovies).toBe(false);
      expect(result.current.requiredStep).toBe('/onboarding/add');
    });

    it('should handle watched loading error gracefully', async () => {
      mockGetUserProfile.mockResolvedValue(mockUserProfile);
      mockListUserMovies.mockImplementation((status) => {
        if (status === 'watched') {
          return Promise.reject(new Error('Watched error'));
        }
        return Promise.resolve(mockWatchlistMovies);
      });

      const { result } = renderHook(() => useOnboardingStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should assume no watched movies when loading fails
      expect(result.current.progress.hasWatchedMovies).toBe(false);
      expect(result.current.requiredStep).toBe('/onboarding/watched');
    });

    it('should handle null/undefined profile gracefully', async () => {
      mockGetUserProfile.mockResolvedValue(null);
      mockListUserMovies.mockResolvedValue([]);

      const { result } = renderHook(() => useOnboardingStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.progress.hasPlatforms).toBe(false);
      expect(result.current.profile).toBeNull();
    });

    it('should handle profile with null platforms array', async () => {
      const profileWithNullPlatforms = { ...mockUserProfile, platforms: null };
      mockGetUserProfile.mockResolvedValue(profileWithNullPlatforms);
      mockListUserMovies.mockResolvedValue([]);

      const { result } = renderHook(() => useOnboardingStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.progress.hasPlatforms).toBe(false);
    });

    it('should handle exactly 3 watchlist movies', async () => {
      mockGetUserProfile.mockResolvedValue(mockUserProfile);
      mockListUserMovies.mockImplementation((status) =>
        Promise.resolve(status === 'watchlist' ? mockWatchlistMovies : [])
      );

      const { result } = renderHook(() => useOnboardingStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.progress.hasWatchlistMovies).toBe(true);
    });

    it('should handle exactly 3 watched movies', async () => {
      mockGetUserProfile.mockResolvedValue(mockUserProfile);
      mockListUserMovies.mockImplementation((status) =>
        Promise.resolve(status === 'watchlist' ? mockWatchlistMovies : mockWatchedMovies)
      );

      const { result } = renderHook(() => useOnboardingStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.progress.hasWatchedMovies).toBe(true);
      expect(result.current.isOnboardingComplete).toBe(true);
    });

    it('should handle less than 3 watchlist movies', async () => {
      const insufficientWatchlist = mockWatchlistMovies.slice(0, 2); // Only 2 movies
      mockGetUserProfile.mockResolvedValue(mockUserProfile);
      mockListUserMovies.mockImplementation((status) =>
        Promise.resolve(status === 'watchlist' ? insufficientWatchlist : [])
      );

      const { result } = renderHook(() => useOnboardingStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.progress.hasWatchlistMovies).toBe(false);
      expect(result.current.requiredStep).toBe('/onboarding/add');
    });

    it('should handle less than 3 watched movies', async () => {
      const insufficientWatched = mockWatchedMovies.slice(0, 1); // Only 1 movie
      mockGetUserProfile.mockResolvedValue(mockUserProfile);
      mockListUserMovies.mockImplementation((status) =>
        Promise.resolve(status === 'watchlist' ? mockWatchlistMovies :
                       status === 'watched' ? insufficientWatched : [])
      );

      const { result } = renderHook(() => useOnboardingStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.progress.hasWatchedMovies).toBe(false);
      expect(result.current.requiredStep).toBe('/onboarding/watched');
    });

    it('should handle more than 3 movies (should still be considered complete)', async () => {
      const extraMovies = [
        ...mockWatchlistMovies,
        { id: 4, movie: { tconst: 'tt4', primary_title: 'Movie 4', start_year: 2023, genres: [], avg_rating: '8.5', poster_path: null }, availability: [], watchlisted_at: '2024-01-04T00:00:00Z', watched_at: null },
      ];

      mockGetUserProfile.mockResolvedValue(mockUserProfile);
      mockListUserMovies.mockImplementation((status) =>
        Promise.resolve(status === 'watchlist' ? extraMovies : mockWatchedMovies)
      );

      const { result } = renderHook(() => useOnboardingStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.progress.hasWatchlistMovies).toBe(true);
      expect(result.current.isOnboardingComplete).toBe(true);
    });
  });

  // ===== FAZA 2C: Testy funkcji getNextOnboardingPath =====

  describe('getNextOnboardingPath', () => {
    const completeProgress: OnboardingProgress = {
      hasPlatforms: true,
      hasWatchlistMovies: true,
      hasWatchedMovies: true,
    };

    const noPlatformsProgress: OnboardingProgress = {
      hasPlatforms: false,
      hasWatchlistMovies: false,
      hasWatchedMovies: false,
    };

    const platformsOnlyProgress: OnboardingProgress = {
      hasPlatforms: true,
      hasWatchlistMovies: false,
      hasWatchedMovies: false,
    };

    const platformsAndWatchlistProgress: OnboardingProgress = {
      hasPlatforms: true,
      hasWatchlistMovies: true,
      hasWatchedMovies: false,
    };

    it('should return fallback path when all steps complete', () => {
      const result = getNextOnboardingPath(completeProgress);
      expect(result).toBe('/');
    });

    it('should return platforms path when no platforms', () => {
      const result = getNextOnboardingPath(noPlatformsProgress);
      expect(result).toBe('/onboarding/platforms');
    });

    it('should return add path when platforms complete but no watchlist', () => {
      const result = getNextOnboardingPath(platformsOnlyProgress);
      expect(result).toBe('/onboarding/add');
    });

    it('should return watched path when platforms and watchlist complete but no watched', () => {
      const result = getNextOnboardingPath(platformsAndWatchlistProgress);
      expect(result).toBe('/onboarding/watched');
    });

    it('should return custom fallback path', () => {
      const result = getNextOnboardingPath(completeProgress, { fallback: '/dashboard' });
      expect(result).toBe('/dashboard');
    });

    it('should skip to next step from specified step', () => {
      const result = getNextOnboardingPath(platformsOnlyProgress, { fromStep: 'platforms' });
      expect(result).toBe('/onboarding/add');
    });

    it('should handle unknown fromStep gracefully', () => {
      const result = getNextOnboardingPath(platformsOnlyProgress, { fromStep: 'unknown' as 'platforms' });
      expect(result).toBe('/onboarding/platforms'); // Falls back to start
    });

    it('should handle edge case: fromStep at end of sequence', () => {
      const result = getNextOnboardingPath(completeProgress, { fromStep: 'watched' });
      expect(result).toBe('/');
    });

    it('should handle partial progress correctly', () => {
      // User has platforms and watched movies but no watchlist movies
      const partialProgress: OnboardingProgress = {
        hasPlatforms: true,
        hasWatchlistMovies: false,
        hasWatchedMovies: true,
      };

      const result = getNextOnboardingPath(partialProgress);
      expect(result).toBe('/onboarding/add'); // Should still go to add step
    });
  });

  // ===== FAZA 2D: Testy integracyjne z localStorage =====

  describe('localStorage Integration', () => {
    beforeEach(() => {
      localStorage.clear();
      vi.restoreAllMocks();
    });

    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw error
      const originalGetItem = Storage.prototype.getItem;
      Storage.prototype.getItem = vi.fn(() => {
        throw new Error('localStorage error');
      });

      mockGetUserProfile.mockResolvedValue(mockUserProfile);
      mockListUserMovies.mockResolvedValue([]);

      const { result } = renderHook(() => useOnboardingStatus(), {
        wrapper: createWrapper(),
      });

      // Should not crash and continue working
      expect(result.current.isLoading).toBe(true);

      // Restore localStorage
      Storage.prototype.getItem = originalGetItem;
    });

    it('should handle localStorage quota exceeded', () => {
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error('Quota exceeded');
      });

      mockGetUserProfile.mockResolvedValue(mockUserProfile);
      mockListUserMovies.mockResolvedValue([]);

      // Should not crash
      expect(() => {
        renderHook(() => useOnboardingStatus(), {
          wrapper: createWrapper(),
        });
      }).not.toThrow();

      // Restore localStorage
      Storage.prototype.setItem = originalSetItem;
    });

    it('should sync state across multiple hook instances', async () => {
      mockGetUserProfile.mockResolvedValue(mockUserProfile);
      mockListUserMovies.mockResolvedValue(mockWatchlistMovies);

      // First hook instance
      const { result: result1 } = renderHook(() => useOnboardingStatus(), {
        wrapper: createWrapper(),
      });

      // Second hook instance with same query client
      const { result: result2 } = renderHook(() => useOnboardingStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false);
        expect(result2.current.isLoading).toBe(false);
      });

      // Both should have same data
      expect(result1.current.progress).toEqual(result2.current.progress);
      expect(result1.current.isOnboardingComplete).toEqual(result2.current.isOnboardingComplete);
    });
  });

  // ===== FAZA 2E: Testy wydajności i optymalizacji =====

  describe('Performance & Optimization', () => {
    it('should not make unnecessary API calls when data is cached', async () => {
      mockGetUserProfile.mockResolvedValue(mockUserProfile);
      mockListUserMovies.mockResolvedValue(mockWatchlistMovies);

      // First render
      const { rerender: rerender1 } = renderHook(() => useOnboardingStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockGetUserProfile).toHaveBeenCalledTimes(1);
        expect(mockListUserMovies).toHaveBeenCalledTimes(2); // watchlist + watched
      });

      // Re-render with same data - should use cache
      rerender1();

      // API calls should not increase
      expect(mockGetUserProfile).toHaveBeenCalledTimes(1);
      expect(mockListUserMovies).toHaveBeenCalledTimes(2);
    });

    it('should handle rapid re-renders without issues', async () => {
      mockGetUserProfile.mockResolvedValue(mockUserProfile);
      mockListUserMovies.mockResolvedValue([]);

      const { rerender } = renderHook(() => useOnboardingStatus(), {
        wrapper: createWrapper(),
      });

      // Rapid re-renders
      rerender();
      rerender();
      rerender();

      await waitFor(() => {
        expect(mockGetUserProfile).toHaveBeenCalledTimes(1); // Still only 1 call due to caching
      });

      // Should not cause any issues
      expect(() => rerender()).not.toThrow();
    });

    it('should provide stable references for progress object', async () => {
      mockGetUserProfile.mockResolvedValue(mockUserProfile);
      mockListUserMovies.mockResolvedValue(mockWatchlistMovies);

      const { result, rerender } = renderHook(() => useOnboardingStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const firstProgress = result.current.progress;

      // Re-render
      rerender();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const secondProgress = result.current.progress;

      // Should be the same object reference for unchanged data
      expect(firstProgress).toBe(secondProgress);
    });
  });
});
