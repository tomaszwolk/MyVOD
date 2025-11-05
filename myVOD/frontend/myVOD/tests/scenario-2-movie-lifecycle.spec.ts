import { test } from '@playwright/test';
import { LoginPage } from './page-objects/LoginPage';
import { WatchlistPage } from './page-objects/WatchlistPage';
import { WatchedPage } from './page-objects/WatchedPage';
import { HeaderComponent } from './page-objects/HeaderComponent';
import { setupApiMocks } from './setup/api-mocks';

/**
 * Test constants for Scenario 2
 */
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test_user@example.com';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'Qwed4$5T56n.';

/**
 * Available test movies - test will use the first one that hasn't been processed yet
 */
const TEST_MOVIES = [
  { title: 'Pulp Fiction', tconst: 'tt0110912' },
  { title: 'Gladiator', tconst: 'tt0172495' },
  { title: 'The Wolf of Wall Street', tconst: 'tt0993846' }
];

// Will be set during test execution
let selectedMovie = TEST_MOVIES[0];

test.describe('Scenariusz 2: Podstawowy cykl życia filmu', () => {
  test('Powinien przeprowadzić pełny cykl zarządzania filmem: wyszukiwanie, dodawanie, oznaczanie jako obejrzany, przywracanie i usuwanie', async ({ page }) => {
    test.setTimeout(120000);

    // Clean up any leftover data from previous tests
    await page.context().clearCookies();
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Arrange - Setup API mocks for existing user (skip onboarding)
    await setupApiMocks(page, TEST_USER_EMAIL, TEST_USER_PASSWORD, true); // mockOnboardingAsComplete = true

    // Initialize Page Objects
    const loginPage = new LoginPage(page);
    const watchlistPage = new WatchlistPage(page);
    const watchedPage = new WatchedPage(page);
    const headerComponent = new HeaderComponent(page);

    // Act & Assert - Execute the complete movie lifecycle

    // 2.1 Logowanie istniejącego użytkownika testowego
    await loginPage.login(TEST_USER_EMAIL, TEST_USER_PASSWORD);

    // Wait for redirect to watchlist (user has completed onboarding)
    await watchlistPage.waitForPageLoad();

    // 2.2 Znajdź i dodaj pierwszy dostępny film z listy
    const availableMovie = await headerComponent.findAndAddFirstAvailableMovie(TEST_MOVIES);

    if (!availableMovie) {
      // Skip test if no available movies found
      test.skip(true, 'No available movies found for testing - all test movies have been processed');
      return;
    }

    // Set the selected movie for the rest of the test
    selectedMovie = availableMovie;
    console.log(`Using movie: ${selectedMovie.title} (${selectedMovie.tconst})`);

    // Verify movie was added to watchlist
    await watchlistPage.verifyMovieCardPresent(selectedMovie.tconst);

    // 2.3 Weryfikacja dodania filmu i oznaczenie jako obejrzany
    await watchlistPage.markMovieAsWatched(selectedMovie.tconst);

    // 2.4 Nawigacja do listy obejrzanych i weryfikacja
    await headerComponent.navigateToWatched();
    await watchedPage.waitForPageLoad();
    await watchedPage.verifyWatchedGridVisible();

    // Verify movie is present in watched list
    await watchedPage.verifyWatchedMoviePresent(selectedMovie.tconst);

    // 2.5 Przywrócenie filmu do watchlisty
    await watchedPage.restoreMovieToWatchlist(selectedMovie.tconst);

    // Navigate back to watchlist and verify movie is back
    await headerComponent.navigateToWatchlist();
    await watchlistPage.waitForPageLoad();
    await watchlistPage.verifyMovieCardPresent(selectedMovie.tconst);

    // Wait a moment for UI to fully stabilize after restore
    await page.waitForTimeout(1000);

    // 2.6 Usunięcie filmu z watchlisty
    await watchlistPage.deleteMovieFromWatchlist(selectedMovie.tconst);

    // Cleanup - clear storage state
    await page.context().storageState({ path: undefined });
  });
});
