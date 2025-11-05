import { Page } from '@playwright/test';

/**
 * Page Object Model for Watchlist page
 * Handles interactions with watchlist and movie verification
 */
export class WatchlistPage {
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
   * Mark a movie as watched
   */
  async markMovieAsWatched(movieId: string): Promise<void> {
    // Check if movie is actually on watchlist before trying to mark as watched
    const movieCard = this.page.getByTestId(`movie-card-${movieId}`);
    const isVisible = await movieCard.isVisible();

    if (!isVisible) {
      // Movie is not on watchlist, skip marking as watched
      return;
    }

    // Count existing toasts before action
    const initialToastCount = await this.page.locator('[data-sonner-toast]').count();

    // Find the movie card and click the "Obejrzane" button
    const markAsWatchedButton = movieCard.getByTestId('mark-as-watched-button');
    await markAsWatchedButton.click();

    // Wait for a new toast to appear (count should increase)
    await this.waitForNewToast(initialToastCount);
  }

  /**
   * Delete a movie from watchlist (soft delete)
   */
  async deleteMovieFromWatchlist(movieId: string): Promise<void> {
    // Check if movie is actually on watchlist before trying to delete
    const movieCard = this.page.getByTestId(`movie-card-${movieId}`);
    const isVisible = await movieCard.isVisible();

    if (!isVisible) {
      // Movie is not on watchlist, skip deletion
      return;
    }

    // Find the movie card and click the delete button
    const deleteButton = movieCard.getByTestId('delete-movie-button');
    await deleteButton.click();

    // Wait for confirmation dialog and confirm deletion
    await this.page.getByTestId('confirm-delete-dialog').waitFor({ state: 'visible' });
    const initialToastCount = await this.page.locator('[data-sonner-toast]').count();
    await this.page.getByTestId('confirm-delete-button').click();

    // Wait for toast notification confirming the deletion
    await this.waitForNewToast(initialToastCount);
  }

  /**
   * Wait for the page to be fully loaded
   */
  async waitForPageLoad(): Promise<void> {
    // Wait for URL to be /app/watchlist (handles redirects from /)
    await this.page.waitForURL('**/app/watchlist**', { timeout: 60000 });

    // Wait for network to be idle
    await this.page.waitForLoadState('networkidle');

    // Wait for the page to finish loading (skeleton should disappear)
    // We wait for either watchlist-grid (if there are movies) or empty state
    await Promise.race([
      this.page.getByTestId('watchlist-grid').waitFor({ state: 'visible', timeout: 30000 }).catch(() => {}),
      this.page.getByText('Twoja watchlista jest pusta').waitFor({ state: 'visible', timeout: 30000 }).catch(() => {})
    ]);
  }

  /**
   * Click the "Get AI Suggestions" button
   */
  async clickGetSuggestionsButton(): Promise<void> {
    const button = this.page.getByTestId('get-ai-suggestions-button');
    await button.click();
  }

  /**
   * Check if the "Get AI Suggestions" button is disabled
   */
  async isSuggestionsButtonDisabled(): Promise<boolean> {
    const button = this.page.getByTestId('get-ai-suggestions-button');
    return await button.isDisabled();
  }

  /**
   * Verify suggestions button is disabled (for rate limiting verification)
   */
  async verifySuggestionsButtonDisabled(): Promise<void> {
    const isDisabled = await this.isSuggestionsButtonDisabled();
    if (!isDisabled) {
      throw new Error('Expected AI suggestions button to be disabled due to rate limiting');
    }
  }
}
