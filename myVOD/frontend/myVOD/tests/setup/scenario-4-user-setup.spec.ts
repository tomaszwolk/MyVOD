import { test } from "@playwright/test";
import { RegisterPage } from "../page-objects/RegisterPage";
import { LoginPage } from "../page-objects/LoginPage";
import { OnboardingPage } from "../page-objects/OnboardingPage";
import { WatchlistPage } from "../page-objects/WatchlistPage";
import { HeaderComponent } from "../page-objects/HeaderComponent";
import { WatchedPage } from "../page-objects/WatchedPage";
import { setupApiMocks } from "./api-mocks";

/**
 * Generate unique email for scenario 4 user
 */
function generateScenario4Email(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `scenario4-${timestamp}-${random}@example.com`;
}

/**
 * Generate unique password for scenario 4 user
 */
function generateScenario4Password(): string {
  return `TestPass${Date.now()}!`;
}

// This setup runs once to create a scenario 4 user, complete onboarding, and save auth state
test.describe("Scenario 4 User Setup", () => {
  test("create scenario 4 user and save auth state", async ({ page }) => {
    test.setTimeout(180000); // 3 minutes for setup with onboarding

    // Clean up any leftover data from previous tests
    await page.context().clearCookies();

    // Generate unique user credentials
    const userEmail = generateScenario4Email();
    const userPassword = generateScenario4Password();

    // Setup API mocks for new user onboarding flow
    await setupApiMocks(page, userEmail, userPassword, false); // mockOnboardingAsComplete = false

    // Initialize Page Objects
    const registerPage = new RegisterPage(page);
    const loginPage = new LoginPage(page);
    const onboardingPage = new OnboardingPage(page);
    const watchlistPage = new WatchlistPage(page);

    // Step 1: Register new user
    console.log(`Creating scenario 4 user: ${userEmail}`);
    await registerPage.register(userEmail, userPassword);

    // After registration, wait for redirect to login page
    await page.waitForURL("**/auth/login**");

    // Step 2: Login
    await loginPage.login(userEmail, userPassword);

    // Wait for onboarding to start
    await page.waitForURL("**/onboarding/platforms**");

    // Step 3: Complete onboarding with same movies as Scenario 1
    console.log("Completing onboarding...");
    await onboardingPage.selectPlatforms(); // Selects Netflix

    await onboardingPage.manageMovies(); // Adds: Glass Onion, The Godfather (watched), Interstellar (rated)

    // Wait for redirect to OnVOD page (new default after onboarding)
    await page.waitForURL("**/app/onvod**", { timeout: 60000 });

    // Navigate to watchlist page
    await watchlistPage.navigateToWatchlist();

    // Step 4: Verify watchlist is loaded
    await watchlistPage.waitForPageLoad();

    // Verify expected movies are present
    await watchlistPage.verifyMovieCardPresent("tt11564570"); // Glass Onion

    // Check watched movies
    const headerComponent = new HeaderComponent(page);
    await headerComponent.navigateToWatched();

    const watchedPage = new WatchedPage(page);
    await watchedPage.waitForPageLoad();
    await watchedPage.verifyWatchedGridVisible();

    await watchedPage.verifyWatchedMoviePresent("tt0068646"); // The Godfather
    await watchedPage.verifyWatchedMoviePresent("tt0816692"); // Interstellar

    console.log("User created and onboarding completed. Saving auth state...");

    // Step 5: Save authentication state for future test runs
    await page.context().storageState({
      path: "./tests/e2e/setup/scenario-4-auth-state.json",
    });

    // Save user credentials to environment for the main test
    process.env.SCENARIO_4_USER_EMAIL = userEmail;
    process.env.SCENARIO_4_USER_PASSWORD = userPassword;

    console.log(`Auth state saved. User credentials: ${userEmail}`);
  });
});
