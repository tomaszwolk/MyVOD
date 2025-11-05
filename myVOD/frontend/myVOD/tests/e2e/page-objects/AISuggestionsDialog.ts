import { Page, Locator } from '@playwright/test';

/**
 * Page Object for AI Suggestions Dialog component.
 * Handles interactions with the AI suggestions modal dialog.
 */
export class AISuggestionsDialog {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Get the main dialog locator
   */
  get dialog(): Locator {
    return this.page.locator('[data-testid="ai-suggestions-dialog"]');
  }

  /**
   * Check if the dialog is visible
   */
  async isDialogVisible(): Promise<boolean> {
    return await this.dialog.isVisible();
  }

  /**
   * Wait for the dialog to become visible
   */
  async waitForDialogVisible(timeout: number = 10000): Promise<void> {
    await this.dialog.waitFor({ state: 'visible', timeout });
  }

  /**
   * Get all suggestion cards
   */
  async getSuggestionCards(): Promise<Locator[]> {
    await this.waitForDialogVisible();
    const cards = await this.page.locator('[data-testid^="suggestion-card-"]').all();
    return cards;
  }

  /**
   * Get a specific suggestion card by movie ID
   */
  getSuggestionCard(movieId: string): Locator {
    return this.page.locator(`[data-testid="suggestion-card-${movieId}"]`);
  }

  /**
   * Get the "Add to Watchlist" button for a specific suggestion
   */
  getAddToWatchlistButton(cardLocator: Locator): Locator {
    return cardLocator.locator('[data-testid="add-suggestion-to-watchlist-button"]');
  }

  /**
   * Find and return a suggestion that is NOT already on the watchlist
   * Returns the movie ID and locator of the first available suggestion
   */
  async findAvailableSuggestion(existingMovieIds: string[]): Promise<{ movieId: string; card: Locator } | null> {
    const cards = await this.getSuggestionCards();

    for (const card of cards) {
      const cardTestId = await card.getAttribute('data-testid');
      if (!cardTestId) continue;

      // Extract movie ID from data-testid (format: "suggestion-card-tt0111161")
      const movieId = cardTestId.replace('suggestion-card-', '');

      // Check if this movie is already on the watchlist
      if (!existingMovieIds.includes(movieId)) {
        return { movieId, card };
      }
    }

    return null; // No available suggestions found
  }

  /**
   * Add a suggestion to watchlist using its card locator
   */
  async addSuggestionToWatchlist(cardLocator: Locator): Promise<void> {
    const addButton = this.getAddToWatchlistButton(cardLocator);
    await addButton.click();

    // Wait for toast notification (handled by the calling code using waitForNewToast)
  }

  /**
   * Add the first available suggestion to watchlist (that is not already on watchlist)
   */
  async addFirstAvailableSuggestionToWatchlist(existingMovieIds: string[]): Promise<string | null> {
    const availableSuggestion = await this.findAvailableSuggestion(existingMovieIds);

    if (availableSuggestion) {
      await this.addSuggestionToWatchlist(availableSuggestion.card);
      return availableSuggestion.movieId;
    }

    return null;
  }

  /**
   * Close the dialog
   */
  async closeDialog(): Promise<void> {
    // Click the close button in the dialog footer
    await this.page.locator('[data-testid="ai-suggestions-dialog"]').locator('button:has-text("Zamknij")').click();
  }
}
