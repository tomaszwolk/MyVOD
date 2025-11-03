import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { ErrorView } from '../ErrorView';
import type { ErrorKind, ErrorViewModel } from '@/types/view/error.types';

describe('ErrorView', () => {
  const user = userEvent.setup();

  const mockModel: ErrorViewModel = {
    title: 'Test Error',
    description: 'This is a test error description',
    actions: [
      {
        id: 'retry' as const,
        label: 'Spróbuj ponownie',
        onClick: vi.fn(),
      },
      {
        id: 'home' as const,
        label: 'Przejdź do strony głównej',
        variant: 'secondary',
        onClick: vi.fn(),
      },
    ],
  };

  const mockVariant: ErrorKind = 'not_found';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render title and description', () => {
    render(<ErrorView variant={mockVariant} model={mockModel} />);

    expect(screen.getByText('Test Error')).toBeInTheDocument();
    expect(screen.getByText('This is a test error description')).toBeInTheDocument();
  });

  it('should render illustration for given variant', () => {
    render(<ErrorView variant="not_found" model={mockModel} />);

    expect(screen.getByLabelText('Ikona strony nie znaleziono')).toBeInTheDocument();
  });

  it('should render different illustrations for different variants', () => {
    const { rerender } = render(<ErrorView variant="not_found" model={mockModel} />);
    expect(screen.getByLabelText('Ikona strony nie znaleziono')).toBeInTheDocument();

    rerender(<ErrorView variant="unauthorized" model={mockModel} />);
    expect(screen.getByLabelText('Ikona błędu autoryzacji')).toBeInTheDocument();

    rerender(<ErrorView variant="offline" model={mockModel} />);
    expect(screen.getByLabelText('Ikona braku połączenia')).toBeInTheDocument();

    rerender(<ErrorView variant="suggestions_error" model={mockModel} />);
    expect(screen.getByLabelText('Ikona błędu sugestii')).toBeInTheDocument();

    rerender(<ErrorView variant="api_generic" model={mockModel} />);
    expect(screen.getByLabelText('Ikona błędu')).toBeInTheDocument();
  });

  it('should render action buttons', () => {
    render(<ErrorView variant={mockVariant} model={mockModel} />);

    expect(screen.getByRole('button', { name: 'Spróbuj ponownie' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Przejdź do strony głównej' })).toBeInTheDocument();
  });

  it('should call action onClick when button is clicked', async () => {
    render(<ErrorView variant={mockVariant} model={mockModel} />);

    const retryButton = screen.getByRole('button', { name: 'Spróbuj ponownie' });
    await user.click(retryButton);

    expect(mockModel.actions[0].onClick).toHaveBeenCalledTimes(1);
  });

  it('should have correct accessibility attributes', () => {
    render(<ErrorView variant={mockVariant} model={mockModel} />);

    // Check semantic structure - title should be present
    expect(screen.getByText('Test Error')).toBeInTheDocument();

    // Check button accessibility - buttons should be present
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
    buttons.forEach(button => {
      expect(button).toBeEnabled();
    });
  });

  it('should apply correct button variants', () => {
    render(<ErrorView variant={mockVariant} model={mockModel} />);

    const primaryButton = screen.getByRole('button', { name: 'Spróbuj ponownie' });
    const secondaryButton = screen.getByRole('button', { name: 'Przejdź do strony głównej' });

    // Primary button should have default variant (bg-primary class)
    expect(primaryButton).toHaveClass('bg-primary');

    // Secondary button should have secondary variant (bg-secondary class)
    expect(secondaryButton).toHaveClass('bg-secondary');
  });

  it('should handle empty actions array', () => {
    const modelWithNoActions: ErrorViewModel = {
      ...mockModel,
      actions: [],
    };

    render(<ErrorView variant={mockVariant} model={modelWithNoActions} />);

    // Should not crash and should still render title and description
    expect(screen.getByText('Test Error')).toBeInTheDocument();
    expect(screen.getByText('This is a test error description')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
