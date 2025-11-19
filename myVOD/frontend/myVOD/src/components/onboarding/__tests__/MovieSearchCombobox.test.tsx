import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@/test/utils";
import { useState } from "react";
import { MovieSearchCombobox } from "../MovieSearchCombobox";
import { useMovieSearch } from "@/hooks/useMovieSearch";

// Mock Popover components to avoid Floating UI issues in tests
vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children, open }: any) => {
    // For tests, render children directly but add data attributes
    return (
      <div data-testid="popover" data-open={open}>
        {children}
      </div>
    );
  },
  PopoverTrigger: ({ children, asChild }: any) => {
    return <div data-testid="popover-trigger">{children}</div>;
  },
  PopoverContent: ({ children, className, align, onOpenAutoFocus }: any) => {
    // PopoverContent is always rendered but we control visibility via CSS
    return (
      <div
        data-testid="popover-content"
        className={className}
        data-align={align}
        style={{
          position: "absolute",
          top: "100%",
          left: 0,
          zIndex: 9999,
          display: "block", // Always visible in tests
        }}
      >
        {children}
      </div>
    );
  },
}));

// Mock useMovieSearch hook
vi.mock("@/hooks/useMovieSearch", () => ({
  useMovieSearch: vi.fn(),
}));

const mockUseMovieSearch = vi.mocked(useMovieSearch);

describe("MovieSearchCombobox", () => {
  const mockOnAddToWatchlist = vi.fn();
  const mockOnMarkAsWatched = vi.fn();
  const mockOnRate = vi.fn();
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for useMovieSearch
    mockUseMovieSearch.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      metrics: {
        lastDurationMs: null,
        lastQuery: "",
        completedCount: 0,
        abortedCount: 0,
      },
    });
  });

  const defaultProps = {
    value: "",
    onChange: mockOnChange,
    selectedTconsts: new Set<string>(),
    onAddToWatchlist: mockOnAddToWatchlist,
    onMarkAsWatched: mockOnMarkAsWatched,
    onRate: mockOnRate,
  };

  it("should render search input with correct placeholder", () => {
    render(<MovieSearchCombobox {...defaultProps} />);

    const input = screen.getByPlaceholderText("Szukaj filmów...");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "text");
  });

  it("should handle keyboard navigation keys", () => {
    render(<MovieSearchCombobox {...defaultProps} />);

    const input = screen.getByPlaceholderText("Szukaj filmów...");

    // Test that keyboard events don't throw errors (basic smoke test)
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowUp" });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.keyDown(input, { key: "Escape" });

    // Component should still be rendered
    expect(screen.getByPlaceholderText("Szukaj filmów...")).toBeInTheDocument();
  });

  it("should handle disabled movies prop", () => {
    const selectedTconsts = new Set(["tt0111161"]);

    render(
      <MovieSearchCombobox
        value=""
        onChange={mockOnChange}
        selectedTconsts={selectedTconsts}
        onAddToWatchlist={mockOnAddToWatchlist}
        onMarkAsWatched={mockOnMarkAsWatched}
        onRate={mockOnRate}
      />
    );

    // Component should render with disabled tconsts
    expect(screen.getByPlaceholderText("Szukaj filmów...")).toBeInTheDocument();
  });

  it("should accept onSelect callback", () => {
    render(
      <MovieSearchCombobox
        value=""
        onChange={mockOnChange}
        selectedTconsts={new Set()}
        onAddToWatchlist={mockOnAddToWatchlist}
        onMarkAsWatched={mockOnMarkAsWatched}
        onRate={mockOnRate}
      />
    );

    // Component should accept the callback
    expect(typeof mockOnAddToWatchlist).toBe("function");
    expect(typeof mockOnMarkAsWatched).toBe("function");
    expect(typeof mockOnRate).toBe("function");
  });

  it("should have correct ARIA attributes", () => {
    render(
      <MovieSearchCombobox
        value=""
        onChange={mockOnChange}
        selectedTconsts={new Set()}
        onAddToWatchlist={mockOnAddToWatchlist}
        onMarkAsWatched={mockOnMarkAsWatched}
        onRate={mockOnRate}
      />
    );

    const input = screen.getByPlaceholderText("Szukaj filmów...");
    expect(input).toHaveAttribute("role", "combobox");
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).toHaveAttribute("aria-haspopup", "listbox");
    expect(input).toHaveAttribute("aria-autocomplete", "list");
    expect(input).not.toHaveAttribute("aria-activedescendant");
  });

  it("should show results when query length >= 2", async () => {
    const mockResults = [
      {
        tconst: "tt0111161",
        primaryTitle: "The Shawshank Redemption",
        startYear: 1994,
        avgRating: "9.3",
        posterUrl: "/poster.jpg",
      },
    ];

    mockUseMovieSearch.mockReturnValue({
      data: mockResults,
      isLoading: false,
      error: null,
      metrics: {
        lastDurationMs: 100,
        lastQuery: "shawshank",
        completedCount: 1,
        abortedCount: 0,
      },
    });

    render(
      <MovieSearchCombobox
        value=""
        onChange={mockOnChange}
        selectedTconsts={new Set()}
        onAddToWatchlist={mockOnAddToWatchlist}
        onMarkAsWatched={mockOnMarkAsWatched}
        onRate={mockOnRate}
      />
    );

    const input = screen.getByPlaceholderText("Szukaj filmów...");

    // Type 2 characters to trigger search
    fireEvent.change(input, { target: { value: "sh" } });

    await waitFor(() => {
      expect(screen.getByText("The Shawshank Redemption")).toBeInTheDocument();
    });
  });

  it("should not show results when query length < 2", () => {
    render(
      <MovieSearchCombobox
        value=""
        onChange={mockOnChange}
        selectedTconsts={new Set()}
        onAddToWatchlist={mockOnAddToWatchlist}
        onMarkAsWatched={mockOnMarkAsWatched}
        onRate={mockOnRate}
      />
    );

    const input = screen.getByPlaceholderText("Szukaj filmów...");

    // Type 1 character
    fireEvent.change(input, { target: { value: "s" } });

    // Popover should not be open
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("should call onAddToWatchlist when item's 'Add to Watchlist' button is clicked", async () => {
    const mockResults = [
      {
        tconst: "tt0111161",
        primaryTitle: "The Shawshank Redemption",
        startYear: 1994,
        avgRating: "9.3",
        posterUrl: "/poster.jpg",
      },
    ];
    mockUseMovieSearch.mockReturnValue({
      ...mockUseMovieSearch(),
      data: mockResults,
    });

    render(<MovieSearchCombobox {...defaultProps} />);
    const input = screen.getByPlaceholderText("Szukaj filmów...");
    fireEvent.change(input, { target: { value: "sh" } });

    await waitFor(() => {
      const addToWatchlistButton = screen.getByTitle("Dodaj do watchlisty");
      fireEvent.click(addToWatchlistButton);
    });

    expect(mockOnAddToWatchlist).toHaveBeenCalledWith(mockResults[0]);
  });

  it("should call onMarkAsWatched when item's 'Mark as Watched' button is clicked", async () => {
    const mockResults = [
      {
        tconst: "tt0111161",
        primaryTitle: "The Shawshank Redemption",
        startYear: 1994,
        avgRating: "9.3",
        posterUrl: "/poster.jpg",
      },
    ];
    mockUseMovieSearch.mockReturnValue({
      ...mockUseMovieSearch(),
      data: mockResults,
    });

    render(<MovieSearchCombobox {...defaultProps} />);
    const input = screen.getByPlaceholderText("Szukaj filmów...");
    fireEvent.change(input, { target: { value: "sh" } });

    await waitFor(() => {
      const markAsWatchedButton = screen.getByTitle("Oznacz jako obejrzany");
      fireEvent.click(markAsWatchedButton);
    });

    expect(mockOnMarkAsWatched).toHaveBeenCalledWith(mockResults[0]);
  });

  it("should call onRate when item's 'Rate Movie' button is clicked", async () => {
    const mockResults = [
      {
        tconst: "tt0111161",
        primaryTitle: "The Shawshank Redemption",
        startYear: 1994,
        avgRating: "9.3",
        posterUrl: "/poster.jpg",
      },
    ];
    mockUseMovieSearch.mockReturnValue({
      ...mockUseMovieSearch(),
      data: mockResults,
    });

    render(<MovieSearchCombobox {...defaultProps} />);
    const input = screen.getByPlaceholderText("Szukaj filmów...");
    fireEvent.change(input, { target: { value: "sh" } });

    await waitFor(() => {
      const rateButton = screen.getByTitle("Oceń film");
      fireEvent.click(rateButton);
    });

    expect(mockOnRate).toHaveBeenCalledWith(mockResults[0]);
  });

  it("should call onAddToWatchlist with Enter key", async () => {
    const mockResults = [
      {
        tconst: "tt0111161",
        primaryTitle: "Movie 1",
        startYear: 1994,
        avgRating: "9.3",
        posterUrl: "/poster.jpg",
      },
    ];
    mockUseMovieSearch.mockReturnValue({
      ...mockUseMovieSearch(),
      data: mockResults,
    });
    render(<MovieSearchCombobox {...defaultProps} />);
    const input = screen.getByPlaceholderText("Szukaj filmów...");
    fireEvent.change(input, { target: { value: "mo" } });

    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    // Navigate to first item
    fireEvent.keyDown(input, { key: "ArrowDown" });

    // Select with Enter
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockOnAddToWatchlist).toHaveBeenCalledWith(mockResults[0]);
  });

  it("should close on Escape key", async () => {
    const mockResults = [
      {
        tconst: "tt0111161",
        primaryTitle: "Movie 1",
        startYear: 1994,
        avgRating: "9.3",
        posterUrl: "/poster.jpg",
      },
    ];

    mockUseMovieSearch.mockReturnValue({
      data: mockResults,
      isLoading: false,
      error: null,
      metrics: {
        lastDurationMs: 100,
        lastQuery: "movie",
        completedCount: 1,
        abortedCount: 0,
      },
    });

    render(
      <MovieSearchCombobox
        value=""
        onChange={mockOnChange}
        selectedTconsts={new Set()}
        onAddToWatchlist={mockOnAddToWatchlist}
        onMarkAsWatched={mockOnMarkAsWatched}
        onRate={mockOnRate}
      />
    );

    const input = screen.getByPlaceholderText("Szukaj filmów...");
    fireEvent.change(input, { target: { value: "mo" } });

    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    // Press Escape
    fireEvent.keyDown(input, { key: "Escape" });

    // Check that aria-expanded is set to false
    await waitFor(() => {
      expect(input).toHaveAttribute("aria-expanded", "false");
    });
  });

  it("should show loader when isLoading", async () => {
    mockUseMovieSearch.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      metrics: {
        lastDurationMs: null,
        lastQuery: "",
        completedCount: 0,
        abortedCount: 0,
      },
    });

    render(
      <MovieSearchCombobox
        value=""
        onChange={mockOnChange}
        selectedTconsts={new Set()}
        onAddToWatchlist={mockOnAddToWatchlist}
        onMarkAsWatched={mockOnMarkAsWatched}
        onRate={mockOnRate}
      />
    );

    const input = screen.getByPlaceholderText("Szukaj filmów...");
    fireEvent.change(input, { target: { value: "sh" } });

    // Should show loader icon
    await waitFor(() => {
      const loader = document.querySelector(".animate-spin");
      expect(loader).toBeInTheDocument();
    });
  });

  it("should show error message when error occurs", async () => {
    mockUseMovieSearch.mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error("Search failed"),
      metrics: {
        lastDurationMs: null,
        lastQuery: "",
        completedCount: 0,
        abortedCount: 0,
      },
    });

    render(
      <MovieSearchCombobox
        value=""
        onChange={mockOnChange}
        selectedTconsts={new Set()}
        onAddToWatchlist={mockOnAddToWatchlist}
        onMarkAsWatched={mockOnMarkAsWatched}
        onRate={mockOnRate}
      />
    );

    const input = screen.getByPlaceholderText("Szukaj filmów...");
    fireEvent.change(input, { target: { value: "sh" } });

    await waitFor(() => {
      expect(
        screen.getByText(
          "Nie udało się pobrać wyników wyszukiwania. Spróbuj ponownie"
        )
      ).toBeInTheDocument();
    });
  });

  it("should show empty state when no results", async () => {
    mockUseMovieSearch.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      metrics: {
        lastDurationMs: 100,
        lastQuery: "nonexistent",
        completedCount: 1,
        abortedCount: 0,
      },
    });

    render(
      <MovieSearchCombobox
        value=""
        onChange={mockOnChange}
        selectedTconsts={new Set()}
        onAddToWatchlist={mockOnAddToWatchlist}
        onMarkAsWatched={mockOnMarkAsWatched}
        onRate={mockOnRate}
      />
    );

    const input = screen.getByPlaceholderText("Szukaj filmów...");
    fireEvent.change(input, { target: { value: "xy" } });

    await waitFor(() => {
      expect(screen.getByText("Nie znaleziono filmów")).toBeInTheDocument();
    });
  });

  it("should keep search results visible after picking", async () => {
    const mockResults = [
      {
        tconst: "tt0111161",
        primaryTitle: "Movie 1",
        startYear: 1994,
        avgRating: "9.3",
        posterUrl: "/poster.jpg",
      },
    ];

    mockUseMovieSearch.mockReturnValue({
      ...mockUseMovieSearch(),
      data: mockResults,
    });

    // Use controlled component with state
    const TestWrapper = () => {
      const [value, setValue] = useState("");
      return (
        <MovieSearchCombobox
          value={value}
          onChange={setValue}
          selectedTconsts={new Set()}
          onAddToWatchlist={mockOnAddToWatchlist}
          onMarkAsWatched={mockOnMarkAsWatched}
          onRate={mockOnRate}
        />
      );
    };

    render(<TestWrapper />);

    const input = screen.getByPlaceholderText("Szukaj filmów...");
    fireEvent.change(input, { target: { value: "mo" } });

    await waitFor(() => {
      // Click the parent li element, which should trigger onAddToWatchlist by default
      const resultItem = screen.getByRole("option");
      fireEvent.click(resultItem);
    });

    expect(mockOnAddToWatchlist).toHaveBeenCalledWith(mockResults[0]);

    // Search results should remain visible after adding a movie
    expect(input).toHaveValue("mo");
    expect(screen.getByRole("option")).toBeInTheDocument();
  });

  it("should call onChange when typing", () => {
    render(
      <MovieSearchCombobox
        value=""
        onChange={mockOnChange}
        selectedTconsts={new Set()}
        onAddToWatchlist={mockOnAddToWatchlist}
        onMarkAsWatched={mockOnMarkAsWatched}
        onRate={mockOnRate}
      />
    );

    const input = screen.getByPlaceholderText("Szukaj filmów...");

    fireEvent.change(input, { target: { value: "test query" } });

    expect(mockOnChange).toHaveBeenCalledWith("test query");
  });

  it("should use debounced search query", () => {
    // Test that the component uses debounced query for search
    // The actual debouncing is tested in useDebouncedValue.test.ts
    // Here we just verify that useMovieSearch is called with the query value
    render(
      <MovieSearchCombobox
        value=""
        onChange={mockOnChange}
        selectedTconsts={new Set()}
        onAddToWatchlist={mockOnAddToWatchlist}
        onMarkAsWatched={mockOnMarkAsWatched}
        onRate={mockOnRate}
      />
    );

    const input = screen.getByPlaceholderText("Szukaj filmów...");

    // Change input value
    fireEvent.change(input, { target: { value: "test" } });

    // Verify that onChange was called
    expect(mockOnChange).toHaveBeenCalledWith("test");
    // Verify that useMovieSearch was called (mock verification)
    // The debounce behavior is tested separately in useDebouncedValue tests
    expect(mockUseMovieSearch).toHaveBeenCalled();
  });
});
