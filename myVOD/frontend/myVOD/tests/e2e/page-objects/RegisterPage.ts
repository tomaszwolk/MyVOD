import { Page } from '@playwright/test';

/**
 * Page Object Model for Register page
 * Handles interactions with registration form
 */
export class RegisterPage {
  constructor(private page: Page) {}

  /**
   * Navigate to the register page
   */
  async navigateToRegister(): Promise<void> {
    await this.page.goto('/auth/register');
  }

  /**
   * Fill the registration form with provided data
   */
  async fillRegistrationForm(email: string, password: string): Promise<void> {
    await this.page.getByTestId('register-email-input').fill(email);
    await this.page.getByTestId('register-password-input').fill(password);
    await this.page.getByTestId('register-confirm-password-input').fill(password);
  }

  /**
   * Submit the registration form
   */
  async submitRegistration(): Promise<void> {
    await this.page.getByTestId('register-submit-button').click();
  }

  /**
   * Complete the full registration process
   */
  async register(email: string, password: string): Promise<void> {
    await this.navigateToRegister();
    await this.fillRegistrationForm(email, password);
    await this.submitRegistration();
  }
}
