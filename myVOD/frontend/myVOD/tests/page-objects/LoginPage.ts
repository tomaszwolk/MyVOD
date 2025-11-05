import { Page } from '@playwright/test';

/**
 * Page Object Model for Login page
 * Handles interactions with login form
 */
export class LoginPage {
  constructor(private page: Page) {}

  /**
   * Navigate to the login page
   */
  async navigateToLogin(): Promise<void> {
    await this.page.goto('/auth/login');
  }

  /**
   * Fill the login form with provided credentials
   */
  async fillLoginForm(email: string, password: string): Promise<void> {
    await this.page.getByTestId('login-email-input').fill(email);
    await this.page.getByTestId('login-password-input').fill(password);
  }

  /**
   * Submit the login form
   */
  async submitLogin(): Promise<void> {
    await this.page.getByTestId('login-submit-button').click();
  }

  /**
   * Complete the full login process
   */
  async login(email: string, password: string): Promise<void> {
    await this.navigateToLogin();
    await this.fillLoginForm(email, password);
    await this.submitLogin();
  }

  /**
   * Wait for login page to be loaded (used after logout)
   */
  async waitForLoginPage(): Promise<void> {
    await this.page.waitForURL('**/auth/login**');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Verify that user is logged out (on login page)
   */
  async verifyLoggedOutState(): Promise<void> {
    // Verify we're on login page
    await this.page.waitForURL('**/auth/login**');

    // Verify login form elements are visible
    await this.page.getByTestId('login-email-input').waitFor({ state: 'visible' });
    await this.page.getByTestId('login-password-input').waitFor({ state: 'visible' });
    await this.page.getByTestId('login-submit-button').waitFor({ state: 'visible' });
  }

  /**
   * Verify that login failed with expected error message
   */
  async verifyLoginError(expectedError: string): Promise<void> {
    // Wait for error message to appear
    await this.page.getByText(expectedError).waitFor({ state: 'visible', timeout: 10000 });
  }
}
