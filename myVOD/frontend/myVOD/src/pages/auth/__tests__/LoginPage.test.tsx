import { render, screen } from '@testing-library/react';
import { LoginPage } from '../LoginPage';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

// Mock useAuth hook
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock useNavigate and useLocation
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: vi.fn(),
    useLocation: vi.fn(),
  };
});

// Mock LoginForm component
vi.mock('../components/LoginForm', () => ({
  LoginForm: () => <div data-testid="login-form">Login Form</div>,
}));

describe('LoginPage', () => {
  let mockUseAuth: any;
  let mockNavigate: any;
  let mockLocation: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    mockUseAuth = { isAuthenticated: false };
    (useAuth as any).mockReturnValue(mockUseAuth);

    mockNavigate = vi.fn();
    (useNavigate as any).mockReturnValue(mockNavigate);

    mockLocation = { state: null };
    (useLocation as any).mockReturnValue(mockLocation);

    // Reset document title before each test
    document.title = '';
  });

  it('should set page title to "Logowanie - MyVOD"', () => {
    // When: render component
    render(<LoginPage />);

    // Then: document title should be set
    expect(document.title).toBe('Logowanie - MyVOD');
  });

  it('should redirect authenticated user to home', () => {
    // Given: user is authenticated
    mockUseAuth.isAuthenticated = true;

    // When: render component
    render(<LoginPage />);

    // Then: should navigate to home with replace option
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('should render LoginForm for unauthenticated user', () => {
    // Given: user is not authenticated
    mockUseAuth.isAuthenticated = false;

    // When: render component
    render(<LoginPage />);

    // Then: LoginForm should be rendered
    expect(screen.getByTestId('login-form')).toBeInTheDocument();
  });

  it('should display success message from location.state', () => {
    // Given: location has success message
    mockLocation.state = { message: 'Konto utworzone. Zaloguj się, aby kontynuować.' };

    // When: render component
    render(<LoginPage />);

    // Then: success message should be displayed
    expect(screen.getByText('Konto utworzone. Zaloguj się, aby kontynuować.')).toBeInTheDocument();

    // Check that it has green styling
    const messageDiv = screen.getByText('Konto utworzone. Zaloguj się, aby kontynuować.').closest('div');
    expect(messageDiv).toHaveClass('bg-green-50', 'border-green-200');
  });

  it('should not display success message when not provided', () => {
    // Given: location has no state
    mockLocation.state = null;

    // When: render component
    render(<LoginPage />);

    // Then: no success message should be displayed
    const successMessages = screen.queryByText(/konto utworzone/i);
    expect(successMessages).not.toBeInTheDocument();

    // Check that green banner is not present
    const greenBanners = document.querySelector('.bg-green-50');
    expect(greenBanners).toBeNull();
  });

  it('should render page title and description', () => {
    // When: render component
    render(<LoginPage />);

    // Then: page title and description should be displayed
    expect(screen.getByText('Logowanie')).toBeInTheDocument();
    expect(screen.getByText('Zaloguj się do swojego konta MyVOD')).toBeInTheDocument();
  });

  it('should not redirect unauthenticated users', () => {
    // Given: user is not authenticated
    mockUseAuth.isAuthenticated = false;

    // When: render component
    render(<LoginPage />);

    // Then: should not navigate
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should handle empty success message gracefully', () => {
    // Given: location has empty state
    mockLocation.state = {};

    // When: render component
    render(<LoginPage />);

    // Then: no success message should be displayed
    const greenBanners = document.querySelector('.bg-green-50');
    expect(greenBanners).toBeNull();
  });
});
