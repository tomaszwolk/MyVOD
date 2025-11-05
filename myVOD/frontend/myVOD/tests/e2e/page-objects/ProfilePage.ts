import { Page } from '@playwright/test';

/**
 * Page Object Model for Profile page
 * Handles profile management and account deletion operations
 */
export class ProfilePage {
  constructor(private page: Page) {}

  /**
   * Wait for Sonner toast list to receive a new notification.
   * This makes the sync resilient to translation or formatting changes.
   */
  private async waitForNewToast(previousToastCount: number): Promise<void> {
    await this.page.waitForFunction(
      (initialCount) => {
        const toastElements = document.querySelectorAll('[data-sonner-toast]');
        return toastElements.length > initialCount;
      },
      previousToastCount,
      { timeout: 10000 }
    );

    // Allow the toast content to finish rendering before proceeding.
    await this.page.waitForTimeout(500);
  }

  /**
   * Navigate to the profile page
   */
  async navigateToProfile(): Promise<void> {
    await this.page.getByTestId('navigation-profile-link').click();
    await this.page.waitForURL('**/app/profile**');
  }

  /**
   * Wait for profile page to load
   */
  async waitForProfilePageLoad(): Promise<void> {
    await this.page.waitForURL('**/app/profile**');
    await this.page.waitForLoadState('networkidle');
    // Wait for profile content to load
    await this.page.getByTestId('platform-preferences-card').waitFor({ state: 'visible', timeout: 30000 });
  }

  /**
   * Change platform preferences by selecting/deselecting platforms
   */
  async changePlatformPreferences(platformsToSelect: string[]): Promise<void> {
    // First, deselect all currently selected platforms
    // We need to check which platforms are currently selected and deselect them
    const allPlatformNames = ['Netflix', 'HBO Max', 'Disney+', 'Amazon Prime Video', 'Apple TV+'];

    for (const platformName of allPlatformNames) {
      const checkbox = this.page.getByRole('checkbox', { name: platformName });
      const isChecked = await checkbox.isChecked();
      if (isChecked && !platformsToSelect.includes(platformName.toLowerCase().replace(' ', '-'))) {
        await checkbox.uncheck();
      }
    }

    // Then select the requested platforms
    for (const platform of platformsToSelect) {
      // Map platform names to their display names
      const displayNameMap: { [key: string]: string } = {
        'netflix': 'Netflix',
        'hbo-max': 'HBO Max',
        'disney-plus': 'Disney+',
        'amazon-prime-video': 'Amazon Prime Video',
        'apple-tv-plus': 'Apple TV+'
      };

      const displayName = displayNameMap[platform] || platform;
      const checkbox = this.page.getByRole('checkbox', { name: displayName });
      const isChecked = await checkbox.isChecked();
      if (!isChecked) {
        await checkbox.check();
      }
    }
  }

  /**
   * Save profile changes
   */
  async saveProfileChanges(): Promise<void> {
    const initialToastCount = await this.page.locator('[data-sonner-toast]').count();

    const saveButton = this.page.getByTestId('save-platforms');
    await saveButton.click();

    // Wait for confirmation toast
    await this.waitForNewToast(initialToastCount);
  }

  /**
   * Wait for save confirmation toast
   */
  async waitForSaveConfirmationToast(): Promise<void> {
    await this.page.getByText(/zapisano|updated|saved/i).waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Initiate account deletion by clicking the delete account button
   */
  async initiateAccountDeletion(): Promise<void> {
    // Find and click the delete account button
    const deleteButton = this.page.getByRole('button', { name: 'Usuń konto' });
    await deleteButton.click();
  }

  /**
   * Confirm account deletion in the modal dialog
   */
  async confirmAccountDeletion(): Promise<void> {
    // Wait for confirmation dialog to appear (AlertDialog)
    await this.page.getByRole('alertdialog').waitFor({ state: 'visible' });

    const initialToastCount = await this.page.locator('[data-sonner-toast]').count();

    // Click the confirm button
    const confirmButton = this.page.getByRole('button', { name: 'Tak, usuń konto' });
    await confirmButton.click();

    // Wait for deletion confirmation toast
    await this.waitForNewToast(initialToastCount);
  }

  /**
   * Wait for deletion confirmation toast
   */
  async waitForDeletionConfirmationToast(): Promise<void> {
    await this.page.getByText(/usunięte|deleted|account.*removed/i).waitFor({ state: 'visible', timeout: 10000 });
  }
}
