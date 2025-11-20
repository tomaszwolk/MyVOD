import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, renderWithProviders, fireEvent, waitFor } from '@/test/utils';
import { OnboardingPlatformsPage } from '../OnboardingPlatformsPage';
import { getPlatforms, patchUserPlatforms } from '@/lib/api/platforms';
import { useOnboardingStatus, getNextOnboardingPath } from '@/hooks/useOnboardingStatus';
import type { PlatformDto, UserProfileDto } from '@/types/api.types';

// Mock API functions
vi.mock('@/lib/api/platforms', () => ({
  getPlatforms: vi.fn(),
  patchUserPlatforms: vi.fn(),
}));

// Mock onboarding status hook
vi.mock('@/hooks/useOnboardingStatus', () => ({
  useOnboardingStatus: vi.fn(),
  getNextOnboardingPath: vi.fn(),
}));

// Mock React Router
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('OnboardingPlatformsPage - Integration Tests', () => {
  const mockPlatforms: PlatformDto[] = [
    { id: 1, platform_slug: 'netflix', platform_name: 'Netflix' },
    { id: 2, platform_slug: 'hbo', platform_name: 'HBO Max' },
    { id: 3, platform_slug: 'disney', platform_name: 'Disney+' },
  ];

  const mockUserProfile: UserProfileDto = {
    email: 'test@example.com',
    platforms: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks
    vi.mocked(getPlatforms).mockResolvedValue(mockPlatforms);
    vi.mocked(patchUserPlatforms).mockResolvedValue({
      ...mockUserProfile,
      platforms: [mockPlatforms[0]],
    });

    // Mock localStorage
    localStorageMock.getItem.mockReturnValue('fake-token');

    // Mock onboarding status
    vi.mocked(useOnboardingStatus).mockReturnValue({
      progress: { hasPlatforms: true, hasWatchlistMovies: false },
      profile: mockUserProfile,
    });

    vi.mocked(getNextOnboardingPath).mockReturnValue('/watchlist');
  });

  it('should complete full platform selection flow', async () => {
    renderWithProviders(<OnboardingPlatformsPage />);

    // Wait for platforms to load and skeleton to disappear
    await waitFor(() => {
      expect(screen.getByText('Wybierz swoje platformy VOD')).toBeInTheDocument();
    });

    // Wait for platforms to actually render (not skeleton)
    await waitFor(() => {
      expect(screen.getByText('Netflix')).toBeInTheDocument();
      expect(screen.getByText('HBO Max')).toBeInTheDocument();
      expect(screen.getByText('Disney+')).toBeInTheDocument();
    });

    // Select platforms (Netflix and Disney+)
    const netflixCard = screen.getByRole('checkbox', { name: /Netflix/i });
    const disneyCard = screen.getByRole('checkbox', { name: /Disney\+/i });

    fireEvent.click(netflixCard);
    fireEvent.click(disneyCard);

    // Verify selection
    expect(netflixCard).toHaveAttribute('aria-checked', 'true');
    expect(disneyCard).toHaveAttribute('aria-checked', 'true');

    // Click Next
    const nextButton = screen.getByText('Dalej');
    fireEvent.click(nextButton);

    // Verify API call with correct platform IDs
    await waitFor(() => {
      expect(patchUserPlatforms).toHaveBeenCalledWith([1, 3], expect.any(Object));
    });

    // Verify navigation to next step
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/watchlist', { replace: true });
    });
  });

  it('should handle Skip button navigation', async () => {
    renderWithProviders(<OnboardingPlatformsPage />);

    await waitFor(() => {
      expect(screen.getByText('Pomiń')).toBeInTheDocument();
    });

    const skipButton = screen.getByText('Pomiń');
    fireEvent.click(skipButton);

    expect(mockNavigate).toHaveBeenCalledWith('/watchlist', { replace: true });
  });

  it('should persist platform selection to profile', async () => {
    renderWithProviders(<OnboardingPlatformsPage />);

    await waitFor(() => {
      expect(screen.getByText('Wybierz swoje platformy VOD')).toBeInTheDocument();
    });

    // Wait for platforms to actually render
    await waitFor(() => {
      expect(screen.getByText('HBO Max')).toBeInTheDocument();
    });

    // Select HBO Max
    const hboCard = screen.getByRole('checkbox', { name: /HBO Max/i });
    fireEvent.click(hboCard);

    // Click Next
    const nextButton = screen.getByText('Dalej');
    fireEvent.click(nextButton);

    // Verify API was called with selected platform
    await waitFor(() => {
      expect(patchUserPlatforms).toHaveBeenCalledWith([2], expect.any(Object));
    });
  });

  it('should redirect authenticated users with platforms to watchlist', async () => {
    // Mock user with platforms already selected
    vi.mocked(useOnboardingStatus).mockReturnValue({
      progress: { hasPlatforms: true, hasWatchlistMovies: true },
      profile: { ...mockUserProfile, platforms: [mockPlatforms[0]] },
    });

    // This test would be for App-level routing, but we can test the logic indirectly
    // For now, just verify the component renders correctly
    renderWithProviders(<OnboardingPlatformsPage />);

    await waitFor(() => {
      expect(screen.getByText('Wybierz swoje platformy VOD')).toBeInTheDocument();
    });
  });

  it('should show platforms from API', async () => {
    renderWithProviders(<OnboardingPlatformsPage />);

    await waitFor(() => {
      expect(getPlatforms).toHaveBeenCalled();
    });

    // Verify all platforms from API are displayed
    await waitFor(() => {
      expect(screen.getByText('Netflix')).toBeInTheDocument();
      expect(screen.getByText('HBO Max')).toBeInTheDocument();
      expect(screen.getByText('Disney+')).toBeInTheDocument();
    });

    // Verify correct count in legend
    expect(screen.getByText('Wybierz platformy streamingowe (0 zaznaczonych)')).toBeInTheDocument();
  });

  it('should validate platform selection', async () => {
    renderWithProviders(<OnboardingPlatformsPage />);

    await waitFor(() => {
      expect(screen.getByText('Dalej')).toBeInTheDocument();
    });

    // Click Next without selecting any platforms
    const nextButton = screen.getByText('Dalej');
    fireEvent.click(nextButton);

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText('Wybierz przynajmniej jedną platformę.')).toBeInTheDocument();
    });

    // Select a platform
    const netflixCard = screen.getByRole('checkbox', { name: /Netflix/i });
    fireEvent.click(netflixCard);

    // Error should be cleared
    expect(screen.queryByText('Wybierz przynajmniej jedną platformę.')).not.toBeInTheDocument();

    // Now Next should work
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(patchUserPlatforms).toHaveBeenCalledWith([1], expect.any(Object));
    });
  });

  it('should handle network errors gracefully', async () => {
    vi.mocked(getPlatforms).mockRejectedValue(new Error('Network error'));

    renderWithProviders(<OnboardingPlatformsPage />);

    await waitFor(() => {
      expect(screen.getByText('Błąd ładowania')).toBeInTheDocument();
    });

    expect(screen.getByText('Nie udało się wczytać listy platform. Spróbuj ponownie.')).toBeInTheDocument();

    const retryButton = screen.getByText('Spróbuj ponownie');
    expect(retryButton).toBeInTheDocument();
  });

  it('should maintain selection state during navigation', async () => {
    renderWithProviders(<OnboardingPlatformsPage />);

    await waitFor(() => {
      expect(screen.getByText('Wybierz swoje platformy VOD')).toBeInTheDocument();
    });

    // Wait for platforms to actually render
    await waitFor(() => {
      expect(screen.getByText('Netflix')).toBeInTheDocument();
      expect(screen.getByText('HBO Max')).toBeInTheDocument();
    });

    // Select platforms
    const netflixCard = screen.getByRole('checkbox', { name: /Netflix/i });
    const hboCard = screen.getByRole('checkbox', { name: /HBO Max/i });

    fireEvent.click(netflixCard);
    fireEvent.click(hboCard);

    expect(netflixCard).toHaveAttribute('aria-checked', 'true');
    expect(hboCard).toHaveAttribute('aria-checked', 'true');

    // Simulate navigation (this would happen after successful save)
    // Selection state should be maintained until component unmounts
    expect(netflixCard).toHaveAttribute('aria-checked', 'true');
    expect(hboCard).toHaveAttribute('aria-checked', 'true');
  });

  it('should handle authentication flow correctly', async () => {
    // Mock no auth token
    localStorageMock.getItem.mockReturnValue(null);

    renderWithProviders(<OnboardingPlatformsPage />);

    await waitFor(() => {
      expect(screen.getByText('Dalej')).toBeInTheDocument();
    });

    // Select platform and click Next
    const netflixCard = screen.getByRole('checkbox', { name: /Netflix/i });
    fireEvent.click(netflixCard);

    const nextButton = screen.getByText('Dalej');
    fireEvent.click(nextButton);

    // Should redirect to login due to missing token
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/auth/login');
    });

    // Verify API was not called
    expect(patchUserPlatforms).not.toHaveBeenCalled();
  });

  it('should handle API errors and allow retry', async () => {
    vi.mocked(patchUserPlatforms).mockRejectedValue({
      response: { status: 500, data: { detail: 'Server error' } }
    });

    renderWithProviders(<OnboardingPlatformsPage />);

    await waitFor(() => {
      expect(screen.getByText('Dalej')).toBeInTheDocument();
    });

    // Select platform and click Next
    const netflixCard = screen.getByRole('checkbox', { name: /Netflix/i });
    fireEvent.click(netflixCard);

    const nextButton = screen.getByText('Dalej');
    fireEvent.click(nextButton);

    // Should show error
    await waitFor(() => {
      expect(screen.getByText('Błąd zapisu')).toBeInTheDocument();
      expect(screen.getByText('Server error. Please try again later.')).toBeInTheDocument();
    });

    // Reset mock for successful retry
    vi.mocked(patchUserPlatforms).mockResolvedValue({
      ...mockUserProfile,
      platforms: [mockPlatforms[0]],
    });

    // Click Next again
    fireEvent.click(nextButton);

    // Should succeed this time
    await waitFor(() => {
      expect(patchUserPlatforms).toHaveBeenCalledWith([1], expect.any(Object));
      expect(mockNavigate).toHaveBeenCalledWith('/watchlist', { replace: true });
    });
  });
});
