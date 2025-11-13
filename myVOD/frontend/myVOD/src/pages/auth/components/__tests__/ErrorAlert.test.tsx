import { render, screen } from "@testing-library/react";
import { ErrorAlert } from "../ErrorAlert";

describe("ErrorAlert", () => {
  it("should not render when message is undefined", () => {
    // When: render component with no message prop
    const { container } = render(<ErrorAlert />);

    // Then: nothing should be rendered
    expect(container.firstChild).toBeNull();
  });

  it("should not render when message is null", () => {
    // When: render component with null message
    const { container } = render(<ErrorAlert message={null} />);

    // Then: nothing should be rendered
    expect(container.firstChild).toBeNull();
  });

  it("should not render when message is empty string", () => {
    // When: render component with empty string message
    const { container } = render(<ErrorAlert message="" />);

    // Then: nothing should be rendered
    expect(container.firstChild).toBeNull();
  });

  it("should render error message when provided", () => {
    // When: render component with error message
    render(<ErrorAlert message="Test error message" />);

    // Then: error message should be displayed
    expect(screen.getByText("Test error message")).toBeInTheDocument();
  });

  it('should have role="alert" attribute', () => {
    // When: render component with error message
    render(<ErrorAlert message="Test error" />);

    // Then: alert should have role="alert"
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveAttribute("role", "alert");
  });

  it('should have aria-live="assertive" for screen readers', () => {
    // When: render component with error message
    render(<ErrorAlert message="Test error" />);

    // Then: alert should have aria-live="assertive"
    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("aria-live", "assertive");
  });

  it("should have tabIndex={-1} for focus management", () => {
    // When: render component with error message
    render(<ErrorAlert message="Test error" />);

    // Then: alert should have tabIndex={-1}
    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("tabindex", "-1");
  });

  it("should have correct styling classes", () => {
    // When: render component with error message
    render(<ErrorAlert message="Test error" />);

    // Then: alert should have correct CSS classes from Alert component
    const alert = screen.getByRole("alert");
    expect(alert).toHaveClass("mb-4");
    // Component uses destructive variant which includes theme-aware styling
    expect(alert).toHaveClass(
      "relative",
      "w-full",
      "rounded-lg",
      "border",
      "px-4",
      "py-3",
      "text-sm"
    );
    // Should have destructive variant classes
    expect(alert).toHaveClass(
      "border-destructive/50",
      "text-destructive",
      "dark:border-destructive"
    );
  });

  it("should render AlertCircle icon", () => {
    // When: render component with error message
    render(<ErrorAlert message="Test error" />);

    // Then: AlertCircle icon should be present (via class or test id)
    const alert = screen.getByRole("alert");
    const icon = alert.querySelector("svg");
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass("lucide", "lucide-circle-alert");
  });

  it("should focus on mount when message is provided", () => {
    // When: render component with error message
    render(<ErrorAlert message="Test error" />);

    // Then: alert should receive focus
    const alert = screen.getByRole("alert");
    expect(alert).toHaveFocus();
  });

  it("should not focus when message is not provided", () => {
    // Given: render component without message first
    const { rerender } = render(<ErrorAlert />);

    // When: rerender with message
    rerender(<ErrorAlert message="New error" />);

    // Then: alert should receive focus
    const alert = screen.getByRole("alert");
    expect(alert).toHaveFocus();
  });
});
