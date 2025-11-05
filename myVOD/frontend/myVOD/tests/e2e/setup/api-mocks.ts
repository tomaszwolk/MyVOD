import { Page } from '@playwright/test';

/**
 * Setup API mocking for E2E tests
 * Mocks all backend API calls to simulate successful responses
 */
export async function setupApiMocks(page: Page, userEmail?: string, userPassword?: string, mockOnboardingAsComplete = false): Promise<void> {
  // For existing users (Scenario 2), mock onboarding as complete to skip onboarding flow
  if (mockOnboardingAsComplete) {
    await page.route('**/api/onboarding/status/', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          hasPlatforms: true,  // User has selected platforms
          hasWatchlistMovies: true,  // User has movies in watchlist
          hasWatchedMovies: true,  // User has watched movies
        }),
      });
    });
  } else {
    // For new users (Scenario 1), mock onboarding as incomplete to force onboarding flow
    await page.route('**/api/onboarding/status/', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          hasPlatforms: false,
          hasWatchlistMovies: false,
          hasWatchedMovies: false,
        }),
      });
    });
  }

  // Note: Using real backend for registration, login, movie search, adding movies, user profile, etc.
  // Only onboarding status is mocked to control the user flow
}
