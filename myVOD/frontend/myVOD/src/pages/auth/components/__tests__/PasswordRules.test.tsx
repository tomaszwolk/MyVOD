import { render, screen } from "@testing-library/react";
import { PasswordRules } from "../PasswordRules";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Check: ({ className }: { className?: string }) => (
    <svg data-testid="check-icon" className={className} aria-hidden="true" />
  ),
  X: ({ className }: { className?: string }) => (
    <svg data-testid="x-icon" className={className} aria-hidden="true" />
  ),
}));

describe("PasswordRules", () => {
  it("should render all 3 rules", () => {
    // When: render component with empty password
    render(<PasswordRules password="" />);

    // Then: all three rules should be displayed
    expect(screen.getByText("Co najmniej 8 znaków")).toBeInTheDocument();
    expect(screen.getByText("Zawiera literę")).toBeInTheDocument();
    expect(screen.getByText("Zawiera cyfrę")).toBeInTheDocument();
  });

  it("should render header text", () => {
    // When: render component
    render(<PasswordRules password="" />);

    // Then: header should be displayed
    expect(screen.getByText("Wymagania hasła:")).toBeInTheDocument();
  });

  it("should show all rules as not met for empty password", () => {
    // When: render component with empty password
    render(<PasswordRules password="" />);

    // Then: all rules should show X icons and gray color
    const listItems = screen.getAllByRole("listitem");
    expect(listItems).toHaveLength(3);

    listItems.forEach((item) => {
      expect(item).toHaveClass("text-muted-foreground");
      const xIcon = item.querySelector('[data-testid="x-icon"]');
      expect(xIcon).toBeInTheDocument();
      const checkIcon = item.querySelector('[data-testid="check-icon"]');
      expect(checkIcon).not.toBeInTheDocument();
    });
  });

  it("should show min length rule as met for 8+ chars", () => {
    // When: render component with 8+ character password
    render(<PasswordRules password="12345678" />);

    // Then: first rule (min length) should be green with check icon
    const listItems = screen.getAllByRole("listitem");
    const minLengthItem = listItems[0];

    expect(minLengthItem).toHaveClass("text-green-600", "dark:text-green-400");
    expect(
      minLengthItem.querySelector('[data-testid="check-icon"]')
    ).toBeInTheDocument();
    expect(
      minLengthItem.querySelector('[data-testid="x-icon"]')
    ).not.toBeInTheDocument();
  });

  it("should show letter rule as met when password contains letter", () => {
    // When: render component with password containing letter
    render(<PasswordRules password="a1234567" />);

    // Then: second rule (letter) should be green with check icon
    const listItems = screen.getAllByRole("listitem");
    const letterItem = listItems[1];

    expect(letterItem).toHaveClass("text-green-600", "dark:text-green-400");
    expect(
      letterItem.querySelector('[data-testid="check-icon"]')
    ).toBeInTheDocument();
    expect(
      letterItem.querySelector('[data-testid="x-icon"]')
    ).not.toBeInTheDocument();
  });

  it("should show number rule as met when password contains number", () => {
    // When: render component with password containing number
    render(<PasswordRules password="password1" />);

    // Then: third rule (number) should be green with check icon
    const listItems = screen.getAllByRole("listitem");
    const numberItem = listItems[2];

    expect(numberItem).toHaveClass("text-green-600", "dark:text-green-400");
    expect(
      numberItem.querySelector('[data-testid="check-icon"]')
    ).toBeInTheDocument();
    expect(
      numberItem.querySelector('[data-testid="x-icon"]')
    ).not.toBeInTheDocument();
  });

  it("should show all rules as met for valid password", () => {
    // When: render component with valid password meeting all requirements
    render(<PasswordRules password="password123" />);

    // Then: all rules should be green with check icons
    const listItems = screen.getAllByRole("listitem");
    expect(listItems).toHaveLength(3);

    listItems.forEach((item) => {
      expect(item).toHaveClass("text-green-600", "dark:text-green-400");
      expect(
        item.querySelector('[data-testid="check-icon"]')
      ).toBeInTheDocument();
      expect(
        item.querySelector('[data-testid="x-icon"]')
      ).not.toBeInTheDocument();
    });
  });

  it("should update dynamically when password changes", () => {
    // Given: render component with empty password
    const { rerender } = render(<PasswordRules password="" />);

    // Initially all rules should be unmet
    let listItems = screen.getAllByRole("listitem");
    listItems.forEach((item) => {
      expect(item).toHaveClass("text-muted-foreground");
      expect(item.querySelector('[data-testid="x-icon"]')).toBeInTheDocument();
    });

    // When: rerender with valid password
    rerender(<PasswordRules password="password123" />);

    // Then: all rules should now be met
    listItems = screen.getAllByRole("listitem");
    listItems.forEach((item) => {
      expect(item).toHaveClass("text-green-600", "dark:text-green-400");
      expect(
        item.querySelector('[data-testid="check-icon"]')
      ).toBeInTheDocument();
    });
  });

  it("should have correct ARIA attributes", () => {
    // When: render component
    render(<PasswordRules password="" />);

    // Then: icons should have aria-hidden="true"
    const icons = screen.getAllByTestId("x-icon");
    expect(icons).toHaveLength(3); // 3 X icons initially

    icons.forEach((icon) => {
      expect(icon).toHaveAttribute("aria-hidden", "true");
    });
  });

  it("should handle partial rule satisfaction", () => {
    // When: render component with password that meets only 2 rules
    render(<PasswordRules password="abc123" />); // 6 chars (too short), has letter, has number

    // Then: first rule should be unmet (gray), others should be met (green)
    const listItems = screen.getAllByRole("listitem");

    // Min length: unmet (6 < 8)
    expect(listItems[0]).toHaveClass("text-muted-foreground");
    expect(
      listItems[0].querySelector('[data-testid="x-icon"]')
    ).toBeInTheDocument();

    // Letter: met
    expect(listItems[1]).toHaveClass("text-green-600", "dark:text-green-400");
    expect(
      listItems[1].querySelector('[data-testid="check-icon"]')
    ).toBeInTheDocument();

    // Number: met
    expect(listItems[2]).toHaveClass("text-green-600", "dark:text-green-400");
    expect(
      listItems[2].querySelector('[data-testid="check-icon"]')
    ).toBeInTheDocument();
  });
});
