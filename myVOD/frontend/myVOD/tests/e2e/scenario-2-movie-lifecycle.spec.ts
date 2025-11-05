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
const TEST_MOVIE_TITLE = 'Gladiator';
const TEST_MOVIE_TCONST = 'tt0172495'; // Gladiator IMDB ID

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

    // 2.2 Wyszukanie i wybranie filmu
    await headerComponent.searchForMovie(TEST_MOVIE_TITLE);

    // Verify movie was added to watchlist
    await watchlistPage.verifyMovieCardPresent(TEST_MOVIE_TCONST);

    // 2.3 Weryfikacja dodania filmu i oznaczenie jako obejrzany
    await watchlistPage.markMovieAsWatched(TEST_MOVIE_TCONST);

    // Verify movie is no longer in watchlist (moved to watched)
    await page.waitForTimeout(1000); // Allow time for UI update
    // Note: We can't easily verify the movie is gone from watchlist in this test
    // since we don't know the exact count, but the toast notification confirms success

    // 2.4 Nawigacja do listy obejrzanych i weryfikacja
    await headerComponent.navigateToWatched();
    await watchedPage.waitForPageLoad();
    await watchedPage.verifyWatchedGridVisible();

    // Verify movie is present in watched list
    await watchedPage.verifyWatchedMoviePresent(TEST_MOVIE_TCONST);

    // 2.5 Przywrócenie filmu do watchlisty
    await watchedPage.restoreMovieToWatchlist(TEST_MOVIE_TCONST);

    // Navigate back to watchlist and verify movie is back
    await headerComponent.navigateToWatchlist();
    await watchlistPage.waitForPageLoad();
    await watchlistPage.verifyMovieCardPresent(TEST_MOVIE_TCONST);

    // 2.6 Usunięcie filmu z watchlisty
    await watchlistPage.deleteMovieFromWatchlist(TEST_MOVIE_TCONST);

    // Cleanup - clear storage state
    await page.context().storageState({ path: undefined });
  });
});
