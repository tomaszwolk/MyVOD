import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@/test/utils';
import { SearchNoResultsItem } from '../SearchNoResultsItem';

describe('SearchNoResultsItem', () => {
  const defaultProps = {
    query: 'nonexistent movie',
  };

  beforeEach(() => {
    // Clear any previous renders
  });

  it('should render Info icon', () => {
    render(<SearchNoResultsItem {...defaultProps} />);

    const icon = document.querySelector('.lucide-info');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('h-8', 'w-8', 'text-muted-foreground');
  });

  it('should display "Nie znaleziono filmów" text', () => {
    render(<SearchNoResultsItem {...defaultProps} />);

    expect(screen.getByText('Nie znaleziono filmów')).toBeInTheDocument();
  });

  it('should display helpful hint text', () => {
    render(<SearchNoResultsItem {...defaultProps} />);

    expect(screen.getByText('Spróbuj wpisać tytuł oryginalny filmu lub sprawdź pisownię')).toBeInTheDocument();
  });

  it('should have correct accessibility attributes', () => {
    render(<SearchNoResultsItem {...defaultProps} />);

    const container = screen.getByRole('status');
    expect(container).toBeInTheDocument();
    expect(container).toHaveAttribute('aria-live', 'polite');

    // Icon should be hidden from screen readers
    const icon = document.querySelector('.lucide-info');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
  });

  it('should handle different query strings', () => {
    const { rerender } = render(<SearchNoResultsItem query="batman" />);

    // Component doesn't use query prop for display, only for potential future use
    expect(screen.getByText('Nie znaleziono filmów')).toBeInTheDocument();

    rerender(<SearchNoResultsItem query="superman" />);
    expect(screen.getByText('Nie znaleziono filmów')).toBeInTheDocument();
  });

  it('should render with correct structure and styling', () => {
    render(<SearchNoResultsItem {...defaultProps} />);

    const container = screen.getByRole('status');

    // Check main structure
    expect(container).toHaveClass('flex', 'flex-col', 'items-center', 'gap-2', 'p-6', 'text-center');

    // Check text elements
    const title = screen.getByText('Nie znaleziono filmów');
    expect(title).toHaveClass('text-sm', 'font-medium', 'text-foreground');

    const hint = screen.getByText('Spróbuj wpisać tytuł oryginalny filmu lub sprawdź pisownię');
    expect(hint).toHaveClass('text-xs', 'text-muted-foreground', 'max-w-xs');
  });
});
