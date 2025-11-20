import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MovieCard } from "../MovieCard";
import type {
  WatchlistItemVM,
  PlatformDto,
} from "@/types/view/watchlist.types";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Eye: () => <div data-testid="eye-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  Star: () => <div data-testid="star-icon" />,
  ImageIcon: () => <div data-testid="image-icon" />,
}));

describe("MovieCard", () => {
  const mockPlatforms: PlatformDto[] = [
    { id: 1, platform_slug: "netflix", platform_name: "Netflix" },
    { id: 2, platform_slug: "hbo", platform_name: "HBO" },
  ];

  const mockItem: WatchlistItemVM = {
    id: 1,
    movie: {
      tconst: "tt0111161",
      primary_title: "The Shawshank Redemption",
      start_year: 1994,
      genres: ["Drama", "Crime"],
      avg_rating: "9.3",
      poster_path: "/shawshank.jpg",
    },
    availability: [
      { platform_id: 1, platform_name: "Netflix", is_available: true },
      { platform_id: 2, platform_name: "HBO", is_available: false },
    ],
    watchlisted_at: "2024-01-01T00:00:00Z",
    watched_at: null,
    availabilitySummary: {
      isAvailableOnAny: true,
      availablePlatformIds: [1],
    },
  };

  const defaultProps = {
    item: mockItem,
    platforms: mockPlatforms,
    onMarkWatched: vi.fn(),
    onDelete: vi.fn(),
  };

  it("should render movie title and details", () => {
    render(<MovieCard {...defaultProps} />);

    expect(screen.getByText("The Shawshank Redemption")).toBeInTheDocument();
    expect(screen.getByText("1994")).toBeInTheDocument();
    expect(screen.getByText("Drama, Crime")).toBeInTheDocument();
    expect(screen.getByText("9.3/10")).toBeInTheDocument();
  });

  it("should render poster image when available", () => {
    render(<MovieCard {...defaultProps} />);

    const img = screen.getByAltText("The Shawshank Redemption");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/shawshank.jpg");
  });

  it("should render placeholder when poster is not available", () => {
    const itemWithoutPoster = {
      ...mockItem,
      movie: { ...mockItem.movie, poster_path: null },
    };

    render(<MovieCard {...defaultProps} item={itemWithoutPoster} />);

    // TMDBPoster now renders placeholder as img with poster-myVOD.png
    const img = screen.getByAltText("The Shawshank Redemption");
    expect(img).toHaveAttribute(
      "src",
      expect.stringContaining("poster-myVOD.png")
    );
  });

  it("should show availability icons for user platforms", () => {
    render(<MovieCard {...defaultProps} />);

    // Should show platform icons with tooltips
    expect(
      screen.getByRole("img", { name: "Netflix: Dostępny" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "HBO: Niedostępny" })
    ).toBeInTheDocument();
  });

  it("should not show unavailable badge when movie is available", () => {
    render(<MovieCard {...defaultProps} />);

    expect(screen.queryByText("Niedostępny")).not.toBeInTheDocument();
  });

  it("should handle unavailable movies without showing badge", () => {
    const unavailableItem = {
      ...mockItem,
      availability: [
        { platform_id: 1, platform_name: "Netflix", is_available: false },
        { platform_id: 2, platform_name: "HBO", is_available: false },
      ],
      availabilitySummary: {
        isAvailableOnAny: false,
        availablePlatformIds: [],
      },
    };

    render(<MovieCard {...defaultProps} item={unavailableItem} />);

    expect(screen.queryByText("Niedostępny")).not.toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Netflix: Niedostępny" })
    ).toBeInTheDocument();
  });

  it("should call onMarkWatched when mark as watched button is clicked", () => {
    render(<MovieCard {...defaultProps} />);

    const markWatchedButton = screen.getByText("Obejrzane");
    fireEvent.click(markWatchedButton);

    expect(defaultProps.onMarkWatched).toHaveBeenCalledWith(1);
  });

  it("should call onDelete when delete button is clicked", () => {
    render(<MovieCard {...defaultProps} />);

    // Find button by aria-label
    const deleteButton = screen.getByLabelText(
      'Usuń "The Shawshank Redemption" z watchlisty'
    );
    expect(deleteButton).toBeInTheDocument();
    fireEvent.click(deleteButton);

    expect(defaultProps.onDelete).toHaveBeenCalledWith(1);
  });

  it("should render action buttons with icons", () => {
    render(<MovieCard {...defaultProps} />);

    expect(screen.getByTestId("eye-icon")).toBeInTheDocument();
    expect(screen.getByTestId("trash-icon")).toBeInTheDocument();
  });

  it("should handle image error gracefully", async () => {
    render(<MovieCard {...defaultProps} />);

    const img = screen.getByAltText("The Shawshank Redemption");
    fireEvent.error(img);

    // Should show placeholder after error (src changes to poster-myVOD.png)
    await waitFor(() => {
      const updatedImg = screen.getByAltText("The Shawshank Redemption");
      expect(updatedImg).toHaveAttribute(
        "src",
        expect.stringContaining("poster-myVOD.png")
      );
    });
  });

  it("should display all genres", () => {
    const itemWithManyGenres = {
      ...mockItem,
      movie: {
        ...mockItem.movie,
        genres: ["Drama", "Crime", "Thriller", "Action", "Adventure"],
      },
    };

    render(<MovieCard {...defaultProps} item={itemWithManyGenres} />);

    expect(
      screen.getByText("Drama, Crime, Thriller, Action, Adventure")
    ).toBeInTheDocument();
  });

  it("should handle null genres gracefully", () => {
    const itemWithoutGenres = {
      ...mockItem,
      movie: {
        ...mockItem.movie,
        genres: null,
      },
    };

    render(<MovieCard {...defaultProps} item={itemWithoutGenres} />);

    expect(screen.queryByText("•")).not.toBeInTheDocument();
  });
});
