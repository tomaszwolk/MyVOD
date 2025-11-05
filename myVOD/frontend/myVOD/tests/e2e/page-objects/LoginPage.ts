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
}
