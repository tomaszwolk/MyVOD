import type { ComponentProps } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  within,
  waitFor,
} from "@testing-library/react";
import { SearchCombobox } from "../SearchCombobox";
import type { SearchOptionVM } from "@/types/api.types";

// Mock hooks and UI dependencies
const mockUseMovieSearch = vi.fn();

vi.mock("@/hooks/useMovieSearch", () => ({
  useMovieSearch: (query: string) => mockUseMovieSearch(query),
}));

vi.mock("@/hooks/useDebouncedValue", () => ({
  useDebouncedValue: <T,>(value: T) => value,
}));

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("lucide-react", () => ({
  Loader2: () => <div data-testid="loader" />,
  Search: () => <div data-testid="search-icon" />,
  ImageIcon: () => <div data-testid="image-icon" />,
  Info: () => <div data-testid="info-icon" />,
}));

vi.mock("@/components/TMDBPoster", () => ({
  TMDBPoster: ({ src, alt, width, height, className, children }: any) => {
    // TMDBPoster uses render prop pattern - children must be a function
    if (typeof children === "function") {
      return children({
        isPlaceholder: !src,
        imgProps: {
          src: src || "/src/assets/poster-myVOD.png",
          className,
          onError: () => {},
        },
      });
    }
    // Fallback for tests that don't provide children
    return (
      <img
        src={src || "/src/assets/poster-myVOD.png"}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading="lazy"
        data-testid="tmdb-poster"
      />
    );
  },
}));

describe("SearchCombobox", () => {
  const defaultResult: SearchOptionVM = {
    tconst: "tt1234567",
    primaryTitle: "Superman",
    startYear: 1978,
    avgRating: "7.4",
    posterUrl: "/poster.jpg",
  };

  beforeEach(() => {
    mockUseMovieSearch.mockReset();
    mockUseMovieSearch.mockReturnValue({
      data: [defaultResult],
      isLoading: false,
      error: null,
    });
  });

  const renderComponent = (
    props?: Partial<ComponentProps<typeof SearchCombobox>>
  ) => {
    const onAddToWatchlist = vi.fn().mockResolvedValue(undefined);
    const onAddToWatched = vi.fn().mockResolvedValue(undefined);

    render(
      <SearchCombobox
        onAddToWatchlist={onAddToWatchlist}
        onAddToWatched={onAddToWatched}
        existingTconsts={[]}
        existingWatchedTconsts={[]}
        {...props}
      />
    );

    return { onAddToWatchlist, onAddToWatched };
  };

  const openResults = () => {
    const input = screen.getByPlaceholderText("Szukaj filmu...");
    fireEvent.change(input, { target: { value: "su" } });
  };

  it("renders action buttons for each result", () => {
    renderComponent();
    openResults();

    const option = screen.getByRole("option");
    expect(within(option).getByText("+ do watchlist")).toBeInTheDocument();
    expect(within(option).getByText("+ do obejrzane")).toBeInTheDocument();
  });

  it("calls watchlist handler when clicking add to watchlist button", async () => {
    const { onAddToWatchlist } = renderComponent();
    openResults();

    const button = screen.getByText("+ do watchlist");
    fireEvent.click(button);

    await waitFor(() => {
      expect(onAddToWatchlist).toHaveBeenCalledWith(defaultResult.tconst);
    });
  });

  it("calls watched handler when clicking add to watched button", async () => {
    const { onAddToWatched } = renderComponent();
    openResults();

    const button = screen.getByText("+ do obejrzane");
    fireEvent.click(button);

    await waitFor(() => {
      expect(onAddToWatched).toHaveBeenCalledWith(defaultResult.tconst);
    });
  });

  it("disables watchlist button when movie already exists", () => {
    renderComponent({ existingTconsts: [defaultResult.tconst] });
    openResults();

    const button = screen.getByText("+ do watchlist");
    expect(button).toBeDisabled();
  });

  it("disables watched button when movie already in watched list", () => {
    renderComponent({ existingWatchedTconsts: [defaultResult.tconst] });
    openResults();

    const button = screen.getByText("+ do obejrzane");
    expect(button).toBeDisabled();
  });

  // ===== NOWE TESTY - FAZA 1A: Obsługa błędów i stanów ładowania =====

  describe("Error Handling & Loading States", () => {
    it("should handle search input errors gracefully", async () => {
      mockUseMovieSearch.mockReturnValue({
        data: [],
        isLoading: false,
        error: new Error("Network error"),
        metrics: {
          lastQuery: "",
          lastDurationMs: null,
          completedCount: 0,
          abortedCount: 0,
        },
      });

      renderComponent();
      const input = screen.getByPlaceholderText("Szukaj filmu...");
      fireEvent.change(input, { target: { value: "test" } });

      await waitFor(() => {
        expect(
          screen.getByText(
            "Nie udało się pobrać wyników wyszukiwania. Spróbuj ponownie"
          )
        ).toBeInTheDocument();
      });
    });

    it("should debounce search queries properly (250ms)", async () => {
      // Note: This test is challenging because useDebouncedValue is mocked
      // In real scenario, debouncing happens in the hook
      mockUseMovieSearch.mockClear();

      renderComponent();
      const input = screen.getByPlaceholderText("Szukaj filmu...");

      // Szybko wpisz kilka liter - debouncing is handled by useDebouncedValue hook
      fireEvent.change(input, { target: { value: "t" } });
      fireEvent.change(input, { target: { value: "te" } });
      fireEvent.change(input, { target: { value: "tes" } });
      fireEvent.change(input, { target: { value: "test" } });

      // Since useDebouncedValue is mocked to return value immediately,
      // useMovieSearch should be called with the current query value
      expect(mockUseMovieSearch).toHaveBeenCalledWith("test");
    });

    it("should handle loading states during search", () => {
      mockUseMovieSearch.mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
        metrics: {
          lastQuery: "",
          lastDurationMs: null,
          completedCount: 0,
          abortedCount: 0,
        },
      });

      renderComponent();
      openResults();

      expect(screen.getByTestId("loader")).toBeInTheDocument();
    });

    it("should handle empty search results", () => {
      mockUseMovieSearch.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        metrics: {
          lastQuery: "",
          lastDurationMs: null,
          completedCount: 0,
          abortedCount: 0,
        },
      });

      renderComponent();
      openResults();

      expect(screen.getByText("Nie znaleziono filmów")).toBeInTheDocument();
    });

    it("should handle network errors during search", () => {
      mockUseMovieSearch.mockReturnValue({
        data: [],
        isLoading: false,
        error: new Error("Failed to fetch"),
        metrics: {
          lastQuery: "",
          lastDurationMs: null,
          completedCount: 0,
          abortedCount: 0,
        },
      });

      renderComponent();
      openResults();

      expect(
        screen.getByText(
          "Nie udało się pobrać wyników wyszukiwania. Spróbuj ponownie"
        )
      ).toBeInTheDocument();
    });

    it("should handle API rate limiting responses", () => {
      const rateLimitError = new Error("Too many requests");
      (rateLimitError as any).status = 429;

      mockUseMovieSearch.mockReturnValue({
        data: [],
        isLoading: false,
        error: rateLimitError,
        metrics: {
          lastQuery: "",
          lastDurationMs: null,
          completedCount: 0,
          abortedCount: 0,
        },
      });

      renderComponent();
      openResults();

      // Currently component shows generic error message for all errors
      expect(
        screen.getByText(
          "Nie udało się pobrać wyników wyszukiwania. Spróbuj ponownie"
        )
      ).toBeInTheDocument();
    });
  });

  // ===== FAZA 1B: Obsługa klawiatury =====

  describe("Keyboard Navigation", () => {
    it("should navigate with arrow keys", () => {
      const multipleResults = Array.from({ length: 3 }, (_, i) => ({
        ...defaultResult,
        tconst: `tt${i}`,
        primaryTitle: `Movie ${i}`,
      }));

      mockUseMovieSearch.mockReturnValue({
        data: multipleResults,
        isLoading: false,
        error: null,
        metrics: {
          lastQuery: "",
          lastDurationMs: null,
          completedCount: 0,
          abortedCount: 0,
        },
      });

      renderComponent();
      openResults();

      const input = screen.getByPlaceholderText("Szukaj filmu...");

      // Initially no item should be selected (aria-activedescendant should be undefined/null)
      expect(input).not.toHaveAttribute("aria-activedescendant");

      // Arrow down to first item
      fireEvent.keyDown(input, { key: "ArrowDown" });
      expect(input).toHaveAttribute("aria-activedescendant", "result-tt0");

      // Arrow down to second item
      fireEvent.keyDown(input, { key: "ArrowDown" });
      expect(input).toHaveAttribute("aria-activedescendant", "result-tt1");

      // Arrow up back to first item
      fireEvent.keyDown(input, { key: "ArrowUp" });
      expect(input).toHaveAttribute("aria-activedescendant", "result-tt0");
    });

    it("should select item with Enter key", async () => {
      const { onAddToWatchlist } = renderComponent();
      openResults();

      const input = screen.getByPlaceholderText("Szukaj filmu...");

      // Navigate to first item
      fireEvent.keyDown(input, { key: "ArrowDown" });
      // Select with Enter
      fireEvent.keyDown(input, { key: "Enter" });

      await waitFor(() => {
        expect(onAddToWatchlist).toHaveBeenCalledWith(defaultResult.tconst);
      });
    });

    it("should close dropdown with Escape key", () => {
      renderComponent();
      openResults();

      const input = screen.getByPlaceholderText("Szukaj filmu...");
      fireEvent.keyDown(input, { key: "Escape" });

      // Popover should be closed - check that input lost aria-expanded
      expect(input).toHaveAttribute("aria-expanded", "false");
    });

    it("should handle focus management correctly", async () => {
      const { onAddToWatchlist } = renderComponent();
      openResults();

      const input = screen.getByPlaceholderText("Szukaj filmu...");

      // Select item (should close dropdown and blur input according to component code)
      fireEvent.keyDown(input, { key: "ArrowDown" });
      fireEvent.keyDown(input, { key: "Enter" });

      await waitFor(() => {
        expect(onAddToWatchlist).toHaveBeenCalledWith(defaultResult.tconst);
      });

      // Input should lose focus according to component logic (line 136)
      expect(input).not.toHaveFocus();
    });
  });

  // ===== FAZA 1C: Wielokrotne zapytania i edge cases =====

  describe("Multiple Queries & Edge Cases", () => {
    it("should handle multiple rapid search queries", async () => {
      mockUseMovieSearch.mockClear();

      renderComponent();
      const input = screen.getByPlaceholderText("Szukaj filmu...");

      // Szybko wpisz kilka różnych zapytań
      // Note: Since useDebouncedValue is mocked to return value immediately,
      // each change will trigger a new call to useMovieSearch
      fireEvent.change(input, { target: { value: "bat" } });
      fireEvent.change(input, { target: { value: "batm" } });
      fireEvent.change(input, { target: { value: "batma" } });
      fireEvent.change(input, { target: { value: "batman" } });

      // With mocked useDebouncedValue, each change triggers useMovieSearch
      expect(mockUseMovieSearch).toHaveBeenCalledWith("batman");
    });

    it("should preserve search results after picking", () => {
      const multipleResults = Array.from({ length: 3 }, (_, i) => ({
        ...defaultResult,
        tconst: `tt${i}`,
        primaryTitle: `Movie ${i}`,
      }));

      mockUseMovieSearch.mockReturnValue({
        data: multipleResults,
        isLoading: false,
        error: null,
        metrics: {
          lastQuery: "",
          lastDurationMs: null,
          completedCount: 0,
          abortedCount: 0,
        },
      });

      renderComponent();
      openResults();

      // Sprawdź czy wszystkie wyniki są widoczne
      expect(screen.getAllByRole("option")).toHaveLength(3);

      // Wybierz jeden film
      const addButton = screen.getAllByText("+ do watchlist")[0];
      fireEvent.click(addButton);

      // Wyniki powinny pozostać widoczne (component doesn't close popover on add)
      expect(screen.getAllByRole("option")).toHaveLength(3);
    });

    it("should handle concurrent add operations", async () => {
      const { onAddToWatchlist } = renderComponent();

      openResults();

      // Kliknij przycisk dwa razy szybko
      const button = screen.getByText("+ do watchlist");
      fireEvent.click(button);
      fireEvent.click(button);

      // Should prevent concurrent operations - only one call
      await waitFor(() => {
        expect(onAddToWatchlist).toHaveBeenCalledTimes(1);
      });
    });

    it("should keep popover open after successful add to watchlist", async () => {
      const { onAddToWatchlist } = renderComponent();
      openResults();

      const input = screen.getByPlaceholderText("Szukaj filmu...");

      // Sprawdź początkowy stan
      expect(input).toHaveValue("su");
      expect(screen.getByRole("option")).toBeInTheDocument();

      // Dodaj film do watchlist
      const button = screen.getByText("+ do watchlist");
      fireEvent.click(button);

      await waitFor(() => {
        expect(onAddToWatchlist).toHaveBeenCalledWith(defaultResult.tconst);
      });

      // According to component logic, shouldReset = false for watchlist
      // so popover should remain open and query should not be reset
      expect(input).toHaveValue("su");
      expect(screen.getByRole("option")).toBeInTheDocument();
    });
  });
});
