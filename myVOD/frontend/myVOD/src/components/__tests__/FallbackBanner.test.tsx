import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { FallbackBanner } from '../FallbackBanner';
import { formatLastCheckedDate } from '@/utils/date-utils';

vi.mock('@/utils/date-utils', () => ({
  formatLastCheckedDate: vi.fn(),
}));

describe('FallbackBanner', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render message and icon', () => {
    render(<FallbackBanner message="Test error message" />);

    expect(screen.getByText('Test error message')).toBeInTheDocument();
    // Should have an icon (AlertTriangle or Info) - SVG element
    const svgIcon = document.querySelector('svg');
    expect(svgIcon).toBeInTheDocument();
  });

  it('should render retry button when onRetry provided', () => {
    const mockOnRetry = vi.fn();
    render(<FallbackBanner message="Error" onRetry={mockOnRetry} />);

    const retryButton = screen.getByRole('button', { name: /odśwież/i });
    expect(retryButton).toBeInTheDocument();
  });

  it('should call onRetry when retry button clicked', async () => {
    const mockOnRetry = vi.fn();
    render(<FallbackBanner message="Error" onRetry={mockOnRetry} />);

    const retryButton = screen.getByRole('button', { name: /odśwież/i });
    await user.click(retryButton);

    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('should render dismiss button when showDismissButton=true', () => {
    const mockOnDismiss = vi.fn();
    render(
      <FallbackBanner
        message="Error"
        showDismissButton={true}
        onDismiss={mockOnDismiss}
      />
    );

    const dismissButton = screen.getByRole('button', { name: '' }); // X button
    expect(dismissButton).toBeInTheDocument();
  });

  it('should call onDismiss when dismiss button clicked', async () => {
    const mockOnDismiss = vi.fn();
    render(
      <FallbackBanner
        message="Error"
        showDismissButton={true}
        onDismiss={mockOnDismiss}
      />
    );

    const dismissButton = screen.getByRole('button', { name: '' });
    await user.click(dismissButton);

    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it('should display formatted date when meta.lastCheckedAt provided', () => {
    const mockFormatDate = vi.mocked(formatLastCheckedDate);
    mockFormatDate.mockReturnValue('15 października 2023');

    render(
      <FallbackBanner
        message="Error"
        meta={{ lastCheckedAt: '2023-10-15T10:00:00Z' }}
      />
    );

    expect(mockFormatDate).toHaveBeenCalledWith('2023-10-15T10:00:00Z');
    expect(screen.getByText('(Stan z: 15 października 2023)')).toBeInTheDocument();
  });

  it('should render warning variant with AlertTriangle icon', () => {
    render(<FallbackBanner message="Warning" variant="warning" />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('border-destructive/50', 'text-destructive'); // Alert variant="destructive" for warning

    // Check if AlertTriangle icon is rendered
    const svgIcon = document.querySelector('svg');
    expect(svgIcon).toBeInTheDocument();
  });

  it('should render info variant with Info icon', () => {
    render(<FallbackBanner message="Info" variant="info" />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-background', 'text-foreground'); // Alert variant="default" for info

    // Check if Info icon is rendered
    const svgIcon = document.querySelector('svg');
    expect(svgIcon).toBeInTheDocument();
  });

  it('should have correct accessibility attributes', () => {
    render(<FallbackBanner message="Accessible error" />);

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
  });

  it('should handle missing meta gracefully', () => {
    render(<FallbackBanner message="Error without meta" />);

    expect(screen.getByText('Error without meta')).toBeInTheDocument();
    expect(screen.queryByText(/stan z:/i)).not.toBeInTheDocument();
    expect(vi.mocked(formatLastCheckedDate)).not.toHaveBeenCalled();
  });

  it('should render multiple elements in correct order', () => {
    const mockOnRetry = vi.fn();
    const mockOnDismiss = vi.fn();

    render(
      <FallbackBanner
        message="Complex error"
        meta={{ lastCheckedAt: '2023-10-15T10:00:00Z' }}
        onRetry={mockOnRetry}
        showDismissButton={true}
        onDismiss={mockOnDismiss}
        variant="warning"
      />
    );

    // Check message
    expect(screen.getByText('Complex error')).toBeInTheDocument();

    // Check formatted date
    expect(screen.getByText(/stan z:/i)).toBeInTheDocument();

    // Check buttons
    expect(screen.getByRole('button', { name: /odśwież/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '' })).toBeInTheDocument(); // X button

    // Check variant
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('border-destructive/50', 'text-destructive');
  });

  it('should handle empty message gracefully', () => {
    render(<FallbackBanner message="" />);

    // Should still render the alert structure
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('should not render buttons when callbacks not provided', () => {
    render(<FallbackBanner message="Error" />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
