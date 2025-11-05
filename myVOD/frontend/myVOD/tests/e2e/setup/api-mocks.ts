import { Page } from '@playwright/test';

/**
 * Setup API mocking for E2E tests
 * Mocks all backend API calls to simulate successful responses
 */
export async function setupApiMocks(page: Page, userEmail: string, userPassword: string): Promise<void> {
  // Note: Using real backend for registration, login, and platform management
  // Only onboarding status is mocked to ensure new user flow

  // Mock onboarding status endpoint - initially return false for new user to force onboarding
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

  // Note: Using real backend for movie search, adding movies, user profile, etc.
  // Only onboarding status is mocked to ensure new user onboarding flow


  // Mock onboarding status endpoint - initially return false for new user
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
