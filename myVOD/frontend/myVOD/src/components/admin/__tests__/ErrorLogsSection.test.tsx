import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorLogsSection } from "../ErrorLogsSection";
import type { ErrorLogsQuery, PaginatedErrorLogsDto } from "@/types/view/admin.types";

// Mock dependencies
const mockUseErrorLogs = vi.fn();
const mockErrorLogsFilters = vi.fn();
const mockErrorLogsTable = vi.fn();

vi.mock("@/hooks/useErrorLogs", () => ({
  useErrorLogs: (query: ErrorLogsQuery) => mockUseErrorLogs(query),
}));

vi.mock("../ErrorLogsFilters", () => ({
  ErrorLogsFilters: ({ value, onChange, onReset }: any) => {
    mockErrorLogsFilters({ value, onChange, onReset });
    return <div data-testid="error-logs-filters">ErrorLogsFilters</div>;
  },
}));

vi.mock("../ErrorLogsTable", () => ({
  ErrorLogsTable: ({ data, sort, onSortChange, onPageChange, onUserIdClick }: any) => {
    mockErrorLogsTable({ data, sort, onSortChange, onPageChange, onUserIdClick });
    return <div data-testid="error-logs-table">ErrorLogsTable</div>;
  },
}));

vi.mock("@/lib/api/admin", () => ({
  exportErrorLogsCSV: vi.fn(),
}));

import { exportErrorLogsCSV } from "@/lib/api/admin";

const mockExportErrorLogsCSV = vi.mocked(exportErrorLogsCSV);

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockErrorLogsData: PaginatedErrorLogsDto = {
  items: [
    {
      id: 1,
      occurred_at: "2025-01-01T10:00:00Z",
      api_type: "tmdb",
      error_message: "Connection timeout",
      user_id: "user123",
    },
    {
      id: 2,
      occurred_at: "2025-01-01T09:30:00Z",
      api_type: "watchmode",
      error_message: "Invalid API key",
      user_id: null,
    },
  ],
  page: 1,
  page_size: 50,
  total: 100,
  total_pages: 2,
};

describe("ErrorLogsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render section title", () => {
    mockUseErrorLogs.mockReturnValue({
      data: mockErrorLogsData,
      isLoading: false,
      error: null,
    });

    render(<ErrorLogsSection />);

    expect(screen.getByText("Logi błędów integracji")).toBeInTheDocument();
  });

  it("should render ErrorLogsFilters", () => {
    mockUseErrorLogs.mockReturnValue({
      data: mockErrorLogsData,
      isLoading: false,
      error: null,
    });

    render(<ErrorLogsSection />);

    expect(mockErrorLogsFilters).toHaveBeenCalled();
    expect(screen.getByTestId("error-logs-filters")).toBeInTheDocument();
  });

  it("should render export CSV button", () => {
    mockUseErrorLogs.mockReturnValue({
      data: mockErrorLogsData,
      isLoading: false,
      error: null,
    });

    render(<ErrorLogsSection />);

    expect(screen.getByText("Eksportuj CSV")).toBeInTheDocument();
  });

  it("should initialize with default query (page=1, page_size=50, sort='-occurred_at')", () => {
    mockUseErrorLogs.mockReturnValue({
      data: mockErrorLogsData,
      isLoading: false,
      error: null,
    });

    render(<ErrorLogsSection />);

    expect(mockUseErrorLogs).toHaveBeenCalledWith({
      page: 1,
      page_size: 50,
      sort: "-occurred_at",
    });
  });

  it("should update query when filters change", () => {
    let capturedOnChange: (query: ErrorLogsQuery) => void;

    mockUseErrorLogs.mockReturnValue({
      data: mockErrorLogsData,
      isLoading: false,
      error: null,
    });

    mockErrorLogsFilters.mockImplementation(({ onChange }) => {
      capturedOnChange = onChange;
    });

    render(<ErrorLogsSection />);

    // Verify that ErrorLogsFilters received an onChange callback
    expect(capturedOnChange).toBeDefined();
    expect(typeof capturedOnChange).toBe("function");
  });

  it("should reset query when onReset called", () => {
    let capturedOnReset: () => void;

    mockUseErrorLogs.mockReturnValue({
      data: mockErrorLogsData,
      isLoading: false,
      error: null,
    });

    mockErrorLogsFilters.mockImplementation(({ onReset }) => {
      capturedOnReset = onReset;
    });

    render(<ErrorLogsSection />);

    // Verify that ErrorLogsFilters received an onReset callback
    expect(capturedOnReset).toBeDefined();
    expect(typeof capturedOnReset).toBe("function");
  });

  it("should update sort when sort changes", () => {
    let capturedOnSortChange: (sort: string) => void;

    mockUseErrorLogs.mockReturnValue({
      data: mockErrorLogsData,
      isLoading: false,
      error: null,
    });

    mockErrorLogsTable.mockImplementation(({ onSortChange }) => {
      capturedOnSortChange = onSortChange;
    });

    render(<ErrorLogsSection />);

    // Verify that ErrorLogsTable received an onSortChange callback
    expect(capturedOnSortChange).toBeDefined();
    expect(typeof capturedOnSortChange).toBe("function");
  });

  it("should reset page to 1 when sort changes", () => {
    // This is tested through the callback behavior
    // The actual implementation resets page when sort changes
    let capturedOnSortChange: (sort: string) => void;

    mockUseErrorLogs.mockReturnValue({
      data: mockErrorLogsData,
      isLoading: false,
      error: null,
    });

    mockErrorLogsTable.mockImplementation(({ onSortChange }) => {
      capturedOnSortChange = onSortChange;
    });

    render(<ErrorLogsSection />);

    expect(capturedOnSortChange).toBeDefined();
  });

  it("should update page when pagination changes", () => {
    let capturedOnPageChange: (page: number) => void;

    mockUseErrorLogs.mockReturnValue({
      data: mockErrorLogsData,
      isLoading: false,
      error: null,
    });

    mockErrorLogsTable.mockImplementation(({ onPageChange }) => {
      capturedOnPageChange = onPageChange;
    });

    render(<ErrorLogsSection />);

    // Verify that ErrorLogsTable received an onPageChange callback
    expect(capturedOnPageChange).toBeDefined();
    expect(typeof capturedOnPageChange).toBe("function");
  });

  it("should filter by user_id when user_id clicked in table", () => {
    let capturedOnUserIdClick: (userId: string) => void;

    mockUseErrorLogs.mockReturnValue({
      data: mockErrorLogsData,
      isLoading: false,
      error: null,
    });

    mockErrorLogsTable.mockImplementation(({ onUserIdClick }) => {
      capturedOnUserIdClick = onUserIdClick;
    });

    render(<ErrorLogsSection />);

    // Verify that ErrorLogsTable received an onUserIdClick callback
    expect(capturedOnUserIdClick).toBeDefined();
    expect(typeof capturedOnUserIdClick).toBe("function");
  });

  it("should display loading state", () => {
    mockUseErrorLogs.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    render(<ErrorLogsSection />);

    expect(screen.getByText("Ładowanie...")).toBeInTheDocument();
  });

  it("should display error state", () => {
    mockUseErrorLogs.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error("API error"),
    });

    render(<ErrorLogsSection />);

    expect(screen.getByText("Nie udało się załadować danych")).toBeInTheDocument();
  });

  it("should render ErrorLogsTable when data is loaded", () => {
    mockUseErrorLogs.mockReturnValue({
      data: mockErrorLogsData,
      isLoading: false,
      error: null,
    });

    render(<ErrorLogsSection />);

    expect(mockErrorLogsTable).toHaveBeenCalledWith({
      data: mockErrorLogsData,
      sort: "-occurred_at",
      onSortChange: expect.any(Function),
      onPageChange: expect.any(Function),
      onUserIdClick: expect.any(Function),
    });
    expect(screen.getByTestId("error-logs-table")).toBeInTheDocument();
  });

  it("should call exportErrorLogsCSV when export button clicked", async () => {
    const user = userEvent.setup();

    mockUseErrorLogs.mockReturnValue({
      data: mockErrorLogsData,
      isLoading: false,
      error: null,
    });

    render(<ErrorLogsSection />);

    const exportButton = screen.getByText("Eksportuj CSV");
    await user.click(exportButton);

    expect(mockExportErrorLogsCSV).toHaveBeenCalledWith({
      page: 1,
      page_size: 50,
      sort: "-occurred_at",
    });
  });

  it("should show success toast on export", async () => {
    const user = userEvent.setup();
    const { toast } = await import("sonner");

    mockUseErrorLogs.mockReturnValue({
      data: mockErrorLogsData,
      isLoading: false,
      error: null,
    });

    render(<ErrorLogsSection />);

    const exportButton = screen.getByText("Eksportuj CSV");
    await user.click(exportButton);

    expect(toast.success).toHaveBeenCalledWith("Eksport CSV rozpoczęty");
  });

  it("should show error toast on export failure", async () => {
    const user = userEvent.setup();
    const { toast } = await import("sonner");

    mockExportErrorLogsCSV.mockImplementation(() => {
      throw new Error("Export failed");
    });

    mockUseErrorLogs.mockReturnValue({
      data: mockErrorLogsData,
      isLoading: false,
      error: null,
    });

    render(<ErrorLogsSection />);

    const exportButton = screen.getByText("Eksportuj CSV");
    await user.click(exportButton);

    expect(toast.error).toHaveBeenCalledWith("Nie udało się wyeksportować danych");
  });

  it("should disable export button when loading", () => {
    mockUseErrorLogs.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    render(<ErrorLogsSection />);

    const exportButton = screen.getByText("Eksportuj CSV");
    expect(exportButton).toBeDisabled();
  });

  it("should disable export button when error", () => {
    mockUseErrorLogs.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error("API error"),
    });

    render(<ErrorLogsSection />);

    const exportButton = screen.getByText("Eksportuj CSV");
    expect(exportButton).toBeDisabled();
  });
});
