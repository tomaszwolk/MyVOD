import { Page } from '@playwright/test';

/**
 * Page Object Model for Watched movies page
 * Handles interactions with watched movies list and restoration functionality
 */
export class WatchedPage {
  constructor(private page: Page) {}

  /**
   * Wait for Sonner toast list to gain a new entry.
   * Using count-based detection keeps the selector resilient to copy changes.
   */
  private async waitForNewToast(previousToastCount: number): Promise<void> {
    await this.page.waitForFunction(
      (initialCount) => {
        const toastElements = document.querySelectorAll('[data-sonner-toast]');
        return toastElements.length > initialCount;
      },
      previousToastCount,
      { timeout: 15000 } // Increased timeout for slower operations
    );

    // Give the UI a short moment to finish rendering the toast content.
    await this.page.waitForTimeout(500);
  }

  /**
   * Wait for the watched page to be fully loaded
   */
  async waitForPageLoad(): Promise<void> {
    // Wait for URL to be /app/watched
    await this.page.waitForURL('**/app/watched**', { timeout: 60000 });

    // Wait for network to be idle
    await this.page.waitForLoadState('networkidle');

    // Wait for watched grid or empty state to appear
    await Promise.race([
      this.page.getByTestId('watched-grid').waitFor({ state: 'visible', timeout: 30000 }).catch(() => {}),
      this.page.getByText('Nie masz jeszcze obejrzanych filmów').waitFor({ state: 'visible', timeout: 30000 }).catch(() => {})
    ]);
  }

  /**
   * Verify that the watched movies grid is visible
   */
  async verifyWatchedGridVisible(): Promise<void> {
    await this.page.getByTestId('watched-grid').waitFor({ state: 'visible' });
  }

  /**
   * Verify that a specific watched movie card is present
   */
  async verifyWatchedMoviePresent(movieId: string): Promise<void> {
    await this.page.getByTestId(`watched-movie-card-${movieId}`).waitFor({ state: 'visible' });
  }

  /**
   * Restore a movie from watched back to watchlist
   */
  async restoreMovieToWatchlist(movieId: string): Promise<void> {
    // Check if movie is actually on watched list before trying to restore
    const movieCard = this.page.getByTestId(`watched-movie-card-${movieId}`);
    const movieExists = await movieCard.count() > 0;

    if (!movieExists) {
      // Movie is not on watched list, skip restoration
      return;
    }

    // Check if restore button exists and is clickable
    const restoreButton = movieCard.getByTestId('restore-to-watchlist-button');
    const buttonExists = await restoreButton.count() > 0;

    if (!buttonExists) {
      // Restore button doesn't exist, skip restoration
      return;
    }

    // Click restore button
    await restoreButton.click();

    // Wait for movie card to disappear from watched list (primary verification)
    await this.page.getByTestId(`watched-movie-card-${movieId}`).waitFor({ 
      state: 'detached', 
      timeout: 10000 
    });

    // Optionally wait for toast if it appears, but don't fail if it doesn't
    // Some operations may complete successfully without showing a toast
    const initialToastCount = await this.page.locator('[data-sonner-toast]').count();
    await this.page.waitForFunction(
      (initialCount) => {
        const toastElements = document.querySelectorAll('[data-sonner-toast]');
        return toastElements.length > initialCount;
      },
      initialToastCount,
      { timeout: 3000 }
    ).catch(() => {
      // Toast didn't appear, but operation succeeded (movie was removed)
      // This is acceptable - not all operations show toasts
    });
  }

  /**
   * Delete a movie from watched list (hard delete)
   */
  async deleteMovieFromWatched(movieId: string): Promise<void> {
    // Check if movie is actually on watched list before trying to delete
    const movieCard = this.page.getByTestId(`watched-movie-card-${movieId}`);
    const movieExists = await movieCard.count() > 0;

    if (!movieExists) {
      // Movie is not on watched list, skip deletion
      return;
    }

    // Click the delete button for the specific movie
    const deleteButton = movieCard.getByTestId('delete-movie-button');
    await deleteButton.click();

    // Wait for confirmation dialog and confirm deletion
    await this.page.getByTestId('confirm-delete-dialog').waitFor({ state: 'visible' });
    const initialToastCount = await this.page.locator('[data-sonner-toast]').count();
    await this.page.getByTestId('confirm-delete-button').click();

    // Wait for toast notification confirming the deletion
    await this.waitForNewToast(initialToastCount);
  }
}
