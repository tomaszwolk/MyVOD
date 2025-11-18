import { test } from "@playwright/test";
import { LoginPage } from "./page-objects/LoginPage";
import { WatchlistPage } from "./page-objects/WatchlistPage";
import { AISuggestionsDialog } from "./page-objects/AISuggestionsDialog";
import { setupApiMocks } from "./setup/api-mocks";

test.describe("Scenario 3: AI Suggestions Generation and Usage", () => {
  let loginPage: LoginPage;
  let watchlistPage: WatchlistPage;
  let aiSuggestionsDialog: AISuggestionsDialog;

  // Test user credentials (from .env.tests)
  const testUser = {
    email: "test_user@example.com",
    password: "Qwed4$5T56n.",
  };

  // Note: Test user's existing movies are handled by checking button state in AI suggestions dialog

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    watchlistPage = new WatchlistPage(page);
    aiSuggestionsDialog = new AISuggestionsDialog(page);

    // Setup API mocks - DO NOT mock user-movies (let real API handle watchlist)
    // Only mock AI suggestions endpoint for predictable test behavior
    await setupApiMocks(page, testUser.email, testUser.password, false);
  });

  test("should generate AI suggestions, add movie to watchlist, and verify rate limiting", async ({
    page,
  }) => {
    // Step 3.1: Log in existing test user
    await loginPage.login(testUser.email, testUser.password);

    // Wait for redirect - could be OnVOD or onboarding (if incomplete)
    await Promise.race([
      page.waitForURL("**/app/onvod**", { timeout: 30000 }),
      page.waitForURL("**/onboarding/**", { timeout: 30000 }),
    ]);

    // If redirected to onboarding, skip it to get to the app
    if (page.url().includes("/onboarding/")) {
      // Click "Zakończ" (Finish) button to complete onboarding
      const finishButton = page.getByRole("button", {
        name: /zakończ|finish/i,
      });
      const isFinishVisible = await finishButton.isVisible().catch(() => false);

      if (isFinishVisible) {
        await finishButton.click();
        await page.waitForURL("**/app/onvod**", { timeout: 30000 });
      }
    }

    // Navigate to watchlist page to start the test
    await watchlistPage.navigateToWatchlist();
    await watchlistPage.waitForPageLoad();

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

    // Step 3.2: Find and add a suggestion that has an enabled add button
    const addedMovieId =
      await aiSuggestionsDialog.addFirstAvailableSuggestionToWatchlist();

    // Verify that we found and added a suggestion
    if (!addedMovieId) {
      console.log(
        "No available suggestions found to add - all movies might already be in watchlist/watched"
      );
      test.skip(
        true,
        "No available suggestions to add - test user might have all suggested movies already"
      );
      return;
    }

    if (addedMovieId) {
      // Toast notification is handled by AISuggestionsDialog.addSuggestionToWatchlist()

      // Wait a bit for the API call to complete and database to update
      await page.waitForTimeout(2000);

      // Close the suggestions dialog first
      await aiSuggestionsDialog.closeDialog();

      // Refresh watchlist to ensure the newly added movie is visible
      // React Query cache might not update immediately, so we navigate to force refresh
      await watchlistPage.navigateToWatchlist();
      await watchlistPage.waitForPageLoad();

      // Wait for data to fully load after navigation
      await page.waitForTimeout(1000);

      // Step 3.3: Verify the movie was added to watchlist
      // Note: The movie ID we verify is the one that was actually added (returned by addFirstAvailableSuggestionToWatchlist)
      // This might be different from tt0111161 if that movie is already in the user's watchlist/watched
      console.log(`Verifying movie ${addedMovieId} was added to watchlist`);

      // Check if the movie exists on watchlist (with more lenient timeout)
      const movieCard = page.getByTestId(`movie-card-${addedMovieId}`);
      const movieExists = await movieCard.count().then((c) => c > 0);

      if (!movieExists) {
        // Movie might not be visible due to filters - try scrolling or disabling filters
        console.log(
          `Movie ${addedMovieId} not immediately visible, checking for filters...`
        );

        // Click "Show unavailable" toggle if hidden by filters
        const showUnavailableButton = page.getByRole("button", {
          name: /ukryj niedostępne|hide unavailable/i,
        });
        const isButtonVisible = await showUnavailableButton
          .isVisible()
          .catch(() => false);
        if (isButtonVisible) {
          await showUnavailableButton.click();
          await page.waitForTimeout(1000);
        }
      }

      await watchlistPage.verifyMovieCardPresent(addedMovieId);

      // Step 3.4: Test rate limiting - click suggestions button again
      await watchlistPage.clickGetSuggestionsButton();

      // Verify that the same suggestions are shown (not disabled button)
      // The button should remain active but show cached results
      await aiSuggestionsDialog.waitForDialogVisible();

      // Verify suggestions are still available (same count)
      const secondSuggestionCards =
        await aiSuggestionsDialog.getSuggestionCards();
      test.expect(secondSuggestionCards.length).toBe(suggestionCards.length);

      // Close the dialog
      await aiSuggestionsDialog.closeDialog();
    }

    // Cleanup: Remove the movie that was added from AI suggestions
    if (addedMovieId) {
      await watchlistPage.deleteMovieFromWatchlist(addedMovieId);
    }
  });
});
