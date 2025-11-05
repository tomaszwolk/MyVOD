import { Page } from '@playwright/test';

/**
 * Page Object Model for Watchlist page
 * Handles interactions with watchlist and movie verification
 */
export class WatchlistPage {
  constructor(private page: Page) {}

  /**
   * Navigate to the watchlist page
   */
  async navigateToWatchlist(): Promise<void> {
    await this.page.goto('/app/watchlist');
  }

  /**
   * Verify that the watchlist grid is visible
   */
  async verifyWatchlistGridVisible(): Promise<void> {
    await this.page.getByTestId('watchlist-grid').waitFor({ state: 'visible' });
  }

  /**
   * Verify that a specific movie card is present in the watchlist
   */
  async verifyMovieCardPresent(movieTconst: string): Promise<void> {
    await this.page.getByTestId(`movie-card-${movieTconst}`).waitFor({ state: 'visible' });
  }

  /**
   * Verify that a streaming provider icon is visible for a specific platform
   */
  async verifyStreamingProviderIconVisible(platformSlug: string): Promise<void> {
    await this.page.getByTestId(`streaming-provider-icon-${platformSlug}`).waitFor({ state: 'visible' });
  }

  /**
   * Wait for the page to be fully loaded
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }
}
