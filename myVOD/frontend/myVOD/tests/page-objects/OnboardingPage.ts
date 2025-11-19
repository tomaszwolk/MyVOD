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
   * Step 2: Manage movies (add to watchlist, mark as watched, rate)
   */
  async manageMovies(): Promise<void> {
    const step2Container = this.page.getByTestId("onboarding-step-2");
    await step2Container.waitFor({ state: "visible" });

    const moviesToManage = [
      { title: "Glass Onion", action: "watchlist" },
      { title: "The Godfather", action: "watched" },
      { title: "Interstellar", action: "rate" },
    ];

    for (const movie of moviesToManage) {
      const searchInput = step2Container.getByTestId("onboarding-movie-search");
      await searchInput.fill(movie.title);

      const searchResults = this.page.getByTestId("search-results-list");
      await searchResults.waitFor({ state: "visible", timeout: 60000 });

      const movieRow = searchResults.locator("li", {
        has: this.page.getByRole("heading", { name: movie.title, exact: true }),
      });

      let actionButton;
      let successToastText;

      if (movie.action === "watchlist") {
        actionButton = movieRow.getByTitle("Dodaj do watchlisty");
        successToastText = `"${movie.title}" dodano do watchlisty`;
      } else if (movie.action === "watched") {
        actionButton = movieRow.getByTitle("Oznacz jako obejrzany");
        successToastText = `"${movie.title}" oznaczono jako obejrzany`;
      } else {
        // rate
        actionButton = movieRow.getByTitle("Oceń film");
        // No toast for rating, a modal opens instead
      }

      await actionButton.click();

      if (movie.action === "rate") {
        const ratingModal = this.page.getByRole("dialog");
        await ratingModal.waitFor({ state: "visible" });
        await ratingModal.getByLabel("Rating 8").click();
        await ratingModal.getByRole("button", { name: "Oceń" }).click();
        successToastText = `Oceniono "${movie.title}" na 8/10`;
      }

      if (successToastText) {
        await this.page
          .getByText(successToastText)
          .last()
          .waitFor({ state: "visible", timeout: 20000 });
      }

      await this.page.waitForTimeout(1000);
      await searchInput.fill("");

      await step2Container
        .getByRole("heading", { level: 4, name: movie.title })
        .waitFor({ state: "visible", timeout: 20000 });
    }

    await expect(step2Container.getByRole("heading", { level: 4 })).toHaveCount(
      3,
      { timeout: 15000 }
    );

    await this.page.getByTestId("onboarding-next-button").click();
  }

  /**
   * Complete entire onboarding flow
   */
  async completeOnboarding(): Promise<void> {
    await this.selectPlatforms();
    await this.manageMovies();
  }
}
