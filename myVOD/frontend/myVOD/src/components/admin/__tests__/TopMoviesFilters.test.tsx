import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { TopMoviesFilters } from "../TopMoviesFilters";
import type { TopMoviesQuery } from "@/types/view/admin.types";

// Mock UI components to avoid Floating UI issues
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, variant, size, onClick, className }: any) => (
    <button
      onClick={onClick}
      className={className}
      data-testid={`button-${variant || 'default'}-${size || 'default'}`}
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: any) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <div data-testid="dropdown-item" onClick={onClick}>
      {children}
    </div>
  ),
  DropdownMenuTrigger: ({ children }: any) => <div data-testid="dropdown-trigger">{children}</div>,
}));

vi.mock("lucide-react", () => ({
  ChevronDown: () => <svg data-testid="chevron-down-icon" />,
}));

describe("TopMoviesFilters", () => {
  const defaultValue: TopMoviesQuery = {
    type: "watchlist",
    range: "7d",
  };

  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render type filter dropdown", () => {
    render(<TopMoviesFilters value={defaultValue} onChange={mockOnChange} />);

    expect(screen.getByText("Typ: Watchlista")).toBeInTheDocument();
  });

  it("should render range filter dropdown", () => {
    render(<TopMoviesFilters value={defaultValue} onChange={mockOnChange} />);

    expect(screen.getByText("7 dni")).toBeInTheDocument();
    expect(screen.getByText("30 dni")).toBeInTheDocument();
    expect(screen.getByText("Cały czas")).toBeInTheDocument();
  });

  it("should update query.type when type changes", async () => {
    const user = userEvent.setup();
    render(<TopMoviesFilters value={defaultValue} onChange={mockOnChange} />);

    const typeButton = screen.getByText("Typ: Watchlista");
    await user.click(typeButton);

    // With mocked dropdown, the menu items should be available in the DOM
    const watchedOption = screen.getAllByText("Obejrzane")[0]; // Get the first occurrence (dropdown item)
    await user.click(watchedOption);

    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultValue,
      type: "watched",
    });
  });

  it("should update query.range when range changes", async () => {
    const user = userEvent.setup();
    render(<TopMoviesFilters value={defaultValue} onChange={mockOnChange} />);

    const thirtyDaysButton = screen.getByText("30 dni");
    await user.click(thirtyDaysButton);

    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultValue,
      range: "30d",
    });
  });

  it("should display current values", () => {
    const customValue: TopMoviesQuery = {
      type: "watched",
      range: "30d",
    };

    render(<TopMoviesFilters value={customValue} onChange={mockOnChange} />);

    expect(screen.getByText("Typ: Obejrzane")).toBeInTheDocument();
    expect(screen.getByText("30 dni")).toBeInTheDocument();
  });

  it("should display correct labels for all range options", () => {
    const allTimeValue: TopMoviesQuery = {
      type: "watchlist",
      range: "all",
    };

    render(<TopMoviesFilters value={allTimeValue} onChange={mockOnChange} />);

    expect(screen.getByText("Typ: Watchlista")).toBeInTheDocument();
    expect(screen.getByText("Cały czas")).toBeInTheDocument();
  });

  it("should display correct labels for all type options", () => {
    render(<TopMoviesFilters value={defaultValue} onChange={mockOnChange} />);

    // With mocked dropdown, check that labels are present
    expect(screen.getByText("Typ: Watchlista")).toBeInTheDocument();
    expect(screen.getAllByText("Watchlista")).toHaveLength(1); // only trigger
    expect(screen.getByText("Obejrzane")).toBeInTheDocument();
  });

  it("should maintain other query values when updating type", async () => {
    const user = userEvent.setup();
    render(<TopMoviesFilters value={defaultValue} onChange={mockOnChange} />);

    const typeButton = screen.getByText("Typ: Watchlista");
    await user.click(typeButton);

    const watchedOption = screen.getAllByText("Obejrzane")[0];
    await user.click(watchedOption);

    expect(mockOnChange).toHaveBeenCalledWith({
      type: "watched",
      range: "7d", // should remain unchanged
    });
  });

  it("should maintain other query values when updating range", async () => {
    const user = userEvent.setup();
    render(<TopMoviesFilters value={defaultValue} onChange={mockOnChange} />);

    const thirtyDaysButton = screen.getByText("30 dni");
    await user.click(thirtyDaysButton);

    expect(mockOnChange).toHaveBeenCalledWith({
      type: "watchlist", // should remain unchanged
      range: "30d",
    });
  });
});
