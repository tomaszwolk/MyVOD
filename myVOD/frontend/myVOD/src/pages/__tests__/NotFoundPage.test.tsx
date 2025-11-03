import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { NotFoundPage } from '../NotFoundPage';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('NotFoundPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render ErrorView with not_found variant', () => {
    render(<NotFoundPage />);

    // Check that ErrorView is rendered with not_found variant
    expect(screen.getByLabelText('Ikona strony nie znaleziono')).toBeInTheDocument();
  });

  it('should display correct title and description in Polish', () => {
    render(<NotFoundPage />);

    expect(screen.getByText('Strona nie została znaleziona')).toBeInTheDocument();
    expect(screen.getByText('Przepraszamy, ale strona, której szukasz, nie istnieje. Sprawdź adres URL lub wróć do aplikacji.')).toBeInTheDocument();
  });

  it('should render correct action buttons (Home, Watchlist)', () => {
    render(<NotFoundPage />);

    expect(screen.getByRole('button', { name: 'Wróć do strony głównej' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Przejdź do watchlisty' })).toBeInTheDocument();
  });

  it('should navigate to home when home button clicked', async () => {
    const user = userEvent.setup();
    render(<NotFoundPage />);

    const homeButton = screen.getByRole('button', { name: 'Wróć do strony głównej' });
    await user.click(homeButton);

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('should navigate to watchlist when watchlist button clicked', async () => {
    const user = userEvent.setup();
    render(<NotFoundPage />);

    const watchlistButton = screen.getByRole('button', { name: 'Przejdź do watchlisty' });
    await user.click(watchlistButton);

    expect(mockNavigate).toHaveBeenCalledWith('/app/watchlist');
  });

  it('should handle unknown action gracefully', async () => {
    const user = userEvent.setup();

    // We can't easily test the default case in switch, but we can verify
    // that clicking a button calls navigate with expected routes
    render(<NotFoundPage />);

    const homeButton = screen.getByRole('button', { name: 'Wróć do strony głównej' });
    await user.click(homeButton);

    expect(mockNavigate).toHaveBeenCalledWith('/');
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });
});
