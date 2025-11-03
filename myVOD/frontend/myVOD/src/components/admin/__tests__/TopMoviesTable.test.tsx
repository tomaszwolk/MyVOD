import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TopMoviesTable } from "../TopMoviesTable";
import type { TopMoviesDto } from "@/types/view/admin.types";

describe("TopMoviesTable", () => {
  const mockData: TopMoviesDto = {
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
      {
        tconst: "tt0071562",
        primary_title: "The Godfather: Part II",
        start_year: 1974,
        count: 95,
      },
    ],
  };

  it("should render table headers", () => {
    render(<TopMoviesTable data={mockData} />);

    expect(screen.getByText("Pozycja")).toBeInTheDocument();
    expect(screen.getByText("Tytuł")).toBeInTheDocument();
    expect(screen.getByText("Rok")).toBeInTheDocument();
    expect(screen.getByText("Liczba dodań")).toBeInTheDocument();
  });

  it("should render movies rows", () => {
    render(<TopMoviesTable data={mockData} />);

    expect(screen.getAllByRole("row")).toHaveLength(4); // header + 3 data rows
  });

  it("should display position numbers (1-10)", () => {
    render(<TopMoviesTable data={mockData} />);

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("should display movie titles", () => {
    render(<TopMoviesTable data={mockData} />);

    expect(screen.getByText("The Shawshank Redemption")).toBeInTheDocument();
    expect(screen.getByText("The Godfather")).toBeInTheDocument();
    expect(screen.getByText("The Godfather: Part II")).toBeInTheDocument();
  });

  it("should display release years", () => {
    render(<TopMoviesTable data={mockData} />);

    expect(screen.getByText("1994")).toBeInTheDocument();
    expect(screen.getByText("1972")).toBeInTheDocument();
    expect(screen.getByText("1974")).toBeInTheDocument();
  });

  it("should display counts", () => {
    render(<TopMoviesTable data={mockData} />);

    expect(screen.getByText("150")).toBeInTheDocument();
    expect(screen.getByText("120")).toBeInTheDocument();
    expect(screen.getByText("95")).toBeInTheDocument();
  });

  it("should display '—' for null start_year", () => {
    const dataWithNullYear: TopMoviesDto = {
      ...mockData,
      items: [
        {
          ...mockData.items[0],
          start_year: null,
        },
      ],
    };

    render(<TopMoviesTable data={dataWithNullYear} />);

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("should handle empty data gracefully", () => {
    const emptyData: TopMoviesDto = {
      type: "watchlist",
      range: "7d",
      items: [],
    };

    render(<TopMoviesTable data={emptyData} />);

    expect(screen.getByText("Brak danych do wyświetlenia")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("should handle null items gracefully", () => {
    const dataWithNullItems: TopMoviesDto = {
      type: "watchlist",
      range: "7d",
      items: null as any,
    };

    render(<TopMoviesTable data={dataWithNullItems} />);

    expect(screen.getByText("Brak danych do wyświetlenia")).toBeInTheDocument();
  });

  it("should display correct count label for watchlist type", () => {
    render(<TopMoviesTable data={mockData} />);

    expect(screen.getByText("Liczba dodań")).toBeInTheDocument();
  });

  it("should display correct count label for watched type", () => {
    const watchedData: TopMoviesDto = {
      ...mockData,
      type: "watched",
    };

    render(<TopMoviesTable data={watchedData} />);

    expect(screen.getByText("Liczba obejrzeń")).toBeInTheDocument();
  });

  it("should render table with correct structure", () => {
    render(<TopMoviesTable data={mockData} />);

    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();

    // Check thead and tbody
    const thead = screen.getAllByRole("rowgroup")[0];
    const tbody = screen.getAllByRole("rowgroup")[1];

    expect(thead).toBeInTheDocument();
    expect(tbody).toBeInTheDocument();
  });

  it("should have correct CSS classes for styling", () => {
    render(<TopMoviesTable data={mockData} />);

    const table = screen.getByRole("table");
    expect(table).toHaveClass("w-full");

    const container = table.parentElement;
    expect(container).toHaveClass("overflow-x-auto");
  });

  it("should render correct number of cells per row", () => {
    render(<TopMoviesTable data={mockData} />);

    const rows = screen.getAllByRole("row");
    const dataRows = rows.slice(1); // Skip header row

    dataRows.forEach(row => {
      const cells = row.querySelectorAll("td");
      expect(cells).toHaveLength(4); // position, title, year, count
    });
  });
});
