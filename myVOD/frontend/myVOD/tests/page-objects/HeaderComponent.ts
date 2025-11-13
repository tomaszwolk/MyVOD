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
    console.log(`Checking ${movieList.length} movies for availability...`);

    // First, collect all movie tconsts that are already on watchlist
    const watchlistMovieIds = new Set<string>();
    for (const movie of movieList) {
      try {
        const movieCard = this.page.getByTestId(`movie-card-${movie.tconst}`);
        const isVisible = await movieCard.isVisible({ timeout: 1000 }).catch(() => false);
        if (isVisible) {
          watchlistMovieIds.add(movie.tconst);
        }
      } catch (error) {
        // Continue checking other movies
        continue;
      }
    }

    // Then check watched movies
    await this.navigateToWatched();
    await this.page.waitForTimeout(1000); // Wait for page to load

    const watchedMovieIds = new Set<string>();
    for (const movie of movieList) {
      try {
        const watchedMovieCard = this.page.getByTestId(`watched-movie-card-${movie.tconst}`);
        const isVisible = await watchedMovieCard.isVisible({ timeout: 1000 }).catch(() => false);
        if (isVisible) {
          watchedMovieIds.add(movie.tconst);
        }
      } catch (error) {
        // Continue checking other movies
        continue;
      }
    }

    // Go back to watchlist
    await this.navigateToWatchlist();

    // Find the first movie that's not in either list
    for (const movie of movieList) {
      if (!watchlistMovieIds.has(movie.tconst) && !watchedMovieIds.has(movie.tconst)) {
        console.log(`Found available movie: ${movie.title} (${movie.tconst})`);
        try {
          await this.searchForMovie(movie.title);
          return movie;
        } catch (error) {
          console.log(`Failed to add movie ${movie.title}, trying next one...`);
          continue;
        }
      }
    }

    console.log('No available movies found - all test movies have been processed');
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
