import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, renderWithProviders, fireEvent, waitFor } from '@/test/utils';
import { OnboardingPlatformsPage } from '../OnboardingPlatformsPage';
import { getPlatforms, patchUserPlatforms } from '@/lib/api/platforms';
import type { PlatformDto, UserProfileDto } from '@/types/api.types';

// Mock API functions
vi.mock('@/lib/api/platforms');

// Mock onboarding status hook
vi.mock('@/hooks/useOnboardingStatus', () => {
  return {
    useOnboardingStatus: vi.fn(() => ({
      progress: { hasPlatforms: true, hasWatchlistMovies: false },
      profile: { email: 'test@example.com', platforms: [{ id: 1, platform_slug: 'netflix', platform_name: 'Netflix' }] },
    })),
    getNextOnboardingPath: vi.fn(() => '/watchlist'),
  };
});

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

describe('OnboardingPlatformsPage', () => {
  const mockPlatforms: PlatformDto[] = [
    { id: 1, platform_slug: 'netflix', platform_name: 'Netflix' },
    { id: 2, platform_slug: 'hbo', platform_name: 'HBO Max' },
  ];

  const mockUserProfile: UserProfileDto = {
    email: 'test@example.com',
    platforms: [mockPlatforms[0]],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks
    vi.mocked(getPlatforms).mockResolvedValue(mockPlatforms);
    vi.mocked(patchUserPlatforms).mockResolvedValue(mockUserProfile);

    // Mock localStorage
    localStorageMock.getItem.mockReturnValue('fake-token');
  });

  it('should fetch platforms on mount', async () => {
    renderWithProviders(<OnboardingPlatformsPage />);

    await waitFor(() => {
      expect(getPlatforms).toHaveBeenCalled();
    });
  });

  it('should show loading state initially', () => {
    // Mock loading state by making getPlatforms hang
    vi.mocked(getPlatforms).mockImplementation(() => new Promise(() => {}));

    renderWithProviders(<OnboardingPlatformsPage />);

    expect(screen.getByText('Witaj w MyVOD')).toBeInTheDocument();
    expect(screen.getByText('Wybierz swoje platformy VOD')).toBeInTheDocument();
  });

  it('should show error state on platforms fetch failure', async () => {
    vi.mocked(getPlatforms).mockRejectedValue(new Error('Network error'));

    renderWithProviders(<OnboardingPlatformsPage />);

    await waitFor(() => {
      expect(screen.getByText('Błąd ładowania')).toBeInTheDocument();
    });
  });

  it('should render all components when data loaded', async () => {
    renderWithProviders(<OnboardingPlatformsPage />);

    await waitFor(() => {
      expect(screen.getByText('Witaj w MyVOD')).toBeInTheDocument();
      expect(screen.getByText('Wybierz swoje platformy VOD')).toBeInTheDocument();
      expect(screen.getByText('Wybierz platformy VOD, do których posiadasz dostęp')).toBeInTheDocument();
      expect(screen.getByText('Pomiń')).toBeInTheDocument();
      expect(screen.getByText('Dalej')).toBeInTheDocument();
    });
  });

  it('should toggle platform selection', async () => {
    renderWithProviders(<OnboardingPlatformsPage />);

    await waitFor(() => {
      expect(screen.getByText('Netflix')).toBeInTheDocument();
    });

    // Initially, Netflix should be selected (from profile)
    const netflixCard = screen.getByRole('checkbox', { name: /Netflix/i });
    expect(netflixCard).toHaveAttribute('aria-checked', 'true');

    // Click to deselect
    fireEvent.click(netflixCard);
    expect(netflixCard).toHaveAttribute('aria-checked', 'false');
  });

  it('should validate minimum selection on Next click', async () => {
    renderWithProviders(<OnboardingPlatformsPage />);

    await waitFor(() => {
      expect(screen.getByText('Dalej')).toBeInTheDocument();
    });

    // Deselect all platforms first (Netflix is pre-selected, so we need to deselect it)
    const netflixCard = screen.getByRole('checkbox', { name: /Netflix/i });
    expect(netflixCard).toHaveAttribute('aria-checked', 'true'); // Should be checked initially

    fireEvent.click(netflixCard); // Deselect Netflix
    expect(netflixCard).toHaveAttribute('aria-checked', 'false');

    // Click Next with no selection
    const nextButton = screen.getByText('Dalej');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Wybierz przynajmniej jedną platformę.')).toBeInTheDocument();
    });
  });

  it('should call patchUserPlatforms on valid Next click', async () => {
    renderWithProviders(<OnboardingPlatformsPage />);

    await waitFor(() => {
      expect(screen.getByText('Dalej')).toBeInTheDocument();
    });

    // Ensure Netflix is selected (should be pre-selected from profile)
    const netflixCard = screen.getByRole('checkbox', { name: /Netflix/i });
    expect(netflixCard).toHaveAttribute('aria-checked', 'true');

    const nextButton = screen.getByText('Dalej');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(patchUserPlatforms).toHaveBeenCalledWith([1], expect.any(Object)); // Netflix is pre-selected
    }, { timeout: 2000 });
  });

  it('should navigate to next step on success', async () => {
    renderWithProviders(<OnboardingPlatformsPage />);

    await waitFor(() => {
      expect(screen.getByText('Dalej')).toBeInTheDocument();
    });

    const nextButton = screen.getByText('Dalej');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(patchUserPlatforms).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/watchlist', { replace: true });
    }, { timeout: 2000 });
  });

  it('should handle API errors gracefully', async () => {
    // Mock API error for this test
    const mockPatchUserPlatforms = vi.mocked(patchUserPlatforms);
    mockPatchUserPlatforms.mockRejectedValueOnce({
      response: { status: 400, data: { platforms: ['Invalid platform'] } }
    });

    renderWithProviders(<OnboardingPlatformsPage />);

    await waitFor(() => {
      expect(screen.getByText('Dalej')).toBeInTheDocument();
    });

    const nextButton = screen.getByText('Dalej');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Błąd zapisu')).toBeInTheDocument();
      expect(screen.getByText('Invalid platform selection. Please try again.')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should clear validation error on platform selection', async () => {
    renderWithProviders(<OnboardingPlatformsPage />);

    await waitFor(() => {
      expect(screen.getByText('Dalej')).toBeInTheDocument();
    });

    // Deselect Netflix to have no selection
    const netflixCard = screen.getByRole('checkbox', { name: /Netflix/i });
    fireEvent.click(netflixCard); // Deselect

    // Click Next with no selection to trigger error
    const nextButton = screen.getByText('Dalej');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Wybierz przynajmniej jedną platformę.')).toBeInTheDocument();
    });

    // Select a platform
    fireEvent.click(netflixCard); // Re-select

    // Error should be cleared
    expect(screen.queryByText('Wybierz przynajmniej jedną platformę.')).not.toBeInTheDocument();
  });

  it('should disable UI during API calls', async () => {
    // Mock slow API call
    vi.mocked(patchUserPlatforms).mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100, {})));

    renderWithProviders(<OnboardingPlatformsPage />);

    await waitFor(() => {
      expect(screen.getByText('Dalej')).toBeInTheDocument();
    });

    const nextButton = screen.getByText('Dalej');
    fireEvent.click(nextButton);

    // Button should show loading state
    await waitFor(() => {
      expect(screen.getByText('Zapisuję...')).toBeInTheDocument();
    }, { timeout: 2000 });

    expect(screen.getByText('Zapisuję...')).toBeDisabled();
  });

  it('should redirect to login on 401 error', async () => {
    vi.mocked(patchUserPlatforms).mockRejectedValueOnce({
      response: { status: 401 }
    });

    renderWithProviders(<OnboardingPlatformsPage />);

    await waitFor(() => {
      expect(screen.getByText('Dalej')).toBeInTheDocument();
    });

    const nextButton = screen.getByText('Dalej');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/auth/login');
    }, { timeout: 3000 });
  });
});
