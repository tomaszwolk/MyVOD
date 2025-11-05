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

  // Mock AI suggestions endpoint for Scenario 3
  await page.route('**/api/suggestions/', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Expires in 24 hours
        suggestions: [
          {
            tconst: "tt0111161",
            primary_title: "The Shawshank Redemption",
            start_year: 1999,
            justification: "Because you liked crime dramas, you might enjoy this classic prison escape story.",
            availability: [
              { platform_id: 2, platform_name: "HBO Max", is_available: true },
              { platform_id: 3, platform_name: "Netflix", is_available: false }
            ]
          },
          {
            tconst: "tt0068646",
            primary_title: "The Godfather",
            start_year: 1972,
            justification: "Based on your interest in crime films, this masterpiece about mafia family dynamics should appeal to you.",
            availability: [
              { platform_id: 1, platform_name: "Amazon Prime", is_available: true }
            ]
          },
          {
            tconst: "tt0071562",
            primary_title: "The Godfather: Part II",
            start_year: 1974,
            justification: "Continuing your interest in organized crime sagas, this sequel explores the rise of a young Vito Corleone.",
            availability: [
              { platform_id: 2, platform_name: "HBO Max", is_available: true }
            ]
          }
        ]
      }),
    });
  });

  // Note: Using real backend for registration, login, movie search, adding movies, user profile, etc.
  // AI suggestions and onboarding status are mocked to control the test flow
}
