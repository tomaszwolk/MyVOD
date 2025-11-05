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
            tconst: "tt0076759",
            primary_title: "Star Wars: Episode IV - A New Hope",
            start_year: 1977,
            justification: "Based on your interest in adventure films, you might enjoy this epic space opera.",
            availability: [
              { platform_id: 1, platform_name: "Amazon Prime", is_available: true }
            ]
          },
          {
            tconst: "tt0080684",
            primary_title: "Star Wars: Episode V - The Empire Strikes Back",
            start_year: 1980,
            justification: "Continuing your interest in space adventures, this sequel delivers intense action and emotional depth.",
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
