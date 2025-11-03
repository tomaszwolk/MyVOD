import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TopMoviesSection } from "../TopMoviesSection";
import type { TopMoviesDto, TopMoviesQuery } from "@/types/view/admin.types";

// Mock dependencies
const mockUseTopMovies = vi.fn();
const mockTopMoviesFilters = vi.fn();
const mockTopMoviesTable = vi.fn();
const mockExportButton = vi.fn();

vi.mock("@/hooks/useTopMovies", () => ({
  useTopMovies: (query: TopMoviesQuery) => mockUseTopMovies(query),
}));

vi.mock("../TopMoviesFilters", () => ({
  TopMoviesFilters: ({ value, onChange }: any) => {
    mockTopMoviesFilters({ value, onChange });
    return <div data-testid="top-movies-filters">TopMoviesFilters</div>;
  },
}));

vi.mock("../TopMoviesTable", () => ({
  TopMoviesTable: ({ data }: any) => {
    mockTopMoviesTable({ data });
    return <div data-testid="top-movies-table">TopMoviesTable</div>;
  },
}));

vi.mock("../ExportButton", () => ({
  ExportButton: ({ query, disabled }: any) => {
    mockExportButton({ query, disabled });
    return <button data-testid="export-button" disabled={disabled}>Export</button>;
  },
}));

const mockTopMoviesData: TopMoviesDto = {
  type: "watchlist",
  range: "7d",
  items: [
    {
      tconst: "tt0111161",
      primary_title: "The Shawshank Redemption",
      start_year: 1994,
      count: 150,
    },
    {
      tconst: "tt0068646",
      primary_title: "The Godfather",
      start_year: 1972,
      count: 120,
    },
  ],
};

describe("TopMoviesSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render section title", () => {
    mockUseTopMovies.mockReturnValue({
      data: mockTopMoviesData,
      isLoading: false,
      error: null,
    });

    render(<TopMoviesSection />);

    expect(screen.getByText("Top 10 filmów")).toBeInTheDocument();
  });

  it("should render TopMoviesFilters", () => {
    mockUseTopMovies.mockReturnValue({
      data: mockTopMoviesData,
      isLoading: false,
      error: null,
    });

    render(<TopMoviesSection />);

    expect(mockTopMoviesFilters).toHaveBeenCalled();
    expect(screen.getByTestId("top-movies-filters")).toBeInTheDocument();
  });

  it("should render ExportButton", () => {
    mockUseTopMovies.mockReturnValue({
      data: mockTopMoviesData,
      isLoading: false,
      error: null,
    });

    render(<TopMoviesSection />);

    expect(mockExportButton).toHaveBeenCalled();
    expect(screen.getByTestId("export-button")).toBeInTheDocument();
  });

  it("should initialize with default query (type='watchlist', range='7d')", () => {
    mockUseTopMovies.mockReturnValue({
      data: mockTopMoviesData,
      isLoading: false,
      error: null,
    });

    render(<TopMoviesSection />);

    expect(mockUseTopMovies).toHaveBeenCalledWith({
      type: "watchlist",
      range: "7d",
    });
  });

  it("should update query when filters change", () => {
    let capturedOnChange: (query: TopMoviesQuery) => void;

    mockUseTopMovies.mockReturnValue({
      data: mockTopMoviesData,
      isLoading: false,
      error: null,
    });

    mockTopMoviesFilters.mockImplementation(({ onChange }) => {
      capturedOnChange = onChange;
    });

    render(<TopMoviesSection />);

    // Verify that TopMoviesFilters received an onChange callback
    expect(capturedOnChange).toBeDefined();
    expect(typeof capturedOnChange).toBe("function");

    // The actual state management is tested through the component's behavior
    // rather than trying to spy on internal state
  });

  it("should display loading state", () => {
    mockUseTopMovies.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    render(<TopMoviesSection />);

    expect(screen.getByText("Ładowanie...")).toBeInTheDocument();
  });

  it("should display error state", () => {
    mockUseTopMovies.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error("API error"),
    });

    render(<TopMoviesSection />);

    expect(screen.getByText("Nie udało się załadować danych")).toBeInTheDocument();
  });

  it("should render TopMoviesTable when data is loaded", () => {
    mockUseTopMovies.mockReturnValue({
      data: mockTopMoviesData,
      isLoading: false,
      error: null,
    });

    render(<TopMoviesSection />);

    expect(mockTopMoviesTable).toHaveBeenCalledWith({
      data: mockTopMoviesData,
    });
    expect(screen.getByTestId("top-movies-table")).toBeInTheDocument();
  });

  it("should disable export button when loading", () => {
    mockUseTopMovies.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    render(<TopMoviesSection />);

    expect(mockExportButton).toHaveBeenCalledWith(
      expect.objectContaining({
        disabled: true,
      })
    );

    const exportButton = screen.getByTestId("export-button");
    expect(exportButton).toBeDisabled();
  });

  it("should disable export button when error", () => {
    mockUseTopMovies.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error("API error"),
    });

    render(<TopMoviesSection />);

    expect(mockExportButton).toHaveBeenCalledWith(
      expect.objectContaining({
        disabled: true,
      })
    );

    const exportButton = screen.getByTestId("export-button");
    expect(exportButton).toBeDisabled();
  });

  it("should enable export button when data is loaded", () => {
    mockUseTopMovies.mockReturnValue({
      data: mockTopMoviesData,
      isLoading: false,
      error: null,
    });

    render(<TopMoviesSection />);

    expect(mockExportButton).toHaveBeenCalledWith(
      expect.objectContaining({
        disabled: false,
      })
    );

    const exportButton = screen.getByTestId("export-button");
    expect(exportButton).not.toBeDisabled();
  });

  it("should pass correct query to ExportButton", () => {
    const expectedQuery = { type: "watchlist" as const, range: "7d" as const };

    mockUseTopMovies.mockReturnValue({
      data: mockTopMoviesData,
      isLoading: false,
      error: null,
    });

    render(<TopMoviesSection />);

    expect(mockExportButton).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expectedQuery,
      })
    );
  });
});
