import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOnboardingWatchedController } from '../useOnboardingWatchedController';
import { addUserMovie, patchUserMovie, deleteUserMovie, listUserMovies } from '@/lib/api/movies';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { toast } from 'sonner';
import type { SearchOptionVM, UserMovieDto } from '@/types/api.types';

// Mock dependencies
vi.mock('@/lib/api/movies', () => ({
  addUserMovie: vi.fn(),
  patchUserMovie: vi.fn(),
  deleteUserMovie: vi.fn(),
  listUserMovies: vi.fn(),
}));

vi.mock('@/hooks/useOnboardingStatus', () => ({
  useOnboardingStatus: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(() => vi.fn()),
}));

const mockAddUserMovie = vi.mocked(addUserMovie);
const mockPatchUserMovie = vi.mocked(patchUserMovie);
const mockDeleteUserMovie = vi.mocked(deleteUserMovie);
const mockListUserMovies = vi.mocked(listUserMovies);
const mockUseOnboardingStatus = vi.mocked(useOnboardingStatus);
const mockToast = vi.mocked(toast);

// Mock data
const mockMovie: SearchOptionVM = {
  tconst: 'tt0111161',
  primaryTitle: 'The Shawshank Redemption',
  startYear: 1994,
  avgRating: '9.3',
  posterUrl: '/poster.jpg',
};

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
  availability: [],
};

const mockWatchedMovie: UserMovieDto = {
  ...mockUserMovieDto,
  id: 456,
  watched_at: '2025-01-02T10:00:00Z',
};

describe('useOnboardingWatchedController', () => {
  let queryClient: QueryClient;
  let mockNavigate: ReturnType<typeof vi.fn>;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    return { Wrapper, queryClient };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock for useOnboardingStatus
    mockUseOnboardingStatus.mockReturnValue({
      isLoading: false,
      isOnboardingComplete: false,
      requiredStep: null,
      progress: {
        hasPlatforms: true,
        hasWatchlistMovies: true,
        hasWatchedMovies: false,
      },
      profile: null,
      watchlistMovies: [],
      watchedMovies: [],
    });

    // Mock navigate
    mockNavigate = vi.fn();
    const { useNavigate } = await import('react-router-dom');
    (useNavigate as any).mockReturnValue(mockNavigate);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('initialization', () => {
    it('should initialize with empty state', () => {
      mockUseOnboardingStatus.mockReturnValue({
        isLoading: false,
        isOnboardingComplete: false,
        requiredStep: null,
        progress: {
          hasPlatforms: true,
          hasWatchlistMovies: true,
          hasWatchedMovies: false,
        },
        profile: null,
        watchlistMovies: [],
        watchedMovies: [],
      });

      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useOnboardingWatchedController(), {
        wrapper: Wrapper,
      });

      expect(result.current.viewModel.query).toBe('');
      expect(result.current.viewModel.isSubmitting).toBe(false);
      expect(result.current.viewModel.selected).toEqual([]);
      expect(result.current.viewModel.maxSelected).toBe(3);
    });

    it('should prefill with existing watched movies', () => {
      const existingWatchedMovies: UserMovieDto[] = [
        {
          id: 1,
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
          availability: [],
        },
        {
          id: 2,
          watchlisted_at: '2025-01-02T10:00:00Z',
          watched_at: '2025-01-02T11:00:00Z',
          movie: {
            tconst: 'tt0068646',
            primary_title: 'The Godfather',
            start_year: 1972,
            genres: ['Crime', 'Drama'],
            avg_rating: '9.2',
            poster_path: '/godfather.jpg',
          },
          availability: [],
        },
      ];

      mockUseOnboardingStatus.mockReturnValue({
        isLoading: false,
        isOnboardingComplete: false,
        requiredStep: null,
        progress: {
          hasPlatforms: true,
          hasWatchlistMovies: true,
          hasWatchedMovies: true,
        },
        profile: null,
        watchlistMovies: [],
        watchedMovies: existingWatchedMovies,
      });

      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useOnboardingWatchedController(), {
        wrapper: Wrapper,
      });

      expect(result.current.viewModel.selected).toHaveLength(2);
      expect(result.current.viewModel.selected[0]).toEqual({
        tconst: 'tt0111161',
        primary_title: 'The Shawshank Redemption',
        start_year: 1994,
        poster_path: '/poster.jpg',
        userMovieId: 1,
        source: 'preexisting_watched',
        status: 'success',
      });
      expect(result.current.viewModel.selected[1]).toEqual({
        tconst: 'tt0068646',
        primary_title: 'The Godfather',
        start_year: 1972,
        poster_path: '/godfather.jpg',
        userMovieId: 2,
        source: 'preexisting_watched',
        status: 'success',
      });
    });

    it('should limit prefilled movies to max 3', () => {
      const fourWatchedMovies: UserMovieDto[] = Array.from({ length: 4 }, (_, i) => ({
        id: i + 1,
        watchlisted_at: `2025-01-0${i + 1}T10:00:00Z`,
        watched_at: `2025-01-0${i + 1}T11:00:00Z`,
        movie: {
          tconst: `tt000000${i + 1}`,
          primary_title: `Movie ${i + 1}`,
          start_year: 2000 + i,
          genres: ['Drama'],
          avg_rating: '8.0',
          poster_path: `/movie${i + 1}.jpg`,
        },
        availability: [],
      }));

      mockUseOnboardingStatus.mockReturnValue({
        isLoading: false,
        isOnboardingComplete: false,
        requiredStep: null,
        progress: {
          hasPlatforms: true,
          hasWatchlistMovies: true,
          hasWatchedMovies: true,
        },
        profile: null,
        watchlistMovies: [],
        watchedMovies: fourWatchedMovies,
      });

      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useOnboardingWatchedController(), {
        wrapper: Wrapper,
      });

      expect(result.current.viewModel.selected).toHaveLength(3);
    });
  });

  describe('pick() - happy path', () => {
    it('should add movie to selected with loading status', async () => {
      mockAddUserMovie.mockResolvedValue({
        ...mockUserMovieDto,
        watchlisted_at: '2025-01-01T10:00:00Z', // Indicates newly created
      });

      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useOnboardingWatchedController(), {
        wrapper: Wrapper,
      });

      await act(async () => {
        await result.current.pick(mockMovie);
      });

      expect(result.current.viewModel.selected).toHaveLength(1);
      expect(result.current.viewModel.selected[0]).toMatchObject({
        tconst: 'tt0111161',
        primary_title: 'The Shawshank Redemption',
        start_year: 1994,
        poster_path: '/poster.jpg',
        userMovieId: 123,
        source: 'newly_created',
        status: 'success',
      });
    });

    it('should call POST /api/user-movies with tconst and mark_as_watched=true', async () => {
      mockAddUserMovie.mockResolvedValue({
        ...mockUserMovieDto,
        watchlisted_at: '2025-01-01T10:00:00Z',
      });

      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useOnboardingWatchedController(), {
        wrapper: Wrapper,
      });

      await act(async () => {
        await result.current.pick(mockMovie);
      });

      expect(mockAddUserMovie).toHaveBeenCalledWith({
        tconst: 'tt0111161',
        mark_as_watched: true,
      });
      expect(mockAddUserMovie).toHaveBeenCalledTimes(1);
    });

    it('should call PATCH mark_as_watched after successful POST', async () => {
      // POST returns newly created movie
      mockAddUserMovie.mockResolvedValue({
        ...mockUserMovieDto,
        watchlisted_at: '2025-01-01T10:00:00Z',
        watched_at: null, // Not watched yet
      });

      // PATCH should be called to mark as watched
      mockPatchUserMovie.mockResolvedValue({
        ...mockUserMovieDto,
        watched_at: '2025-01-01T11:00:00Z',
      });

      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useOnboardingWatchedController(), {
        wrapper: Wrapper,
      });

      await act(async () => {
        await result.current.pick(mockMovie);
      });

      expect(mockPatchUserMovie).toHaveBeenCalledWith(123, {
        action: 'mark_as_watched',
      });
    });

    it('should show success toast after marking as watched', async () => {
      mockAddUserMovie.mockResolvedValue({
        ...mockUserMovieDto,
        watchlisted_at: '2025-01-01T10:00:00Z',
      });

      mockPatchUserMovie.mockResolvedValue({
        ...mockUserMovieDto,
        watched_at: '2025-01-01T11:00:00Z',
      });

      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useOnboardingWatchedController(), {
        wrapper: Wrapper,
      });

      await act(async () => {
        await result.current.pick(mockMovie);
      });

      expect(mockToast.success).toHaveBeenCalledWith('"The Shawshank Redemption" oznaczono jako obejrzany');
    });
  });
});
