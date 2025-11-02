import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterForm } from '../RegisterForm';
import { useRegister } from '@/hooks/useRegister';
import { useNavigate } from 'react-router-dom';

// Mock hooks
vi.mock('@/hooks/useRegister', () => ({
  useRegister: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

// Mock child components
vi.mock('../PasswordRules', () => ({
  PasswordRules: ({ password }: { password: string }) => (
    <div data-testid="password-rules" data-password={password}>
      Password Rules
    </div>
  ),
}));

vi.mock('../ErrorAlert', () => ({
  ErrorAlert: ({ message }: { message?: string }) => (
    message ? (
      <div data-testid="error-alert" data-message={message}>
        Error: {message}
      </div>
    ) : null
  ),
}));

describe('RegisterForm', () => {
  let mockUseRegister: any;
  let mockNavigate: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseRegister = {
      mutate: vi.fn(),
      isPending: false,
    };
    (useRegister as any).mockReturnValue(mockUseRegister);

    mockNavigate = vi.fn();
    (useNavigate as any).mockReturnValue(mockNavigate);
  });

  it('should render all form fields (email, password, confirmPassword)', () => {
    // When: render component
    render(<RegisterForm />);

    // Then: all fields should be present
    expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();

    const passwordFields = screen.getAllByDisplayValue('');
    expect(passwordFields).toHaveLength(3); // email + 2 password fields
  });

  it('should render submit button', () => {
    // When: render component
    render(<RegisterForm />);

    // Then: submit button should be present
    const submitButton = screen.getByRole('button', { name: /zarejestruj się/i });
    expect(submitButton).toBeInTheDocument();
  });

  it('should render link to login page', () => {
    // When: render component
    render(<RegisterForm />);

    // Then: login link should be present
    const loginLink = screen.getByRole('link', { name: 'Zaloguj się' });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/auth/login');
  });

  it('should display PasswordRules component', () => {
    // When: render component
    render(<RegisterForm />);

    // Then: PasswordRules should be rendered
    expect(screen.getByTestId('password-rules')).toBeInTheDocument();
  });

  it('should not display ErrorAlert when no server error', () => {
    // When: render component without server error
    render(<RegisterForm />);

    // Then: ErrorAlert should not be visible
    const errorAlert = screen.queryByTestId('error-alert');
    expect(errorAlert).not.toBeInTheDocument();
  });

  it('should toggle password visibility on eye icon click', async () => {
    // Given: render component
    render(<RegisterForm />);
    const user = userEvent.setup();

    const allInputs = screen.getAllByDisplayValue('');
    const passwordInput = allInputs[1]; // second input (after email)
    const toggleButton = screen.getByLabelText('Pokaż hasło');

    // Initially password should be hidden
    expect(passwordInput).toHaveAttribute('type', 'password');

    // When: click eye icon
    await user.click(toggleButton);

    // Then: password should be visible
    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText('Ukryj hasło')).toBeInTheDocument();

    // When: click again
    await user.click(screen.getByLabelText('Ukryj hasło'));

    // Then: password should be hidden again
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('should toggle confirm password visibility independently', async () => {
    // Given: render component
    render(<RegisterForm />);
    const user = userEvent.setup();

    const allInputs = screen.getAllByDisplayValue('');
    const passwordInput = allInputs[1];
    const confirmPasswordInput = allInputs[2];
    const passwordToggle = screen.getByLabelText('Pokaż hasło');
    const confirmPasswordToggle = screen.getByLabelText('Pokaż potwierdzenie hasła');

    // Initially both should be hidden
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(confirmPasswordInput).toHaveAttribute('type', 'password');

    // When: toggle confirm password visibility
    await user.click(confirmPasswordToggle);

    // Then: only confirm password should be visible
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(confirmPasswordInput).toHaveAttribute('type', 'text');

    // When: toggle main password visibility
    await user.click(passwordToggle);

    // Then: both should be visible
    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(confirmPasswordInput).toHaveAttribute('type', 'text');
  });

  it('should update PasswordRules on password input', async () => {
    // Given: render component
    render(<RegisterForm />);
    const user = userEvent.setup();

    const allInputs = screen.getAllByDisplayValue('');
    const passwordInput = allInputs[1];
    const passwordRules = screen.getByTestId('password-rules');

    // Initially empty password
    expect(passwordRules).toHaveAttribute('data-password', '');

    // When: type in password field
    await user.type(passwordInput, 'password123');

    // Then: PasswordRules should receive updated password
    await waitFor(() => {
      expect(passwordRules).toHaveAttribute('data-password', 'password123');
    });
  });

  it('should disable submit button when form invalid', async () => {
    // Given: render component with empty form (invalid)
    render(<RegisterForm />);

    const submitButton = screen.getByRole('button', { name: /zarejestruj się/i });

    // Then: button should be disabled initially
    expect(submitButton).toBeDisabled();
  });

  it('should enable submit button when form valid', async () => {
    // Given: render component
    render(<RegisterForm />);
    const user = userEvent.setup();

    const emailInput = screen.getByRole('textbox', { name: /email/i });
    const allInputs = screen.getAllByDisplayValue('');
    const passwordInput = allInputs[1];
    const confirmPasswordInput = allInputs[2];
    const submitButton = screen.getByRole('button', { name: /zarejestruj się/i });

    // When: fill form with valid data
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password123');

    // Then: button should be enabled
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('should show spinner during submit', async () => {
    // Given: pending state
    mockUseRegister.isPending = true;
    render(<RegisterForm />);

    // Then: should show loading spinner and text
    expect(screen.getByText('Tworzenie konta...')).toBeInTheDocument();
    const submitButton = screen.getByRole('button', { name: /tworzenie konta/i });
    expect(submitButton).toBeDisabled();
  });

  it('should call registerUser API on valid submit', async () => {
    // Given: render component with valid form data
    render(<RegisterForm />);
    const user = userEvent.setup();

    const emailInput = screen.getByRole('textbox', { name: /email/i });
    const allInputs = screen.getAllByDisplayValue('');
    const passwordInput = allInputs[1];
    const confirmPasswordInput = allInputs[2];

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password123');

    // When: submit form
    const submitButton = screen.getByRole('button', { name: /zarejestruj się/i });
    await user.click(submitButton);

    // Then: should call mutate with correct payload (without confirmPassword)
    expect(mockUseRegister.mutate).toHaveBeenCalledWith(
      {
        email: 'test@example.com',
        password: 'password123',
      },
      expect.any(Object)
    );
  });

  it('should not send confirmPassword to API', async () => {
    // Given: render component with form data
    render(<RegisterForm />);
    const user = userEvent.setup();

    const emailInput = screen.getByRole('textbox', { name: /email/i });
    const allInputs = screen.getAllByDisplayValue('');
    const passwordInput = allInputs[1];
    const confirmPasswordInput = allInputs[2];

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password123');

    // When: submit form
    const submitButton = screen.getByRole('button', { name: /zarejestruj się/i });
    await user.click(submitButton);

    // Then: payload should not contain confirmPassword
    const callArgs = mockUseRegister.mutate.mock.calls[0][0];
    expect(callArgs).not.toHaveProperty('confirmPassword');
    expect(callArgs).toEqual({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('should navigate to login with next param on success', async () => {
    // Given: successful registration
    mockUseRegister.mutate.mockImplementation((payload, options) => {
      options?.onSuccess?.();
    });

    render(<RegisterForm />);
    const user = userEvent.setup();

    // Fill form
    const emailInput = screen.getByRole('textbox', { name: /email/i });
    const passwordInputs = screen.getAllByPlaceholderText('••••••••');
    const passwordInput = passwordInputs[0];
    const confirmPasswordInput = passwordInputs[1];

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password123');

    // When: submit form
    const submitButton = screen.getByRole('button', { name: /zarejestruj się/i });
    await user.click(submitButton);

    // Then: should navigate to login with next param and state
    expect(mockNavigate).toHaveBeenCalledWith('/auth/login?next=/onboarding', {
      state: {
        message: 'Konto utworzone. Zaloguj się, aby kontynuować.',
      },
    });
  });

  it('should display field error when API returns 400 for email', async () => {
    // Given: API returns email error
    const apiError = {
      response: {
        data: { email: ['Email jest już zajęty'] },
      },
    };

    mockUseRegister.mutate.mockImplementation((payload, options) => {
      options?.onError?.(apiError);
    });

    render(<RegisterForm />);
    const user = userEvent.setup();

    // Fill form and submit
    const emailInput = screen.getByRole('textbox', { name: /email/i });
    const passwordInputs = screen.getAllByPlaceholderText('••••••••');
    const passwordInput = passwordInputs[0];
    const confirmPasswordInput = passwordInputs[1];

    await user.type(emailInput, 'taken@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password123');

    const submitButton = screen.getByRole('button', { name: /zarejestruj się/i });
    await user.click(submitButton);

    // Then: email field should show error
    await waitFor(() => {
      expect(screen.getByText('Email jest już zajęty')).toBeInTheDocument();
    });
  });

  it('should display field error when API returns 400 for password', async () => {
    // Given: API returns password error
    const apiError = {
      response: {
        data: { password: ['Hasło jest za słabe'] },
      },
    };

    mockUseRegister.mutate.mockImplementation((payload, options) => {
      options?.onError?.(apiError);
    });

    render(<RegisterForm />);
    const user = userEvent.setup();

    // Fill form and submit
    const emailInput = screen.getByRole('textbox', { name: /email/i });
    const passwordInputs = screen.getAllByPlaceholderText('••••••••');
    const passwordInput = passwordInputs[0];
    const confirmPasswordInput = passwordInputs[1];

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'weakpass1');
    await user.type(confirmPasswordInput, 'weakpass1');

    const submitButton = screen.getByRole('button', { name: /zarejestruj się/i });
    await user.click(submitButton);

    // Then: password field should show error
    await waitFor(() => {
      expect(screen.getByText('Hasło jest za słabe')).toBeInTheDocument();
    });
  });

  it('should display ErrorAlert for global API error', async () => {
    // Given: API returns global error
    const apiError = {
      response: {
        data: { error: 'Serwer tymczasowo niedostępny' },
      },
    };

    mockUseRegister.mutate.mockImplementation((payload, options) => {
      options?.onError?.(apiError);
    });

    render(<RegisterForm />);
    const user = userEvent.setup();

    // Fill form and submit
    const emailInput = screen.getByRole('textbox', { name: /email/i });
    const passwordInputs = screen.getAllByPlaceholderText('••••••••');
    const passwordInput = passwordInputs[0];
    const confirmPasswordInput = passwordInputs[1];

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password123');

    const submitButton = screen.getByRole('button', { name: /zarejestruj się/i });
    await user.click(submitButton);

    // Then: ErrorAlert should be displayed
    await waitFor(() => {
      const errorAlert = screen.getByTestId('error-alert');
      expect(errorAlert).toBeInTheDocument();
      expect(errorAlert).toHaveAttribute('data-message', 'Serwer tymczasowo niedostępny');
    });
  });

  it('should clear server errors on new submit', async () => {
    // Given: first submit fails with global error
    const apiError = {
      response: {
        data: { error: 'Pierwszy błąd' },
      },
    };

    let callCount = 0;
    mockUseRegister.mutate.mockImplementation((payload, options) => {
      callCount++;
      if (callCount === 1) {
        options?.onError?.(apiError);
      } else {
        options?.onSuccess?.();
      }
    });

    render(<RegisterForm />);
    const user = userEvent.setup();

    // First submit - should show error
    const emailInput = screen.getByRole('textbox', { name: /email/i });
    const passwordInputs = screen.getAllByPlaceholderText('••••••••');
    const passwordInput = passwordInputs[0];
    const confirmPasswordInput = passwordInputs[1];

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password123');

    const submitButton = screen.getByRole('button', { name: /zarejestruj się/i });
    await user.click(submitButton);

    // Error should be visible
    await waitFor(() => {
      expect(screen.getByTestId('error-alert')).toBeInTheDocument();
    });

    // When: submit again (this time success)
    await user.click(submitButton);

    // Then: error should be cleared before new submit
    await waitFor(() => {
      expect(screen.queryByTestId('error-alert')).not.toBeInTheDocument();
    });
  });
});
