import { Page } from "@playwright/test";

/**
 * Page Object Model for OnVOD page
 * Handles interactions with the OnVOD (all movies) page
 */
export class OnVODPage {
  constructor(private page: Page) {}

  /**
   * Wait for the page to be fully loaded
   */
  async waitForPageLoad(): Promise<void> {
    // Wait for URL to be /app/onvod
    await this.page.waitForURL("**/app/onvod**", { timeout: 60000 });

    // Wait for network to be idle
    await this.page.waitForLoadState("networkidle");

    // Wait for the page to finish loading - look for movie grid or empty state
    await Promise.race([
      this.page
        .getByTestId("onvod-movie-grid")
        .waitFor({ state: "visible", timeout: 30000 })
        .catch(() => {}),
      this.page
        .getByText("Brak filmów")
        .waitFor({ state: "visible", timeout: 30000 })
        .catch(() => {}),
    ]);
  }

  /**
   * Navigate to the OnVOD page
   */
  async navigateToOnVOD(): Promise<void> {
    await this.page.goto("/app/onvod");
  }

  /**
   * Verify that a specific movie card is present on the OnVOD page
   */
  async verifyMovieCardPresent(movieTconst: string): Promise<void> {
    await this.page
      .getByTestId(`onvod-movie-card-${movieTconst}`)
      .waitFor({ state: "visible" });
  }

  /**
   * Verify that the OnVOD movie grid is visible
   */
  async verifyOnVODGridVisible(): Promise<void> {
    await this.page
      .getByTestId("onvod-movie-grid")
      .waitFor({ state: "visible" });
  }
}
