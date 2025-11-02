import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@/test/utils';
import { OnboardingWatchedPage } from '../OnboardingWatchedPage';
import { useOnboardingWatchedController } from '@/hooks/useOnboardingWatchedController';
import type { OnboardingSelectedItem } from '@/types/view/onboarding-watched.types';

// Mock all the components used in the page
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

vi.mock('@/components/onboarding/WatchedSearchCombobox', () => ({
  WatchedSearchCombobox: ({ value, onChange, onPick, disabled, selectedTconsts }: any) => {
    const buttonDisabled = disabled || selectedTconsts.has('tt0111161');
    return (
      <div data-testid="watched-search-combobox" data-value={value} data-disabled={disabled}>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Search input"
        />
        <button
          data-testid="search-pick-button"
          onClick={() => onPick({ tconst: 'tt0111161', primaryTitle: 'Test Movie' })}
          disabled={buttonDisabled}
          data-button-disabled={buttonDisabled.toString()}
        >
          Pick Movie
        </button>
      </div>
    );
  },
}));

vi.mock('@/components/onboarding/SelectedMoviesList', () => ({
  SelectedMoviesList: ({ items, maxItems, onUndo }: any) => (
    <div data-testid="selected-movies-list" data-item-count={items.length} data-max-items={maxItems}>
      {items.map((item: OnboardingSelectedItem) => (
        <div key={item.tconst} data-testid={`selected-movie-${item.tconst}`}>
          {item.primary_title}
          <button
            data-testid={`undo-${item.tconst}`}
            onClick={() => onUndo(item)}
          >
            Undo
          </button>
        </div>
      ))}
    </div>
  ),
}));

vi.mock('@/components/onboarding/OnboardingFooterNav', () => ({
  OnboardingFooterNav: ({ onSkip, onNext }: any) => (
    <div data-testid="onboarding-footer-nav">
      <button data-testid="skip-button" onClick={onSkip}>
        Skip
      </button>
      <button data-testid="next-button" onClick={onNext}>
        Zakończ
      </button>
    </div>
  ),
}));

// Mock the controller hook
vi.mock('@/hooks/useOnboardingWatchedController');

const mockUseOnboardingWatchedController = vi.mocked(useOnboardingWatchedController);

const mockViewModel = {
  query: '',
  isSubmitting: false,
  selected: [] as OnboardingSelectedItem[],
  maxSelected: 3,
};

const mockController = {
  viewModel: mockViewModel,
  setQuery: vi.fn(),
  pick: vi.fn(),
  undo: vi.fn(),
  finish: vi.fn(),
  skip: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  // Reset the viewModel for each test
  mockViewModel.selected = [];
  mockViewModel.isSubmitting = false;
  mockUseOnboardingWatchedController.mockReturnValue(mockController);
});

describe('OnboardingWatchedPage', () => {

  it('should render all sections', () => {
    render(<OnboardingWatchedPage />);

    // Check that all main components are rendered
    expect(screen.getByTestId('onboarding-layout')).toBeInTheDocument();
    expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
    expect(screen.getByTestId('onboarding-header')).toBeInTheDocument();
    expect(screen.getByTestId('watched-search-combobox')).toBeInTheDocument();
    expect(screen.getByTestId('selected-movies-list')).toBeInTheDocument();
    expect(screen.getByTestId('onboarding-footer-nav')).toBeInTheDocument();

    // Check layout title
    expect(screen.getByTestId('onboarding-layout')).toHaveAttribute('data-title', 'Oznacz filmy które już widziałeś');

    // Check progress bar (step 3 of 3)
    expect(screen.getByTestId('progress-bar')).toHaveAttribute('data-current', '3');
    expect(screen.getByTestId('progress-bar')).toHaveAttribute('data-total', '3');

    // Check header content
    expect(screen.getByText('Oznacz 3 filmy które już widziałeś')).toBeInTheDocument();
    expect(screen.getByText('Wyszukaj i oznacz filmy które oglądałeś, aby dostosować rekomendacje')).toBeInTheDocument();
  });

  it('should disable search when 3/3 movies selected', () => {
    const selectedMovies: OnboardingSelectedItem[] = [
      {
        tconst: 'tt0111161',
        primary_title: 'Movie 1',
        start_year: 1994,
        poster_path: null,
        userMovieId: 1,
        source: 'newly_created',
        status: 'success',
      },
      {
        tconst: 'tt0068646',
        primary_title: 'Movie 2',
        start_year: 1972,
        poster_path: null,
        userMovieId: 2,
        source: 'newly_created',
        status: 'success',
      },
      {
        tconst: 'tt0071562',
        primary_title: 'Movie 3',
        start_year: 1974,
        poster_path: null,
        userMovieId: 3,
        source: 'newly_created',
        status: 'success',
      },
    ];

    mockController.viewModel.selected = selectedMovies;

    render(<OnboardingWatchedPage />);

    const searchCombobox = screen.getByTestId('watched-search-combobox');
    expect(searchCombobox).toHaveAttribute('data-disabled', 'true');
  });

  it('should call controller.pick when movie selected', () => {
    render(<OnboardingWatchedPage />);

    const pickButton = screen.getByTestId('search-pick-button');
    expect(pickButton).not.toBeDisabled();
    fireEvent.click(pickButton);

    expect(mockController.pick).toHaveBeenCalledWith({
      tconst: 'tt0111161',
      primaryTitle: 'Test Movie',
    });
  });

  it('should call controller.undo when undo clicked', () => {
    const selectedMovie: OnboardingSelectedItem = {
      tconst: 'tt0111161',
      primary_title: 'Test Movie',
      start_year: 1994,
      poster_path: null,
      userMovieId: 1,
      source: 'newly_created',
      status: 'success',
    };

    mockController.viewModel.selected = [selectedMovie];

    render(<OnboardingWatchedPage />);

    const undoButton = screen.getByTestId('undo-tt0111161');
    fireEvent.click(undoButton);

    expect(mockController.undo).toHaveBeenCalledWith(selectedMovie);
  });

  it('should call controller.skip when Skip clicked', () => {
    render(<OnboardingWatchedPage />);

    const skipButton = screen.getByTestId('skip-button');
    fireEvent.click(skipButton);

    expect(mockController.skip).toHaveBeenCalled();
  });

  it('should call controller.finish when Zakończ clicked with 3 movies', () => {
    const selectedMovies: OnboardingSelectedItem[] = [
      {
        tconst: 'tt0111161',
        primary_title: 'Movie 1',
        start_year: 1994,
        poster_path: null,
        userMovieId: 1,
        source: 'newly_created',
        status: 'success',
      },
      {
        tconst: 'tt0068646',
        primary_title: 'Movie 2',
        start_year: 1972,
        poster_path: null,
        userMovieId: 2,
        source: 'newly_created',
        status: 'success',
      },
      {
        tconst: 'tt0071562',
        primary_title: 'Movie 3',
        start_year: 1974,
        poster_path: null,
        userMovieId: 3,
        source: 'newly_created',
        status: 'success',
      },
    ];

    mockController.viewModel.selected = selectedMovies;

    render(<OnboardingWatchedPage />);

    const nextButton = screen.getByTestId('next-button');
    fireEvent.click(nextButton);

    expect(mockController.finish).toHaveBeenCalled();
  });

  it('should show validation error when trying to finish with less than 3 movies', () => {
    const selectedMovies: OnboardingSelectedItem[] = [
      {
        tconst: 'tt0111161',
        primary_title: 'Movie 1',
        start_year: 1994,
        poster_path: null,
        userMovieId: 1,
        source: 'newly_created',
        status: 'success',
      },
    ];

    mockController.viewModel.selected = selectedMovies;

    render(<OnboardingWatchedPage />);

    const nextButton = screen.getByTestId('next-button');
    fireEvent.click(nextButton);

    // Check that validation error is shown
    expect(screen.getByText('Brakuje filmów')).toBeInTheDocument();
    expect(screen.getByText('Oznacz 3 filmy jako obejrzane, aby zakończyć onboarding.')).toBeInTheDocument();

    // Check that controller.finish was NOT called
    expect(mockController.finish).not.toHaveBeenCalled();
  });

  it('should clear validation error when Skip is clicked', () => {
    // First trigger validation error
    const selectedMovies: OnboardingSelectedItem[] = [
      {
        tconst: 'tt0111161',
        primary_title: 'Movie 1',
        start_year: 1994,
        poster_path: null,
        userMovieId: 1,
        source: 'newly_created',
        status: 'success',
      },
    ];

    mockController.viewModel.selected = selectedMovies;

    render(<OnboardingWatchedPage />);

    const nextButton = screen.getByTestId('next-button');
    fireEvent.click(nextButton);

    // Validation error should be shown
    expect(screen.getByText('Brakuje filmów')).toBeInTheDocument();

    // Now click Skip
    const skipButton = screen.getByTestId('skip-button');
    fireEvent.click(skipButton);

    // Validation error should be cleared
    expect(screen.queryByText('Brakuje filmów')).not.toBeInTheDocument();
    expect(mockController.skip).toHaveBeenCalled();
  });
});
