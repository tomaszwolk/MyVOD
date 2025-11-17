import { Page, Route } from "@playwright/test";

/**
 * Setup API mocking for E2E tests
 * Mocks all backend API calls to simulate successful responses
 */
export async function setupApiMocks(
  page: Page,
  userEmail?: string,
  userPassword?: string,
  mockOnboardingAsComplete = false
): Promise<void> {
  // For existing users (Scenario 2), mock onboarding as complete to skip onboarding flow
  if (mockOnboardingAsComplete) {
    await page.route("**/api/onboarding/status/", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          hasPlatforms: true, // User has selected platforms
          hasWatchlistMovies: true, // User has movies in watchlist
          hasWatchedMovies: true, // User has watched movies
        }),
      });
    });

    const watchlistPayload = [
      {
        id: 1,
        movie: {
          tconst: "tt0111161",
          primary_title: "The Shawshank Redemption",
          start_year: 1994,
          genres: ["Drama"],
          avg_rating: "9.3",
          poster_path: "/poster1.jpg",
        },
        watchlisted_at: "2025-01-01T00:00:00Z",
        availability: [
          { platform_id: 1, platform_name: "Netflix", is_available: true },
        ],
      },
      {
        id: 2,
        movie: {
          tconst: "tt0068646",
          primary_title: "The Godfather",
          start_year: 1972,
          genres: ["Crime", "Drama"],
          avg_rating: "9.2",
          poster_path: "/poster2.jpg",
        },
        watchlisted_at: "2025-01-02T00:00:00Z",
        availability: [
          { platform_id: 1, platform_name: "Netflix", is_available: true },
        ],
      },
      {
        id: 3,
        movie: {
          tconst: "tt0468569",
          primary_title: "The Dark Knight",
          start_year: 2008,
          genres: ["Action", "Crime", "Drama"],
          avg_rating: "9.0",
          poster_path: "/poster3.jpg",
        },
        watchlisted_at: "2025-01-03T00:00:00Z",
        availability: [
          { platform_id: 1, platform_name: "Netflix", is_available: true },
        ],
      },
    ];

    const watchedPayload = [
      {
        id: 4,
        movie: {
          tconst: "tt0108052",
          primary_title: "Schindler's List",
          start_year: 1993,
          genres: ["Drama", "History"],
          avg_rating: "9.0",
          poster_path: "/poster4.jpg",
        },
        watched_at: "2025-01-04T00:00:00Z",
        availability: [
          { platform_id: 2, platform_name: "HBO Max", is_available: true },
        ],
      },
      {
        id: 5,
        movie: {
          tconst: "tt1016150",
          primary_title: "All Quiet on the Western Front",
          start_year: 2022,
          genres: ["Drama", "History", "War"],
          avg_rating: "8.2",
          poster_path: "/poster5.jpg",
        },
        watched_at: "2025-01-05T00:00:00Z",
        availability: [
          { platform_id: 1, platform_name: "Netflix", is_available: true },
        ],
      },
      {
        id: 6,
        movie: {
          tconst: "tt0110912",
          primary_title: "Pulp Fiction",
          start_year: 1994,
          genres: ["Crime", "Drama"],
          avg_rating: "8.9",
          poster_path: "/poster6.jpg",
        },
        watched_at: "2025-01-06T00:00:00Z",
        availability: [
          { platform_id: 3, platform_name: "Amazon Prime", is_available: true },
        ],
      },
    ];

    let watchlistIntercepted = false;
    let watchedIntercepted = false;

    const temporaryUserMoviesRoute = async (route: Route) => {
      if (route.request().method() !== "GET") {
        await route.continue();
        return;
      }

      const url = new URL(route.request().url());
      const status = url.searchParams.get("status");

      if (status === "watchlist" && !watchlistIntercepted) {
        watchlistIntercepted = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            count: watchlistPayload.length,
            next: null,
            previous: null,
            results: watchlistPayload,
          }),
        });
      } else if (status === "watched" && !watchedIntercepted) {
        watchedIntercepted = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            count: watchedPayload.length,
            next: null,
            previous: null,
            results: watchedPayload,
          }),
        });
      } else {
        await route.continue();
      }

      if (watchlistIntercepted && watchedIntercepted) {
        await page.unroute("**/api/user-movies/**", temporaryUserMoviesRoute);
      }
    };

    await page.route("**/api/user-movies/**", temporaryUserMoviesRoute);
  } else {
    // For new users (Scenario 1), mock onboarding as incomplete to force onboarding flow
    await page.route("**/api/onboarding/status/", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          hasPlatforms: false,
          hasWatchlistMovies: false,
          hasWatchedMovies: false,
        }),
      });
    });
  }

  // Mock AI suggestions endpoint for Scenario 3
  await page.route("**/api/suggestions/", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Expires in 24 hours
        suggestions: [
          {
            tconst: "tt0111161",
            primary_title: "The Shawshank Redemption",
            start_year: 1999,
            justification:
              "Because you liked crime dramas, you might enjoy this classic prison escape story.",
            availability: [
              { platform_id: 2, platform_name: "HBO Max", is_available: true },
              { platform_id: 3, platform_name: "Netflix", is_available: false },
            ],
          },
          {
            tconst: "tt0076759",
            primary_title: "Star Wars: Episode IV - A New Hope",
            start_year: 1977,
            justification:
              "Based on your interest in adventure films, you might enjoy this epic space opera.",
            availability: [
              {
                platform_id: 1,
                platform_name: "Amazon Prime",
                is_available: true,
              },
            ],
          },
          {
            tconst: "tt0080684",
            primary_title: "Star Wars: Episode V - The Empire Strikes Back",
            start_year: 1980,
            justification:
              "Continuing your interest in space adventures, this sequel delivers intense action and emotional depth.",
            availability: [
              { platform_id: 2, platform_name: "HBO Max", is_available: true },
            ],
          },
        ],
      }),
    });
  });

  // Note: Using real backend for registration, login, movie search, adding movies, etc.
  // User profile and movies are mocked for existing users to skip onboarding flow
  // AI suggestions are mocked to control the test flow
}

/**
 * Setup additional API mocks specifically for Scenario 4 (Profile Management)
 */
export async function setupScenario4Mocks(page: Page): Promise<void> {
  // Mock user preferences endpoint (GET) - returns current platform preferences
  await page.route("**/api/user/preferences/", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          platforms: ["netflix"], // Initially only Netflix is selected
        }),
      });
    }
  });

  // Mock user preferences endpoint (PUT) - updates platform preferences
  await page.route("**/api/user/preferences/", async (route) => {
    if (route.request().method() === "PUT") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Preferences updated successfully",
          platforms: ["netflix", "hbo-max"], // Updated preferences
        }),
      });
    }
  });

  // Mock account deletion endpoint
  await page.route("**/api/user/delete/", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Account deleted successfully",
      }),
    });
  });

  // Mock logout endpoint (called after account deletion)
  await page.route("**/api/auth/logout/", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Logged out successfully",
      }),
    });
  });

  // Mock user profile endpoint (GET) - returns user profile with platforms
  await page.route("**/api/me/", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          email: "scenario4-user@example.com",
          platforms: [
            { id: 1, platform_slug: "netflix", platform_name: "Netflix" },
          ],
          is_staff: false,
        }),
      });
    }
  });

  // Mock user movies endpoint (GET) - returns watchlist and watched movies
  await page.route("**/api/user-movies/", async (route) => {
    if (route.request().method() === "GET") {
      const url = new URL(route.request().url());
      const status = url.searchParams.get("status");

      let responseBody;
      if (status === "watchlist") {
        responseBody = [
          {
            id: 1,
            movie: {
              tconst: "tt11564570",
              primary_title: "Glass Onion",
              start_year: 2022,
              genres: ["Comedy", "Crime", "Drama"],
              avg_rating: "7.2",
              poster_path: "/poster1.jpg",
            },
            availability: [
              { platform_id: 1, platform_name: "Netflix", is_available: true },
            ],
            watchlisted_at: "2025-01-01T10:00:00Z",
          },
        ];
      } else if (status === "watched") {
        responseBody = [
          {
            id: 2,
            movie: {
              tconst: "tt0468569",
              primary_title: "The Dark Knight",
              start_year: 2008,
              genres: ["Action", "Crime", "Drama"],
              avg_rating: "9.0",
              poster_path: "/poster2.jpg",
            },
            availability: [
              { platform_id: 1, platform_name: "Netflix", is_available: false },
            ],
            watched_at: "2025-01-01T12:00:00Z",
          },
        ];
      } else {
        responseBody = [];
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(responseBody),
      });
    }
  });
}
