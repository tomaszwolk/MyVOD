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
    await this.page.getByText(/dodano do watchlisty/).waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Find and add the first available movie from the provided list that hasn't been processed yet
   */
  async findAndAddFirstAvailableMovie(movieList: Array<{ title: string; tconst: string }>): Promise<{ title: string; tconst: string } | null> {
    for (const movie of movieList) {
      try {
        // Check if movie is already on watchlist
        const movieCard = this.page.getByTestId(`movie-card-${movie.tconst}`);
        const isOnWatchlist = await movieCard.isVisible().catch(() => false);

        // Check if movie is already in watched list
        await this.navigateToWatched();
        const watchedMovieCard = this.page.getByTestId(`watched-movie-card-${movie.tconst}`);
        const isOnWatched = await watchedMovieCard.isVisible().catch(() => false);

        // Go back to watchlist
        await this.navigateToWatchlist();

        // If movie is not on watchlist and not on watched list, we can add it
        if (!isOnWatchlist && !isOnWatched) {
          await this.searchForMovie(movie.title);
          return movie;
        }
      } catch (error) {
        // Continue to next movie if this one fails
        continue;
      }
    }

    // No available movie found
    return null;
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

  /**
   * Navigate to profile page
   */
  async navigateToProfile(): Promise<void> {
    await this.page.getByRole('button', { name: 'Profil' }).click();
    await this.page.waitForURL('**/app/profile**');
  }
}
