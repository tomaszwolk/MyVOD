import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { ErrorLogsTable } from "../ErrorLogsTable";
import type { PaginatedErrorLogsDto } from "@/types/view/admin.types";

describe("ErrorLogsTable", () => {
  const mockData: PaginatedErrorLogsDto = {
    items: [
      {
        id: 1,
        occurred_at: "2025-01-01T10:30:00Z",
        api_type: "tmdb",
        error_message: "Connection timeout",
        user_id: "user123",
      },
      {
        id: 2,
        occurred_at: "2025-01-02T14:15:00Z",
        api_type: "watchmode",
        error_message: "Invalid API key provided",
        user_id: null,
      },
    ],
    page: 1,
    page_size: 50,
    total: 2,
    total_pages: 1,
  };

  const mockOnSortChange = vi.fn();
  const mockOnPageChange = vi.fn();
  const mockOnUserIdClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render table headers", () => {
    render(
      <ErrorLogsTable
        data={mockData}
        sort="-occurred_at"
        onSortChange={mockOnSortChange}
        onPageChange={mockOnPageChange}
        onUserIdClick={mockOnUserIdClick}
      />
    );

    expect(screen.getByText("Data")).toBeInTheDocument();
    expect(screen.getByText("Typ API")).toBeInTheDocument();
    expect(screen.getByText("Komunikat")).toBeInTheDocument();
    expect(screen.getByText("ID użytkownika")).toBeInTheDocument();
  });

  it("should render error log rows", () => {
    render(
      <ErrorLogsTable
        data={mockData}
        sort="-occurred_at"
        onSortChange={mockOnSortChange}
        onPageChange={mockOnPageChange}
        onUserIdClick={mockOnUserIdClick}
      />
    );

    expect(screen.getAllByRole("row")).toHaveLength(3); // header + 2 data rows
  });

  it("should display occurred_at dates", () => {
    render(
      <ErrorLogsTable
        data={mockData}
        sort="-occurred_at"
        onSortChange={mockOnSortChange}
        onPageChange={mockOnPageChange}
        onUserIdClick={mockOnUserIdClick}
      />
    );

    // Dates should be formatted in Polish locale
    expect(screen.getByText("01.01.2025, 11:30")).toBeInTheDocument();
    expect(screen.getByText("02.01.2025, 15:15")).toBeInTheDocument();
  });

  it("should display api_type", () => {
    render(
      <ErrorLogsTable
        data={mockData}
        sort="-occurred_at"
        onSortChange={mockOnSortChange}
        onPageChange={mockOnPageChange}
        onUserIdClick={mockOnUserIdClick}
      />
    );

    expect(screen.getByText("TMDB")).toBeInTheDocument();
    expect(screen.getByText("Watchmode")).toBeInTheDocument();
  });

  it("should display error_message (truncated)", () => {
    render(
      <ErrorLogsTable
        data={mockData}
        sort="-occurred_at"
        onSortChange={mockOnSortChange}
        onPageChange={mockOnPageChange}
        onUserIdClick={mockOnUserIdClick}
      />
    );

    expect(screen.getByText("Connection timeout")).toBeInTheDocument();
    expect(screen.getByText("Invalid API key provided")).toBeInTheDocument();
  });

  it("should display user_id as clickable link", async () => {
    const user = userEvent.setup();
    render(
      <ErrorLogsTable
        data={mockData}
        sort="-occurred_at"
        onSortChange={mockOnSortChange}
        onPageChange={mockOnPageChange}
        onUserIdClick={mockOnUserIdClick}
      />
    );

    const userIdLink = screen.getByText("user123");
    expect(userIdLink).toBeInTheDocument();

    await user.click(userIdLink);
    expect(mockOnUserIdClick).toHaveBeenCalledWith("user123");
  });

  it("should call onUserIdClick when user_id clicked", async () => {
    const user = userEvent.setup();
    render(
      <ErrorLogsTable
        data={mockData}
        sort="-occurred_at"
        onSortChange={mockOnSortChange}
        onPageChange={mockOnPageChange}
        onUserIdClick={mockOnUserIdClick}
      />
    );

    const userIdLink = screen.getByText("user123");
    await user.click(userIdLink);

    expect(mockOnUserIdClick).toHaveBeenCalledWith("user123");
    expect(mockOnUserIdClick).toHaveBeenCalledTimes(1);
  });

  it("should display '—' for null user_id", () => {
    render(
      <ErrorLogsTable
        data={mockData}
        sort="-occurred_at"
        onSortChange={mockOnSortChange}
        onPageChange={mockOnPageChange}
        onUserIdClick={mockOnUserIdClick}
      />
    );

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("should display pagination controls", () => {
    const paginatedData: PaginatedErrorLogsDto = {
      ...mockData,
      total_pages: 3,
      page: 2,
      total: 120,
    };

    render(
      <ErrorLogsTable
        data={paginatedData}
        sort="-occurred_at"
        onSortChange={mockOnSortChange}
        onPageChange={mockOnPageChange}
        onUserIdClick={mockOnUserIdClick}
      />
    );

    expect(screen.getByText("Strona 2 z 3 (120 wpisów)")).toBeInTheDocument();
    expect(screen.getByText("Poprzednia")).toBeInTheDocument();
    expect(screen.getByText("Następna")).toBeInTheDocument();
  });

  it("should call onPageChange when page changes", async () => {
    const user = userEvent.setup();
    const paginatedData: PaginatedErrorLogsDto = {
      ...mockData,
      total_pages: 3,
      page: 2,
    };

    render(
      <ErrorLogsTable
        data={paginatedData}
        sort="-occurred_at"
        onSortChange={mockOnSortChange}
        onPageChange={mockOnPageChange}
        onUserIdClick={mockOnUserIdClick}
      />
    );

    const nextButton = screen.getByText("Następna");
    await user.click(nextButton);

    expect(mockOnPageChange).toHaveBeenCalledWith(3);

    const prevButton = screen.getByText("Poprzednia");
    await user.click(prevButton);

    expect(mockOnPageChange).toHaveBeenCalledWith(1);
  });

  it("should display current page and total pages", () => {
    const paginatedData: PaginatedErrorLogsDto = {
      ...mockData,
      total_pages: 5,
      page: 3,
      total: 250,
    };

    render(
      <ErrorLogsTable
        data={paginatedData}
        sort="-occurred_at"
        onSortChange={mockOnSortChange}
        onPageChange={mockOnPageChange}
        onUserIdClick={mockOnUserIdClick}
      />
    );

    expect(screen.getByText("Strona 3 z 5 (250 wpisów)")).toBeInTheDocument();
  });

  it("should call onSortChange when header clicked", async () => {
    const user = userEvent.setup();
    render(
      <ErrorLogsTable
        data={mockData}
        sort="-occurred_at"
        onSortChange={mockOnSortChange}
        onPageChange={mockOnPageChange}
        onUserIdClick={mockOnUserIdClick}
      />
    );

    const sortButton = screen.getByText("Data");
    await user.click(sortButton);

    expect(mockOnSortChange).toHaveBeenCalledWith("occurred_at");
  });

  it("should toggle sort direction", async () => {
    const user = userEvent.setup();
    render(
      <ErrorLogsTable
        data={mockData}
        sort="occurred_at"
        onSortChange={mockOnSortChange}
        onPageChange={mockOnPageChange}
        onUserIdClick={mockOnUserIdClick}
      />
    );

    const sortButton = screen.getByText("Data");
    await user.click(sortButton);

    expect(mockOnSortChange).toHaveBeenCalledWith("-occurred_at");
  });

  it("should display sort indicator", () => {
    render(
      <ErrorLogsTable
        data={mockData}
        sort="-occurred_at"
        onSortChange={mockOnSortChange}
        onPageChange={mockOnPageChange}
        onUserIdClick={mockOnUserIdClick}
      />
    );

    // ArrowUpDown icon should be present - check for the SVG element
    const sortIcon = document.querySelector("svg[class*='lucide-arrow-up-down']") ||
                     document.querySelector("svg[data-testid*='arrow']");
    expect(sortIcon).toBeInTheDocument();
  });

  it("should handle empty data gracefully", () => {
    const emptyData: PaginatedErrorLogsDto = {
      items: [],
      page: 1,
      page_size: 50,
      total: 0,
      total_pages: 1,
    };

    render(
      <ErrorLogsTable
        data={emptyData}
        sort="-occurred_at"
        onSortChange={mockOnSortChange}
        onPageChange={mockOnPageChange}
        onUserIdClick={mockOnUserIdClick}
      />
    );

    expect(screen.getByText("Brak danych do wyświetlenia")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("should handle null items gracefully", () => {
    const dataWithNullItems: PaginatedErrorLogsDto = {
      ...mockData,
      items: null as any,
    };

    render(
      <ErrorLogsTable
        data={dataWithNullItems}
        sort="-occurred_at"
        onSortChange={mockOnSortChange}
        onPageChange={mockOnPageChange}
        onUserIdClick={mockOnUserIdClick}
      />
    );

    expect(screen.getByText("Brak danych do wyświetlenia")).toBeInTheDocument();
  });

  it("should hide pagination when total_pages <= 1", () => {
    render(
      <ErrorLogsTable
        data={mockData}
        sort="-occurred_at"
        onSortChange={mockOnSortChange}
        onPageChange={mockOnPageChange}
        onUserIdClick={mockOnUserIdClick}
      />
    );

    expect(screen.queryByText(/Strona/)).not.toBeInTheDocument();
    expect(screen.queryByText("Poprzednia")).not.toBeInTheDocument();
    expect(screen.queryByText("Następna")).not.toBeInTheDocument();
  });

  it("should disable previous button on first page", () => {
    const paginatedData: PaginatedErrorLogsDto = {
      ...mockData,
      total_pages: 3,
      page: 1,
    };

    render(
      <ErrorLogsTable
        data={paginatedData}
        sort="-occurred_at"
        onSortChange={mockOnSortChange}
        onPageChange={mockOnPageChange}
        onUserIdClick={mockOnUserIdClick}
      />
    );

    const prevButton = screen.getByText("Poprzednia");
    expect(prevButton).toBeDisabled();
  });

  it("should disable next button on last page", () => {
    const paginatedData: PaginatedErrorLogsDto = {
      ...mockData,
      total_pages: 3,
      page: 3,
    };

    render(
      <ErrorLogsTable
        data={paginatedData}
        sort="-occurred_at"
        onSortChange={mockOnSortChange}
        onPageChange={mockOnPageChange}
        onUserIdClick={mockOnUserIdClick}
      />
    );

    const nextButton = screen.getByText("Następna");
    expect(nextButton).toBeDisabled();
  });

  it("should truncate long error messages", () => {
    const longMessageData: PaginatedErrorLogsDto = {
      ...mockData,
      items: [
        {
          ...mockData.items[0],
          error_message: "A".repeat(200), // Very long message
        },
      ],
    };

    render(
      <ErrorLogsTable
        data={longMessageData}
        sort="-occurred_at"
        onSortChange={mockOnSortChange}
        onPageChange={mockOnPageChange}
        onUserIdClick={mockOnUserIdClick}
      />
    );

    const messageCell = screen.getByText("A".repeat(200));
    expect(messageCell).toHaveClass("truncate");
    expect(messageCell).toHaveAttribute("title", "A".repeat(200));
  });

  it("should format api_type labels correctly", () => {
    const allApiTypesData: PaginatedErrorLogsDto = {
      ...mockData,
      items: [
        { ...mockData.items[0], id: 101, api_type: "tmdb" },
        { ...mockData.items[0], id: 102, api_type: "watchmode" },
        { ...mockData.items[0], id: 103, api_type: "gemini" },
      ],
    };

    render(
      <ErrorLogsTable
        data={allApiTypesData}
        sort="-occurred_at"
        onSortChange={mockOnSortChange}
        onPageChange={mockOnPageChange}
        onUserIdClick={mockOnUserIdClick}
      />
    );

    expect(screen.getByText("TMDB")).toBeInTheDocument();
    expect(screen.getByText("Watchmode")).toBeInTheDocument();
    expect(screen.getByText("Gemini")).toBeInTheDocument();
  });
});
