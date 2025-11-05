import { test } from '@playwright/test';
import { RegisterPage } from './page-objects/RegisterPage';
import { LoginPage } from './page-objects/LoginPage';
import { OnboardingPage } from './page-objects/OnboardingPage';
import { WatchlistPage } from './page-objects/WatchlistPage';
import { setupApiMocks } from './setup/api-mocks';

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

test.describe('Scenariusz 1: Pełny cykl nowego użytkownika', () => {
  test('Powinien przeprowadzić użytkownika przez rejestrację, onboarding i weryfikację watchlisty', async ({ page }) => {
    test.setTimeout(120000);
    // Wydłuż timeout testu, aby wolniejsze zapytania wyszukiwania (kombinacja backend + DB) mogły zakończyć się w 60 s
    // Clean up any leftover data from previous tests
    await page.context().clearCookies();
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Arrange - Setup test data and API mocks
    const userEmail = generateUniqueEmail();
    const userPassword = generateUniquePassword();

    await setupApiMocks(page, userEmail, userPassword, false); // mockOnboardingAsComplete = false for new users

    // Initialize Page Objects
    const registerPage = new RegisterPage(page);
    const loginPage = new LoginPage(page);
    const onboardingPage = new OnboardingPage(page);
    const watchlistPage = new WatchlistPage(page);

    // Act - Execute the complete user flow

    // 1.1 Rejestracja nowego użytkownika
    await registerPage.register(userEmail, userPassword);

    // After registration, we should be redirected to login page
    // Wait for login page to load
    await page.waitForURL('**/auth/login**');

    // 1.2 Logowanie po rejestracji
    await loginPage.login(userEmail, userPassword);

    // Wait for onboarding to start (should redirect to platforms step)
    await page.waitForURL('**/onboarding/platforms**');

    // 1.3-1.5 Onboarding (3 kroki)
    await onboardingPage.completeOnboarding();

    // 1.6 Weryfikacja stanu aplikacji po onboardingu
    await watchlistPage.waitForPageLoad();
    await watchlistPage.verifyWatchlistGridVisible();

    // Verify movies are present in watchlist
    await watchlistPage.verifyMovieCardPresent('tt11564570'); // Glass Onion
    await watchlistPage.verifyMovieCardPresent('tt0068646'); // The Godfather
    await watchlistPage.verifyMovieCardPresent('tt0816692'); // Interstellar

    // Verify streaming provider icons are visible
    await watchlistPage.verifyStreamingProviderIconVisible('netflix');

    // Cleanup - delete test user data from database
    await page.context().storageState({ path: undefined }); // Clear storage state
    // Note: In production, you would add API calls here to delete test user data
    // For now, we'll rely on unique emails to avoid conflicts
  });
});
