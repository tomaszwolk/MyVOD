import { expect, Page } from '@playwright/test';

/**
 * Page Object Model for Onboarding pages
 * Handles interactions with all onboarding steps
 */
export class OnboardingPage {
  constructor(private page: Page) {}

  /**
   * Step 1: Select platforms
   */
  async selectPlatforms(): Promise<void> {
    // Wait for step 1 to be visible
    await this.page.getByTestId('onboarding-step-1').waitFor({ state: 'visible' });

    // Select Netflix platform
    await this.page.getByTestId('platform-checkbox-netflix').click();

    // Click Next button
    await this.page.getByTestId('onboarding-next-button').click();
  }

  /**
   * Step 2: Add movies to watchlist
   */
  async addMoviesToWatchlist(): Promise<void> {
    // Wait for step 2 to be visible
    await this.page.getByTestId('onboarding-step-2').waitFor({ state: 'visible' });

    // Search for and add movies to reach the required count (3)
    const moviesToAdd = [
      'Glass Onion',
      'The Godfather',
      'Inception'
    ];

    let addedMoviesCount = 0;

    for (const movieTitle of moviesToAdd) {
      // Type in search box
      const searchInput = this.page.getByTestId('movie-search-combobox');
      await searchInput.fill(movieTitle);

      // Wait for search results to appear (longer timeout for database search)
      const searchResults = this.page.getByTestId('search-results-list');
      await searchResults.waitFor({ state: 'visible', timeout: 60000 });

      // Find the specific movie result by its “Add … to watchlist” button
      const escapedTitle = movieTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const addMovieButton = searchResults.getByRole('button', {
        name: new RegExp(`Add ${escapedTitle} to watchlist`, 'i')
      }).first();

      // If the movie is already added (button disabled), skip to the next one
      if (await addMovieButton.isDisabled()) {
        continue;
      }

      await addMovieButton.click();
      addedMoviesCount += 1;

      // Wait for the counter badge to reflect the new total
      await expect(this.page.getByTestId('added-movies-counter'))
        .toHaveText(`${addedMoviesCount}/3`, { timeout: 10000 });
    }

    // Verify we have at least 3 movies
    await expect(this.page.getByTestId('added-movies-counter'))
      .toHaveText('3/3', { timeout: 10000 });

    // Click Next button
    await this.page.getByTestId('onboarding-next-button').click();
  }

  /**
   * Step 3: Mark movies as watched
   */
  async markMoviesAsWatched(): Promise<void> {
    // Wait for step 3 to be visible
    await this.page.getByTestId('onboarding-step-3').waitFor({ state: 'visible' });

    // Search for and mark movies as watched to reach the required count (3)
    const moviesToMark = [
      'The Dark Knight',
      'All Quiet on the Western Front',
      'Schindler\'s List'
    ];

    for (const movieTitle of moviesToMark) {
      // Type in search box
      const searchInput = this.page.getByTestId('watched-search-combobox');
      await searchInput.fill('');
      await searchInput.fill(movieTitle);

      // Wait for search results popover to appear
      const searchResults = this.page.getByRole('listbox', { name: 'Movie search results' });
      await searchResults.waitFor({ state: 'visible', timeout: 60000 });

      const escapedTitle = movieTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const markButton = searchResults.getByRole('button', {
        name: new RegExp(`Oznacz ${escapedTitle} jako obejrzany`, 'i')
      }).first();

      await markButton.waitFor({ state: 'visible', timeout: 20000 });
      await markButton.click();

      // Wait for the selected movie to appear in the list with heading level 4
      await this.page.getByRole('heading', { level: 4, name: movieTitle }).waitFor({ state: 'visible', timeout: 30000 });
    }

    // Click finish button
    await this.page.getByTestId('onboarding-finish-button').click();
  }

  /**
   * Complete entire onboarding flow
   */
  async completeOnboarding(): Promise<void> {
    await this.selectPlatforms();
    await this.addMoviesToWatchlist();
    await this.markMoviesAsWatched();
  }
}
