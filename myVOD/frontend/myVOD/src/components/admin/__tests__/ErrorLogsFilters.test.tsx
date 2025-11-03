import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorLogsFilters } from "../ErrorLogsFilters";
import type { ErrorLogsQuery } from "@/types/view/admin.types";

// Mock dependencies
const mockUseDebouncedValue = vi.fn();
const mockOnChange = vi.fn();
const mockOnReset = vi.fn();

vi.mock("@/hooks/useDebouncedValue", () => ({
  useDebouncedValue: (value: string, delay: number) => mockUseDebouncedValue(value, delay),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, variant, className }: any) => (
    <button
      onClick={onClick}
      data-testid={`button-${variant || 'default'}`}
      className={className}
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({ id, type, value, onChange, placeholder, className }: any) => (
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      data-testid={`input-${id}`}
    />
  ),
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ htmlFor, children }: any) => (
    <label htmlFor={htmlFor} data-testid={`label-${htmlFor}`}>
      {children}
    </label>
  ),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: any) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuCheckboxItem: ({ children, checked, onCheckedChange }: any) => (
    <div
      data-testid="dropdown-checkbox-item"
      data-checked={checked}
      onClick={() => onCheckedChange(!checked)}
    >
      {children}
    </div>
  ),
  DropdownMenuLabel: ({ children }: any) => <div data-testid="dropdown-label">{children}</div>,
  DropdownMenuSeparator: () => <div data-testid="dropdown-separator" />,
  DropdownMenuTrigger: ({ children }: any) => <div data-testid="dropdown-trigger">{children}</div>,
}));

vi.mock("lucide-react", () => ({
  X: () => <svg data-testid="x-icon" />,
  ChevronDown: () => <svg data-testid="chevron-down-icon" />,
}));

describe("ErrorLogsFilters", () => {
  const defaultProps = {
    value: {} as ErrorLogsQuery,
    onChange: mockOnChange,
    onReset: mockOnReset,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementation for useDebouncedValue
    mockUseDebouncedValue.mockImplementation((value) => value);
  });

  it("should render all filter controls", () => {
    render(<ErrorLogsFilters {...defaultProps} />);

    expect(screen.getByText("Typ API")).toBeInTheDocument();
    expect(screen.getByText("Data od")).toBeInTheDocument();
    expect(screen.getByText("Data do")).toBeInTheDocument();
    expect(screen.getByText("ID użytkownika")).toBeInTheDocument();

    expect(screen.getByTestId("input-date-from")).toBeInTheDocument();
    expect(screen.getByTestId("input-date-to")).toBeInTheDocument();
    expect(screen.getByTestId("input-user-id")).toBeInTheDocument();
  });

  it("should sync user_id input with prop value", () => {
    const propsWithUserId = {
      ...defaultProps,
      value: { user_id: "123" } as ErrorLogsQuery,
    };

    render(<ErrorLogsFilters {...propsWithUserId} />);

    const userIdInput = screen.getByTestId("input-user-id");
    expect(userIdInput).toHaveValue("123");
  });

  it("should debounce user_id input (300ms)", () => {
    render(<ErrorLogsFilters {...defaultProps} />);

    const userIdInput = screen.getByTestId("input-user-id");

    // Type in input
    fireEvent.change(userIdInput, { target: { value: "abc" } });

    // Check that useDebouncedValue was called with correct parameters
    expect(mockUseDebouncedValue).toHaveBeenCalledWith("abc", 300);
  });

  it("should update query when debounced user_id changes", () => {
    mockUseDebouncedValue.mockReturnValue("new-user-id");

    render(<ErrorLogsFilters {...defaultProps} />);

    // Wait for useEffect to trigger onChange
    waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "new-user-id",
        })
      );
    });
  });

  it("should NOT cause infinite re-render loop", () => {
    // This test verifies that the component doesn't cause infinite loops
    // by checking that onChange is not called excessively
    mockUseDebouncedValue.mockReturnValue("");

    render(<ErrorLogsFilters {...defaultProps} />);

    // Component should render without calling onChange multiple times
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it("should handle API type multi-select", async () => {
    const user = userEvent.setup();
    render(<ErrorLogsFilters {...defaultProps} />);

    // Click dropdown trigger to open menu
    const trigger = screen.getByTestId("dropdown-trigger");
    await user.click(trigger);

    // Click on a checkbox item
    const checkboxItems = screen.getAllByTestId("dropdown-checkbox-item");
    await user.click(checkboxItems[0]); // Click first item (watchmode)

    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        api_type: ["watchmode"],
      })
    );
  });

  it("should toggle API type selection", async () => {
    const user = userEvent.setup();
    const propsWithApiType = {
      ...defaultProps,
      value: { api_type: ["watchmode"] } as ErrorLogsQuery,
    };

    render(<ErrorLogsFilters {...propsWithApiType} />);

    // Click dropdown trigger
    const trigger = screen.getByTestId("dropdown-trigger");
    await user.click(trigger);

    // Click on the already selected item to deselect it
    const checkboxItems = screen.getAllByTestId("dropdown-checkbox-item");
    await user.click(checkboxItems[0]); // Click first item (watchmode) to deselect

    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        api_type: undefined, // Should be undefined when empty
      })
    );
  });

  it("should update date_from when date changes", () => {
    render(<ErrorLogsFilters {...defaultProps} />);

    const dateFromInput = screen.getByTestId("input-date-from");
    fireEvent.change(dateFromInput, { target: { value: "2025-01-01" } });

    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        date_from: "2025-01-01",
      })
    );
  });

  it("should update date_to when date changes", () => {
    render(<ErrorLogsFilters {...defaultProps} />);

    const dateToInput = screen.getByTestId("input-date-to");
    fireEvent.change(dateToInput, { target: { value: "2025-01-31" } });

    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        date_to: "2025-01-31",
      })
    );
  });

  it("should show reset button when filters are active", () => {
    const propsWithFilters = {
      ...defaultProps,
      value: { api_type: ["watchmode"] } as ErrorLogsQuery,
    };

    render(<ErrorLogsFilters {...propsWithFilters} />);

    expect(screen.getByText("Resetuj")).toBeInTheDocument();
    expect(screen.getByTestId("x-icon")).toBeInTheDocument();
  });

  it("should hide reset button when no filters active", () => {
    render(<ErrorLogsFilters {...defaultProps} />);

    expect(screen.queryByText("Resetuj")).not.toBeInTheDocument();
  });

  it("should call onReset when reset button clicked", async () => {
    const user = userEvent.setup();
    const propsWithFilters = {
      ...defaultProps,
      value: { api_type: ["watchmode"] } as ErrorLogsQuery,
    };

    render(<ErrorLogsFilters {...propsWithFilters} />);

    await user.click(screen.getByText("Resetuj"));

    expect(mockOnReset).toHaveBeenCalledTimes(1);
  });

  it("should reset user_id input when onReset called", () => {
    const propsWithUserId = {
      ...defaultProps,
      value: { user_id: "123" } as ErrorLogsQuery,
    };

    const { rerender } = render(<ErrorLogsFilters {...propsWithUserId} />);

    // Simulate onReset being called (component should reset input)
    rerender(<ErrorLogsFilters {...defaultProps} />);

    const userIdInput = screen.getByTestId("input-user-id");
    expect(userIdInput).toHaveValue("");
  });

  it("should handle empty user_id (trim to undefined)", () => {
    mockUseDebouncedValue.mockReturnValue("   "); // Only spaces

    render(<ErrorLogsFilters {...defaultProps} />);

    // Wait for debounce effect
    waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: undefined,
        })
      );
    });
  });
});
