import { test } from '@playwright/test';
import { LoginPage } from './page-objects/LoginPage';
import { WatchlistPage } from './page-objects/WatchlistPage';
import { AISuggestionsDialog } from './page-objects/AISuggestionsDialog';
import { setupApiMocks } from './setup/api-mocks';

test.describe('Scenario 3: AI Suggestions Generation and Usage', () => {
  let loginPage: LoginPage;
  let watchlistPage: WatchlistPage;
  let aiSuggestionsDialog: AISuggestionsDialog;

  // Test user credentials (from .env.tests)
  const testUser = {
    email: 'test_user@example.com',
    password: 'Qwed4$5T56n.'
  };

  // Movies already in test user's watchlist (based on .env.tests setup)
  const existingWatchlistMovies = [
    'tt11564570', // Glass Onion
    'tt0068646',  // The Godfather
    'tt0816692'   // Interstellar
  ];

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    watchlistPage = new WatchlistPage(page);
    aiSuggestionsDialog = new AISuggestionsDialog(page);

    // Clear localStorage between tests - execute before page load to avoid security errors
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Setup API mocks - mock onboarding as complete (existing user) and AI suggestions
    await setupApiMocks(page, testUser.email, testUser.password, true);
  });

  test('should generate AI suggestions, add movie to watchlist, and verify rate limiting', async ({ page }) => {
    // Step 3.1: Log in existing test user
    await loginPage.navigateToLogin();
    await loginPage.fillLoginForm(testUser.email, testUser.password);
    await loginPage.submitLogin();

    // Navigate to watchlist and wait for it to load
    await watchlistPage.navigateToWatchlist();

    // Step 3.1: Click "Get AI Suggestions" button
    await watchlistPage.clickGetSuggestionsButton();

    // Step 3.2: Verify dialog opens and contains suggestions
    await aiSuggestionsDialog.waitForDialogVisible();

    // Verify dialog is visible
    const isDialogVisible = await aiSuggestionsDialog.isDialogVisible();
    test.expect(isDialogVisible).toBe(true);

    // Get available suggestions
    const suggestionCards = await aiSuggestionsDialog.getSuggestionCards();
    test.expect(suggestionCards.length).toBeGreaterThan(0);

    // Step 3.2: Find and add a suggestion that is NOT already on watchlist
    const addedMovieId = await aiSuggestionsDialog.addFirstAvailableSuggestionToWatchlist(existingWatchlistMovies);

    // Verify that we found and added a suggestion
    test.expect(addedMovieId).not.toBeNull();

    if (addedMovieId) {
      // Toast notification is handled by AISuggestionsDialog.addSuggestionToWatchlist()

      // Step 3.3: Verify the movie was added to watchlist
      await watchlistPage.verifyMovieCardPresent(addedMovieId);

      // Step 3.4: Test rate limiting - click suggestions button again
      await watchlistPage.clickGetSuggestionsButton();

      // Verify that the same suggestions are shown (not disabled button)
      // The button should remain active but show cached results
      await aiSuggestionsDialog.waitForDialogVisible();

      // Verify suggestions are still available (same count)
      const secondSuggestionCards = await aiSuggestionsDialog.getSuggestionCards();
      test.expect(secondSuggestionCards.length).toBe(suggestionCards.length);

      // Close the dialog
      await aiSuggestionsDialog.closeDialog();
    }
  });
});
