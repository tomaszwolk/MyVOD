import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChangePasswordCard } from '../ChangePasswordCard';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader" />,
  Eye: () => <div data-testid="eye-icon" />,
  EyeOff: () => <div data-testid="eye-off-icon" />,
}));

// Mock toast (even though it's not used directly in component)
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ChangePasswordCard', () => {
  const mockOnChangePassword = vi.fn();

  beforeEach(() => {
    mockOnChangePassword.mockReset();
  });

  const renderComponent = (props?: Partial<React.ComponentProps<typeof ChangePasswordCard>>) => {
    return render(
      <ChangePasswordCard
        userEmail="test@example.com"
        onChangePassword={mockOnChangePassword}
        isChanging={false}
        {...props}
      />
    );
  };

  it('renders all form fields', () => {
    renderComponent();

    expect(screen.getByLabelText('Obecne hasło')).toBeInTheDocument();
    expect(screen.getByLabelText('Nowe hasło')).toBeInTheDocument();
    expect(screen.getByLabelText('Potwierdź nowe hasło')).toBeInTheDocument();
  });

  it('renders submit and cancel buttons', () => {
    renderComponent();

    expect(screen.getByRole('button', { name: /zmień hasło/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /anuluj/i })).toBeInTheDocument();
  });

  it('displays password fields as password type by default', () => {
    renderComponent();

    const currentPasswordInput = screen.getByLabelText('Obecne hasło') as HTMLInputElement;
    const newPasswordInput = screen.getByLabelText('Nowe hasło') as HTMLInputElement;
    const confirmPasswordInput = screen.getByLabelText('Potwierdź nowe hasło') as HTMLInputElement;

    expect(currentPasswordInput.type).toBe('password');
    expect(newPasswordInput.type).toBe('password');
    expect(confirmPasswordInput.type).toBe('password');
  });

  it('toggles password visibility when clicking eye icons', async () => {
    const user = userEvent.setup();
    renderComponent();

    const currentPasswordInput = screen.getByLabelText('Obecne hasło') as HTMLInputElement;
    const toggleButtons = screen.getAllByRole('button', { hidden: true });

    // Find the toggle button for current password (first password field)
    const currentPasswordToggle = toggleButtons[0];

    // Initially password should be hidden
    expect(currentPasswordInput.type).toBe('password');

    // Click toggle to show password
    await user.click(currentPasswordToggle);

    await waitFor(() => {
      expect(currentPasswordInput.type).toBe('text');
    });

    // Click again to hide password
    await user.click(currentPasswordToggle);

    await waitFor(() => {
      expect(currentPasswordInput.type).toBe('password');
    });
  });

  it('validates required fields on submit', async () => {
    const user = userEvent.setup();
    renderComponent();

    const submitButton = screen.getByRole('button', { name: /zmień hasło/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Obecne hasło jest wymagane')).toBeInTheDocument();
      expect(screen.getByText('Nowe hasło jest wymagane')).toBeInTheDocument();
      expect(screen.getByText('Potwierdzenie hasła jest wymagane')).toBeInTheDocument();
    });

    expect(mockOnChangePassword).not.toHaveBeenCalled();
  });

  it('validates new password minimum length', async () => {
    const user = userEvent.setup();
    renderComponent();

    const currentPasswordInput = screen.getByLabelText('Obecne hasło');
    const newPasswordInput = screen.getByLabelText('Nowe hasło');
    const confirmPasswordInput = screen.getByLabelText('Potwierdź nowe hasło');

    await user.type(currentPasswordInput, 'OldPassword123');
    await user.type(newPasswordInput, 'Short1'); // Only 6 characters
    await user.type(confirmPasswordInput, 'Short1');

    const submitButton = screen.getByRole('button', { name: /zmień hasło/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Hasło musi mieć co najmniej 8 znaków')).toBeInTheDocument();
    });

    expect(mockOnChangePassword).not.toHaveBeenCalled();
  });

  it('validates new password contains letters and numbers', async () => {
    const user = userEvent.setup();
    renderComponent();

    const currentPasswordInput = screen.getByLabelText('Obecne hasło');
    const newPasswordInput = screen.getByLabelText('Nowe hasło');
    const confirmPasswordInput = screen.getByLabelText('Potwierdź nowe hasło');

    await user.type(currentPasswordInput, 'OldPassword123');
    await user.type(newPasswordInput, 'OnlyLetters'); // No numbers
    await user.type(confirmPasswordInput, 'OnlyLetters');

    const submitButton = screen.getByRole('button', { name: /zmień hasło/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Hasło musi zawierać litery i cyfry')).toBeInTheDocument();
    });

    expect(mockOnChangePassword).not.toHaveBeenCalled();
  });

  it('validates password confirmation matches', async () => {
    const user = userEvent.setup();
    renderComponent();

    const currentPasswordInput = screen.getByLabelText('Obecne hasło');
    const newPasswordInput = screen.getByLabelText('Nowe hasło');
    const confirmPasswordInput = screen.getByLabelText('Potwierdź nowe hasło');

    await user.type(currentPasswordInput, 'OldPassword123');
    await user.type(newPasswordInput, 'NewPassword456');
    await user.type(confirmPasswordInput, 'DifferentPassword789');

    const submitButton = screen.getByRole('button', { name: /zmień hasło/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Hasła nie są identyczne')).toBeInTheDocument();
    });

    expect(mockOnChangePassword).not.toHaveBeenCalled();
  });

  it('calls onChangePassword with correct values on valid submit', async () => {
    const user = userEvent.setup();
    mockOnChangePassword.mockResolvedValue(undefined);
    renderComponent();

    const currentPasswordInput = screen.getByLabelText('Obecne hasło');
    const newPasswordInput = screen.getByLabelText('Nowe hasło');
    const confirmPasswordInput = screen.getByLabelText('Potwierdź nowe hasło');

    await user.type(currentPasswordInput, 'OldPassword123');
    await user.type(newPasswordInput, 'NewPassword456');
    await user.type(confirmPasswordInput, 'NewPassword456');

    const submitButton = screen.getByRole('button', { name: /zmień hasło/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnChangePassword).toHaveBeenCalledWith('OldPassword123', 'NewPassword456');
    });
  });

  it('resets form after successful submission', async () => {
    const user = userEvent.setup();
    mockOnChangePassword.mockResolvedValue(undefined);
    renderComponent();

    const currentPasswordInput = screen.getByLabelText('Obecne hasło') as HTMLInputElement;
    const newPasswordInput = screen.getByLabelText('Nowe hasło') as HTMLInputElement;
    const confirmPasswordInput = screen.getByLabelText('Potwierdź nowe hasło') as HTMLInputElement;

    await user.type(currentPasswordInput, 'OldPassword123');
    await user.type(newPasswordInput, 'NewPassword456');
    await user.type(confirmPasswordInput, 'NewPassword456');

    const submitButton = screen.getByRole('button', { name: /zmień hasło/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnChangePassword).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(currentPasswordInput.value).toBe('');
      expect(newPasswordInput.value).toBe('');
      expect(confirmPasswordInput.value).toBe('');
    });
  });

  it('clears form when cancel button is clicked', async () => {
    const user = userEvent.setup();
    renderComponent();

    const currentPasswordInput = screen.getByLabelText('Obecne hasło') as HTMLInputElement;
    const newPasswordInput = screen.getByLabelText('Nowe hasło') as HTMLInputElement;
    const confirmPasswordInput = screen.getByLabelText('Potwierdź nowe hasło') as HTMLInputElement;

    await user.type(currentPasswordInput, 'OldPassword123');
    await user.type(newPasswordInput, 'NewPassword456');
    await user.type(confirmPasswordInput, 'NewPassword456');

    const cancelButton = screen.getByRole('button', { name: /anuluj/i });
    await user.click(cancelButton);

    expect(currentPasswordInput.value).toBe('');
    expect(newPasswordInput.value).toBe('');
    expect(confirmPasswordInput.value).toBe('');
    expect(mockOnChangePassword).not.toHaveBeenCalled();
  });

  it('disables submit button when isChanging is true', () => {
    renderComponent({ isChanging: true });

    const submitButton = screen.getByRole('button', { name: /zmienianie/i });
    expect(submitButton).toBeDisabled();
  });

  it('shows loading state when isChanging is true', () => {
    renderComponent({ isChanging: true });

    expect(screen.getByTestId('loader')).toBeInTheDocument();
    expect(screen.getByText(/zmienianie/i)).toBeInTheDocument();
  });

  it('disables inputs when isChanging is true', () => {
    renderComponent({ isChanging: true });

    const currentPasswordInput = screen.getByLabelText('Obecne hasło');
    const newPasswordInput = screen.getByLabelText('Nowe hasło');
    const confirmPasswordInput = screen.getByLabelText('Potwierdź nowe hasło');

    expect(currentPasswordInput).toBeDisabled();
    expect(newPasswordInput).toBeDisabled();
    expect(confirmPasswordInput).toBeDisabled();
  });

  it('allows submit button to be clicked when form is empty (shows validation)', () => {
    renderComponent();

    const submitButton = screen.getByRole('button', { name: /zmień hasło/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('submit button is enabled when all fields are filled', async () => {
    const user = userEvent.setup();
    renderComponent();

    const currentPasswordInput = screen.getByLabelText('Obecne hasło');
    const newPasswordInput = screen.getByLabelText('Nowe hasło');
    const confirmPasswordInput = screen.getByLabelText('Potwierdź nowe hasło');
    const submitButton = screen.getByRole('button', { name: /zmień hasło/i });

    expect(submitButton).not.toBeDisabled();

    await user.type(currentPasswordInput, 'OldPassword123');
    await user.type(newPasswordInput, 'NewPassword456');
    await user.type(confirmPasswordInput, 'NewPassword456');

    expect(submitButton).not.toBeDisabled();
  });

  it('displays error messages for invalid fields', async () => {
    const user = userEvent.setup();
    renderComponent();

    const submitButton = screen.getByRole('button', { name: /zmień hasło/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Obecne hasło jest wymagane')).toBeInTheDocument();
    });

    const currentPasswordInput = screen.getByLabelText('Obecne hasło');
    expect(currentPasswordInput).toHaveAttribute('aria-invalid', 'true');
  });

  it('clears error messages when user starts typing', async () => {
    const user = userEvent.setup();
    renderComponent();

    const submitButton = screen.getByRole('button', { name: /zmień hasło/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Obecne hasło jest wymagane')).toBeInTheDocument();
    });

    const currentPasswordInput = screen.getByLabelText('Obecne hasło');
    await user.type(currentPasswordInput, 'OldPassword123');

    await waitFor(() => {
      expect(screen.queryByText('Obecne hasło jest wymagane')).not.toBeInTheDocument();
    });
  });

  it('displays password requirements hint', () => {
    renderComponent();

    expect(
      screen.getByText(/hasło musi mieć co najmniej 8 znaków i zawierać litery oraz cyfry/i)
    ).toBeInTheDocument();
  });
});

