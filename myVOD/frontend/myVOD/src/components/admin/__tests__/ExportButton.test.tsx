import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { ExportButton } from "../ExportButton";
import type { TopMoviesQuery } from "@/types/view/admin.types";

vi.mock("@/lib/api/admin", () => ({
  exportTopMoviesCSV: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { exportTopMoviesCSV } from "@/lib/api/admin";
import { toast } from "sonner";

const mockExportTopMoviesCSV = vi.mocked(exportTopMoviesCSV);
const mockToastSuccess = vi.mocked(toast.success);
const mockToastError = vi.mocked(toast.error);

describe("ExportButton", () => {
  const defaultQuery: TopMoviesQuery = {
    type: "watchlist",
    range: "7d",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render button with download icon", () => {
    render(<ExportButton query={defaultQuery} />);

    const button = screen.getByRole("button", { name: /eksportuj csv/i });
    expect(button).toBeInTheDocument();

    const icon = document.querySelector("[class*='lucide-download']") ||
                 screen.getByTestId("download-icon");
    expect(icon).toBeInTheDocument();
  });

  it("should call export function when clicked", async () => {
    const user = userEvent.setup();
    render(<ExportButton query={defaultQuery} />);

    const button = screen.getByRole("button", { name: /eksportuj csv/i });
    await user.click(button);

    await waitFor(() => {
      expect(mockExportTopMoviesCSV).toHaveBeenCalledWith(defaultQuery);
      expect(mockExportTopMoviesCSV).toHaveBeenCalledTimes(1);
    });
  });

  it("should show success toast on successful export", async () => {
    const user = userEvent.setup();
    mockExportTopMoviesCSV.mockResolvedValueOnce(undefined);

    render(<ExportButton query={defaultQuery} />);

    const button = screen.getByRole("button", { name: /eksportuj csv/i });
    await user.click(button);

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith("Eksport CSV rozpoczęty");
    });
  });

  it("should show error toast on export failure", async () => {
    const user = userEvent.setup();
    mockExportTopMoviesCSV.mockRejectedValueOnce(new Error("Export failed"));

    render(<ExportButton query={defaultQuery} />);

    const button = screen.getByRole("button", { name: /eksportuj csv/i });
    await user.click(button);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Nie udało się wyeksportować danych");
    });
  });

  it("should be disabled when disabled prop is true", () => {
    render(<ExportButton query={defaultQuery} disabled={true} />);

    const button = screen.getByRole("button", { name: /eksportuj csv/i });
    expect(button).toBeDisabled();
  });

  it("should not be disabled when disabled prop is false or undefined", () => {
    render(<ExportButton query={defaultQuery} disabled={false} />);

    const button = screen.getByRole("button", { name: /eksportuj csv/i });
    expect(button).not.toBeDisabled();
  });

  it("should not be disabled by default", () => {
    render(<ExportButton query={defaultQuery} />);

    const button = screen.getByRole("button", { name: /eksportuj csv/i });
    expect(button).not.toBeDisabled();
  });

  it("should have correct button text", () => {
    render(<ExportButton query={defaultQuery} />);

    expect(screen.getByText("Eksportuj CSV")).toBeInTheDocument();
  });

  it("should have outline variant", () => {
    render(<ExportButton query={defaultQuery} />);

    const button = screen.getByRole("button", { name: /eksportuj csv/i });
    expect(button).toHaveClass("border", "border-input", "bg-background");
  });

  it("should have gap class for icon spacing", () => {
    render(<ExportButton query={defaultQuery} />);

    const button = screen.getByRole("button", { name: /eksportuj csv/i });
    expect(button).toHaveClass("gap-2");
  });

  it("should call export with different query parameters", async () => {
    const user = userEvent.setup();
    const customQuery: TopMoviesQuery = {
      type: "watched",
      range: "30d",
    };

    render(<ExportButton query={customQuery} />);

    const button = screen.getByRole("button", { name: /eksportuj csv/i });
    await user.click(button);

    expect(mockExportTopMoviesCSV).toHaveBeenCalledWith(customQuery);
  });

  it("should handle async export function", async () => {
    const user = userEvent.setup();
    let resolveExport: (value: void) => void;
    const exportPromise = new Promise<void>((resolve) => {
      resolveExport = resolve;
    });

    mockExportTopMoviesCSV.mockReturnValueOnce(exportPromise);

    render(<ExportButton query={defaultQuery} />);

    const button = screen.getByRole("button", { name: /eksportuj csv/i });
    await user.click(button);

    // Resolve the promise
    resolveExport();

    // Wait for the promise to resolve
    await exportPromise;

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith("Eksport CSV rozpoczęty");
    });
  });
});
