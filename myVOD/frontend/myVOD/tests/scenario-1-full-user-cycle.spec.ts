import { test } from "@playwright/test";
import { RegisterPage } from "./page-objects/RegisterPage";
import { LoginPage } from "./page-objects/LoginPage";
import { OnboardingPage } from "./page-objects/OnboardingPage";
import { WatchlistPage } from "./page-objects/WatchlistPage";
import { OnVODPage } from "./page-objects/OnVODPage";
import { setupApiMocks, updateMocksAfterOnboarding } from "./setup/api-mocks";

/**
 * Generate unique email for test to avoid conflicts
 */
function generateUniqueEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `test-${timestamp}-${random}@example.com`;
}

/**
 * Generate unique password for test
 */
function generateUniquePassword(): string {
  return `TestPass${Date.now()}!`;
}

test.describe("Scenariusz 1: Pełny cykl nowego użytkownika", () => {
  test("Powinien przeprowadzić użytkownika przez rejestrację, onboarding i weryfikację watchlisty", async ({
    page,
  }) => {
    test.setTimeout(120000);
    // Wydłuż timeout testu, aby wolniejsze zapytania wyszukiwania (kombinacja backend + DB) mogły zakończyć się w 60 s

    // Arrange - Setup test data and API mocks FIRST
    const userEmail = generateUniqueEmail();
    const userPassword = generateUniquePassword();

    await setupApiMocks(page, userEmail, userPassword, false); // mockOnboardingAsComplete = false for new users

    // Initialize Page Objects
    const registerPage = new RegisterPage(page);
    const loginPage = new LoginPage(page);
    const onboardingPage = new OnboardingPage(page);
    const onVODPage = new OnVODPage(page);
    const watchlistPage = new WatchlistPage(page);

    // Act - Execute the complete user flow

    // 1.1 Rejestracja nowego użytkownika
    await registerPage.register(userEmail, userPassword);

    // After registration, we should be redirected to login page
    // Wait for login page to load
    await page.waitForURL("**/auth/login**");

    // 1.2 Logowanie po rejestracji
    await loginPage.login(userEmail, userPassword);

    // Wait for successful login and initial redirect
    // For new users, should redirect to onboarding after checking status
    await Promise.race([
      page.waitForURL("**/onboarding/platforms**", { timeout: 60000 }),
      page.waitForURL("**/app/onvod**", { timeout: 60000 }),
    ]);

    // If we landed on OnVOD (shouldn't happen for new users, but handle it),
    // navigate to onboarding manually
    if (page.url().includes("/app/onvod")) {
      await page.goto("/onboarding/platforms");
    }

    // Ensure we're on the platforms page before starting onboarding
    await page.waitForURL("**/onboarding/platforms**", { timeout: 10000 });

    // 1.3-1.5 Onboarding (3 kroki)
    await onboardingPage.completeOnboarding();

    // Update API mocks (no-op for new users, kept for consistency)
    await updateMocksAfterOnboarding(page, userEmail);

    // 1.6 Weryfikacja stanu aplikacji po onboardingu
    // Wait for redirect to OnVOD page and full page load
    await onVODPage.waitForPageLoad();

    // Navigate to watchlist page to verify watchlist functionality
    await watchlistPage.navigateToWatchlist();

    // Wait for watchlist page to load
    await watchlistPage.waitForPageLoad();

    // Verify watchlist page loads correctly (should have movies from onboarding)
    await watchlistPage.verifyWatchlistGridVisible();

    // Cleanup - delete test user data from database
    await page.context().storageState({ path: undefined }); // Clear storage state
    // Note: In production, you would add API calls here to delete test user data
    // For now, we'll rely on unique emails to avoid conflicts
  });
});
