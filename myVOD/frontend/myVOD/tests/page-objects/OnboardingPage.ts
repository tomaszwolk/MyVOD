import { expect, Page } from "@playwright/test";

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
    await this.page
      .getByTestId("onboarding-step-1")
      .waitFor({ state: "visible" });

    // Select Netflix platform
    await this.page.getByTestId("platform-checkbox-netflix").click();

    // Click Next button and handle potential save error (retry once)
    const nextButton = this.page.getByTestId("onboarding-next-button");
    await nextButton.click();

    const saveError = this.page.getByText(
      "Network error. Please check your connection and try again.",
      { exact: false }
    );
    if (await saveError.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveError
        .waitFor({ state: "hidden", timeout: 10000 })
        .catch(() => {});
      await nextButton.click();
    }
  }

  /**
   * Step 2: Add movies to watchlist
   */
  async addMoviesToWatchlist(): Promise<void> {
    // Wait for step 2 to be visible
    const step2Container = this.page.getByTestId("onboarding-step-2");
    await step2Container.waitFor({ state: "visible" });

    // Search for and add movies to reach the required count (3)
    const moviesToAdd = ["Glass Onion", "The Godfather", "Interstellar"];

    for (const movieTitle of moviesToAdd) {
      // Type in search box
      const searchInput = step2Container.getByTestId("movie-search-combobox");
      await searchInput.fill(movieTitle);

      // Wait for search results to appear (longer timeout for database search)
      const searchResults = this.page.getByTestId("search-results-list");
      await searchResults.waitFor({ state: "visible", timeout: 60000 });

      // Find the specific movie result by its "Dodaj film do watchlisty …" button
      const escapedTitle = movieTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const addMovieButton = searchResults
        .getByRole("button", {
          name: new RegExp(`Dodaj film do watchlisty ${escapedTitle}`, "i"),
        })
        .first();

      // If the movie is already added (button disabled), skip to the next one
      if (await addMovieButton.isDisabled()) {
        continue;
      }

      await addMovieButton.click();

      // Wait for success toast to ensure the movie was fully added
      await this.page
        .getByText(`"${movieTitle}" został dodany do Twojej watchlisty`)
        .waitFor({
          state: "visible",
          timeout: 20000,
        });

      // Wait a bit for toast to disappear before next search
      await this.page.waitForTimeout(1000);

      // Close the search popover by clearing the search input
      await searchInput.fill("");

      // Wait for the card with matching heading to appear in the grid
      await step2Container
        .getByRole("heading", { level: 4, name: movieTitle })
        .waitFor({ state: "visible", timeout: 20000 });
    }

    // Verify counter shows 3/3 and three cards are rendered
    await expect(step2Container.getByRole("heading", { level: 4 })).toHaveCount(
      3,
      { timeout: 15000 }
    );
    await expect(step2Container.getByTestId("added-movies-counter")).toHaveText(
      "3/3",
      { timeout: 15000 }
    );

    // Click Next button
    await this.page.getByTestId("onboarding-next-button").click();
  }

  /**
   * Step 3: Mark movies as watched
   */
  async markMoviesAsWatched(): Promise<void> {
    // Wait for step 3 to be visible
    const step3Container = this.page.getByTestId("onboarding-step-3");
    await step3Container.waitFor({ state: "visible" });

    // Search for and mark movies as watched to reach the required count (3)
    const moviesToMark = [
      "The Dark Knight",
      "All Quiet on the Western Front",
      "Schindler's List",
    ];

    for (const movieTitle of moviesToMark) {
      // Type in search box
      const searchInput = step3Container.getByTestId("watched-search-combobox");
      await searchInput.fill("");
      await searchInput.fill(movieTitle);

      // Wait for search results popover to appear
      const searchResults = this.page.getByRole("listbox", {
        name: "Movie search results",
      });
      await searchResults.waitFor({ state: "visible", timeout: 60000 });

      const escapedTitle = movieTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const markButton = searchResults
        .getByRole("button", {
          name: new RegExp(`Oznacz jako obejrzany ${escapedTitle}`, "i"),
        })
        .first();

      await markButton.waitFor({ state: "visible", timeout: 20000 });
      await markButton.click();

      // Wait for success toast to ensure the movie was fully marked
      await this.page
        .getByText(`"${movieTitle}" oznaczono jako obejrzany`)
        .waitFor({
          state: "visible",
          timeout: 20000,
        });

      // Wait a bit for toast to disappear before next search
      await this.page.waitForTimeout(1000);

      // Clear input before next iteration
      await searchInput.fill("");

      // Wait for the selected movie to appear in the list with heading level 4
      await step3Container
        .getByRole("heading", { level: 4, name: movieTitle })
        .waitFor({ state: "visible", timeout: 20000 });
    }

    // Ensure validation counter reached 3/3 before finishing
    await expect(step3Container.getByRole("heading", { level: 4 })).toHaveCount(
      3,
      { timeout: 15000 }
    );
    await expect(step3Container.getByText("3/3", { exact: true })).toBeVisible({
      timeout: 15000,
    });
    await step3Container
      .getByText("Brakuje filmów")
      .waitFor({ state: "hidden", timeout: 10000 })
      .catch(() => {});

    // Click finish button
    await this.page.getByTestId("onboarding-finish-button").click();
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
