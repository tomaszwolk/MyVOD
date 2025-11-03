import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OnboardingAddPage } from '../OnboardingAddPage';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the onboarding components
vi.mock('@/components/onboarding/OnboardingLayout', () => ({
  OnboardingLayout: ({ children, title }: any) => (
    <div data-testid="onboarding-layout" data-title={title}>
      {children}
    </div>
  ),
}));

vi.mock('@/components/onboarding/ProgressBar', () => ({
  ProgressBar: ({ current, total }: any) => (
    <div data-testid="progress-bar" data-current={current} data-total={total} />
  ),
}));

vi.mock('@/components/onboarding/OnboardingHeader', () => ({
  OnboardingHeader: ({ title, hint }: any) => (
    <div data-testid="onboarding-header">
      <h1>{title}</h1>
      <p>{hint}</p>
    </div>
  ),
}));

vi.mock('@/components/onboarding/MovieSearchCombobox', () => ({
  MovieSearchCombobox: ({ maxSelectable, disabledTconsts }: any) => (
    <div data-testid="movie-search-combobox" data-max-selectable={maxSelectable}>
      Search Combobox
    </div>
  ),
}));

vi.mock('@/components/onboarding/AddedMoviesGrid', () => ({
  AddedMoviesGrid: ({ items }: any) => (
    <div data-testid="added-movies-grid" data-item-count={items.length}>
      Added Movies Grid
    </div>
  ),
}));

vi.mock('@/components/onboarding/OnboardingFooterNav', () => ({
  OnboardingFooterNav: () => (
    <div data-testid="onboarding-footer-nav">
      Footer Navigation
    </div>
  ),
}));

describe('OnboardingAddPage', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
          retry: false,
        },
      },
    });

    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          {children}
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('should render all required components', () => {
    render(<OnboardingAddPage />, { wrapper: createWrapper() });

    expect(screen.getByTestId('onboarding-layout')).toBeInTheDocument();
    expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
    expect(screen.getByTestId('onboarding-header')).toBeInTheDocument();
    expect(screen.getByTestId('movie-search-combobox')).toBeInTheDocument();
    expect(screen.getByTestId('added-movies-grid')).toBeInTheDocument();
    expect(screen.getByTestId('onboarding-footer-nav')).toBeInTheDocument();
  });

  it('should display correct title and progress', () => {
    render(<OnboardingAddPage />, { wrapper: createWrapper() });

    const layout = screen.getByTestId('onboarding-layout');
    expect(layout).toHaveAttribute('data-title', 'Dodaj filmy do watchlisty');

    const progressBar = screen.getByTestId('progress-bar');
    expect(progressBar).toHaveAttribute('data-current', '2');
    expect(progressBar).toHaveAttribute('data-total', '3');
  });
});
