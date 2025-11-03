import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { UnauthorizedErrorPage } from '../UnauthorizedErrorPage';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock window.location
const mockLocation = {
  pathname: '/some/protected/route',
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

describe('UnauthorizedErrorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.pathname = '/some/protected/route';
  });

  it('should render ErrorView with unauthorized variant', () => {
    render(<UnauthorizedErrorPage />);

    expect(screen.getByLabelText('Ikona błędu autoryzacji')).toBeInTheDocument();
  });

  it('should display correct title and description in Polish', () => {
    render(<UnauthorizedErrorPage />);

    expect(screen.getByText('Sesja wygasła')).toBeInTheDocument();
    expect(screen.getByText('Twoja sesja wygasła. Zaloguj się ponownie, aby kontynuować korzystanie z aplikacji.')).toBeInTheDocument();
  });

  it('should render login button with return URL', () => {
    render(<UnauthorizedErrorPage />);

    expect(screen.getByRole('button', { name: 'Zaloguj ponownie' })).toBeInTheDocument();
  });

  it('should navigate to login with next parameter', async () => {
    const user = userEvent.setup();
    render(<UnauthorizedErrorPage />);

    const loginButton = screen.getByRole('button', { name: 'Zaloguj ponownie' });
    await user.click(loginButton);

    expect(mockNavigate).toHaveBeenCalledWith('/auth/login?returnTo=%2Fsome%2Fprotected%2Froute');
  });

  it('should encode current path in returnTo parameter', async () => {
    const user = userEvent.setup();
    mockLocation.pathname = '/app/watchlist';

    render(<UnauthorizedErrorPage />);

    const loginButton = screen.getByRole('button', { name: 'Zaloguj ponownie' });
    await user.click(loginButton);

    expect(mockNavigate).toHaveBeenCalledWith('/auth/login?returnTo=%2Fapp%2Fwatchlist');
  });

  it('should handle root path correctly', async () => {
    const user = userEvent.setup();
    mockLocation.pathname = '/';

    render(<UnauthorizedErrorPage />);

    const loginButton = screen.getByRole('button', { name: 'Zaloguj ponownie' });
    await user.click(loginButton);

    expect(mockNavigate).toHaveBeenCalledWith('/auth/login?returnTo=%2F');
  });
});
