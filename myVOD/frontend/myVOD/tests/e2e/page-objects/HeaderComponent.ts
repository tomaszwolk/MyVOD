import { Page } from '@playwright/test';

/**
 * Page Object Model for Header Component - handles movie search functionality
 * Used across watchlist and watched pages for movie search operations
 */
export class HeaderComponent {
  constructor(private page: Page) {}

  /**
   * Search for a movie and add it to watchlist using the first available "add to watchlist" button
   */
  async searchForMovie(movieTitle: string): Promise<void> {
    // Click on the search input to open the popover
    await this.page.getByPlaceholder('Szukaj filmu...').click();

    // Type the movie title
    await this.page.getByPlaceholder('Szukaj filmu...').fill(movieTitle);

    // Wait for search results to appear
    await this.page.getByTestId('search-results-list').waitFor({ state: 'visible' });

    // Find and click the first available "add to watchlist" button (not disabled)
    const firstEnabledAddButton = this.page.locator('button:not([disabled]):has-text("+ do watchlist")').first();
    await firstEnabledAddButton.waitFor({ state: 'visible' });
    await firstEnabledAddButton.click();

    // Wait for toast notification confirming the action
    await this.page.getByText('dodano do watchlisty').waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Navigate to watched movies page
   */
  async navigateToWatched(): Promise<void> {
    await this.page.getByRole('button', { name: 'Obejrzane' }).click();
    await this.page.waitForURL('**/app/watched**');
  }

  /**
   * Navigate to watchlist page
   */
  async navigateToWatchlist(): Promise<void> {
    await this.page.getByRole('button', { name: 'Watchlista' }).click();
    await this.page.waitForURL('**/app/watchlist**');
  }
}
