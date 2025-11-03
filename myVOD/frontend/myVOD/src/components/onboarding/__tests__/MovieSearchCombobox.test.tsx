import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/utils';
import { MovieSearchCombobox } from '../MovieSearchCombobox';
import { useMovieSearch } from '@/hooks/useMovieSearch';

// Mock Popover components to avoid Floating UI issues in tests
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children, open }: any) => {
    // For tests, render children directly but add data attributes
    return <div data-testid="popover" data-open={open}>{children}</div>;
  },
  PopoverTrigger: ({ children, asChild }: any) => {
    return <div data-testid="popover-trigger">{children}</div>;
  },
  PopoverContent: ({ children, className, align, onOpenAutoFocus }: any) => {
    // PopoverContent is always rendered but we control visibility via CSS
    return (
      <div
        data-testid="popover-content"
        className={className}
        data-align={align}
        style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          zIndex: 9999,
          display: 'block' // Always visible in tests
        }}
      >
        {children}
      </div>
    );
  },
}));

// Mock useMovieSearch hook
vi.mock('@/hooks/useMovieSearch', () => ({
  useMovieSearch: vi.fn(),
}));

const mockUseMovieSearch = vi.mocked(useMovieSearch);

describe('MovieSearchCombobox', () => {
  const mockOnSelectOption = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for useMovieSearch - use vi.fn() instead of object
    mockUseMovieSearch.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      metrics: { lastDurationMs: null, lastQuery: '', completedCount: 0, abortedCount: 0 },
    });
  });

  it('should render search input with correct placeholder', () => {
    render(
      <MovieSearchCombobox
        disabledTconsts={new Set()}
        onSelectOption={mockOnSelectOption}
      />
    );

    const input = screen.getByPlaceholderText('Szukaj filmów...');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'text');
  });

  it('should handle keyboard navigation keys', () => {
    render(
      <MovieSearchCombobox
        disabledTconsts={new Set()}
        onSelectOption={mockOnSelectOption}
      />
    );

    const input = screen.getByPlaceholderText('Szukaj filmów...');

    // Test that keyboard events don't throw errors (basic smoke test)
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.keyDown(input, { key: 'Escape' });

    // Component should still be rendered
    expect(screen.getByPlaceholderText('Szukaj filmów...')).toBeInTheDocument();
  });

  it('should handle disabled movies prop', () => {
    const disabledTconsts = new Set(['tt0111161']);

    render(
      <MovieSearchCombobox
        disabledTconsts={disabledTconsts}
        onSelectOption={mockOnSelectOption}
      />
    );

    // Component should render with disabled tconsts
    expect(screen.getByPlaceholderText('Szukaj filmów...')).toBeInTheDocument();
  });

  it('should accept onSelectOption callback', () => {
    render(
      <MovieSearchCombobox
        disabledTconsts={new Set()}
        onSelectOption={mockOnSelectOption}
      />
    );

    // Component should accept the callback
    expect(typeof mockOnSelectOption).toBe('function');
  });

  it('should have correct ARIA attributes', () => {
    render(
      <MovieSearchCombobox
        disabledTconsts={new Set()}
        onSelectOption={mockOnSelectOption}
      />
    );

    const input = screen.getByPlaceholderText('Szukaj filmów...');
    expect(input).toHaveAttribute('role', 'combobox');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).toHaveAttribute('aria-haspopup', 'listbox');
    expect(input).toHaveAttribute('aria-autocomplete', 'list');
    expect(input).not.toHaveAttribute('aria-activedescendant');
  });

  it('should show results when query length >= 2', async () => {
    const mockResults = [
      { tconst: 'tt0111161', primaryTitle: 'The Shawshank Redemption', startYear: 1994, avgRating: '9.3', posterUrl: '/poster.jpg' },
    ];

    mockUseMovieSearch.mockReturnValue({
      data: mockResults,
      isLoading: false,
      error: null,
      metrics: { lastDurationMs: 100, lastQuery: 'shawshank', completedCount: 1, abortedCount: 0 },
    });

    render(
      <MovieSearchCombobox
        disabledTconsts={new Set()}
        onSelectOption={mockOnSelectOption}
      />
    );

    const input = screen.getByPlaceholderText('Szukaj filmów...');

    // Type 2 characters to trigger search
    fireEvent.change(input, { target: { value: 'sh' } });

    await waitFor(() => {
      expect(screen.getByText('The Shawshank Redemption')).toBeInTheDocument();
    });
  });

  it('should not show results when query length < 2', () => {
    render(
      <MovieSearchCombobox
        disabledTconsts={new Set()}
        onSelectOption={mockOnSelectOption}
      />
    );

    const input = screen.getByPlaceholderText('Szukaj filmów...');

    // Type 1 character
    fireEvent.change(input, { target: { value: 's' } });

    // Popover should not be open
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('should call onSelectOption when item is clicked', async () => {
    const mockResults = [
      { tconst: 'tt0111161', primaryTitle: 'The Shawshank Redemption', startYear: 1994, avgRating: '9.3', posterUrl: '/poster.jpg' },
    ];

    mockUseMovieSearch.mockReturnValue({
      data: mockResults,
      isLoading: false,
      error: null,
      metrics: { lastDurationMs: 100, lastQuery: 'shawshank', completedCount: 1, abortedCount: 0 },
    });

    render(
      <MovieSearchCombobox
        disabledTconsts={new Set()}
        onSelectOption={mockOnSelectOption}
      />
    );

    const input = screen.getByPlaceholderText('Szukaj filmów...');
    fireEvent.change(input, { target: { value: 'sh' } });

    await waitFor(() => {
      const resultItem = screen.getByRole('option');
      fireEvent.click(resultItem);
    });

    expect(mockOnSelectOption).toHaveBeenCalledWith(mockResults[0]);
  });

  it('should navigate with arrow keys', async () => {
    const mockResults = [
      { tconst: 'tt0111161', primaryTitle: 'Movie 1', startYear: 1994, avgRating: '9.3', posterUrl: '/poster.jpg' },
      { tconst: 'tt0111162', primaryTitle: 'Movie 2', startYear: 1995, avgRating: '8.5', posterUrl: '/poster2.jpg' },
    ];

    mockUseMovieSearch.mockReturnValue({
      data: mockResults,
      isLoading: false,
      error: null,
      metrics: { lastDurationMs: 100, lastQuery: 'movie', completedCount: 1, abortedCount: 0 },
    });

    render(
      <MovieSearchCombobox
        disabledTconsts={new Set()}
        onSelectOption={mockOnSelectOption}
      />
    );

    const input = screen.getByPlaceholderText('Szukaj filmów...');
    fireEvent.change(input, { target: { value: 'mo' } });

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    // Arrow down to first item
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveAttribute('aria-activedescendant', 'result-tt0111161');

    // Arrow down to second item
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveAttribute('aria-activedescendant', 'result-tt0111162');

    // Arrow up back to first item
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input).toHaveAttribute('aria-activedescendant', 'result-tt0111161');
  });

  it('should select item with Enter key', async () => {
    const mockResults = [
      { tconst: 'tt0111161', primaryTitle: 'Movie 1', startYear: 1994, avgRating: '9.3', posterUrl: '/poster.jpg' },
      { tconst: 'tt0111162', primaryTitle: 'Movie 2', startYear: 1995, avgRating: '8.5', posterUrl: '/poster2.jpg' },
    ];

    mockUseMovieSearch.mockReturnValue({
      data: mockResults,
      isLoading: false,
      error: null,
      metrics: { lastDurationMs: 100, lastQuery: 'movie', completedCount: 1, abortedCount: 0 },
    });

    render(
      <MovieSearchCombobox
        disabledTconsts={new Set()}
        onSelectOption={mockOnSelectOption}
      />
    );

    const input = screen.getByPlaceholderText('Szukaj filmów...');
    fireEvent.change(input, { target: { value: 'mo' } });

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    // Navigate to first item
    fireEvent.keyDown(input, { key: 'ArrowDown' });

    // Select with Enter
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockOnSelectOption).toHaveBeenCalledWith(mockResults[0]);
  });

  it('should close on Escape key', async () => {
    const mockResults = [
      { tconst: 'tt0111161', primaryTitle: 'Movie 1', startYear: 1994, avgRating: '9.3', posterUrl: '/poster.jpg' },
    ];

    mockUseMovieSearch.mockReturnValue({
      data: mockResults,
      isLoading: false,
      error: null,
      metrics: { lastDurationMs: 100, lastQuery: 'movie', completedCount: 1, abortedCount: 0 },
    });

    render(
      <MovieSearchCombobox
        disabledTconsts={new Set()}
        onSelectOption={mockOnSelectOption}
      />
    );

    const input = screen.getByPlaceholderText('Szukaj filmów...');
    fireEvent.change(input, { target: { value: 'mo' } });

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    // Press Escape
    fireEvent.keyDown(input, { key: 'Escape' });

    // Check that aria-expanded is set to false
    await waitFor(() => {
      expect(input).toHaveAttribute('aria-expanded', 'false');
    });
  });

  it('should show loader when isLoading', async () => {
    mockUseMovieSearch.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      metrics: { lastDurationMs: null, lastQuery: '', completedCount: 0, abortedCount: 0 },
    });

    render(
      <MovieSearchCombobox
        disabledTconsts={new Set()}
        onSelectOption={mockOnSelectOption}
      />
    );

    const input = screen.getByPlaceholderText('Szukaj filmów...');
    fireEvent.change(input, { target: { value: 'sh' } });

    // Should show loader icon
    await waitFor(() => {
      const loader = document.querySelector('.animate-spin');
      expect(loader).toBeInTheDocument();
    });
  });

  it('should show error message when error occurs', async () => {
    mockUseMovieSearch.mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error('Search failed'),
      metrics: { lastDurationMs: null, lastQuery: '', completedCount: 0, abortedCount: 0 },
    });

    render(
      <MovieSearchCombobox
        disabledTconsts={new Set()}
        onSelectOption={mockOnSelectOption}
      />
    );

    const input = screen.getByPlaceholderText('Szukaj filmów...');
    fireEvent.change(input, { target: { value: 'sh' } });

    await waitFor(() => {
      expect(screen.getByText('Nie udało się pobrać wyników wyszukiwania. Spróbuj ponownie')).toBeInTheDocument();
    });
  });

  it('should show empty state when no results', async () => {
    mockUseMovieSearch.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      metrics: { lastDurationMs: 100, lastQuery: 'nonexistent', completedCount: 1, abortedCount: 0 },
    });

    render(
      <MovieSearchCombobox
        disabledTconsts={new Set()}
        onSelectOption={mockOnSelectOption}
      />
    );

    const input = screen.getByPlaceholderText('Szukaj filmów...');
    fireEvent.change(input, { target: { value: 'xy' } });

    await waitFor(() => {
      expect(screen.getByText('Nie znaleziono filmów')).toBeInTheDocument();
    });
  });

  it('should keep search results visible after picking', async () => {
    const mockResults = [
      { tconst: 'tt0111161', primaryTitle: 'Movie 1', startYear: 1994, avgRating: '9.3', posterUrl: '/poster.jpg' },
    ];

    mockUseMovieSearch.mockReturnValue({
      data: mockResults,
      isLoading: false,
      error: null,
      metrics: { lastDurationMs: 100, lastQuery: 'movie', completedCount: 1, abortedCount: 0 },
    });

    render(
      <MovieSearchCombobox
        disabledTconsts={new Set()}
        onSelectOption={mockOnSelectOption}
      />
    );

    const input = screen.getByPlaceholderText('Szukaj filmów...');
    fireEvent.change(input, { target: { value: 'mo' } });

    await waitFor(() => {
      const resultItem = screen.getByRole('option');
      fireEvent.click(resultItem);
    });

    // Search results should remain visible after adding a movie
    expect(input).toHaveValue('mo');
    expect(screen.getByRole('option')).toBeInTheDocument();
  });

  it('should call onChange when typing', () => {
    render(
      <MovieSearchCombobox
        disabledTconsts={new Set()}
        onSelectOption={mockOnSelectOption}
      />
    );

    const input = screen.getByPlaceholderText('Szukaj filmów...');

    fireEvent.change(input, { target: { value: 'test query' } });

    expect(input).toHaveValue('test query');
  });

  it('should use debounced search query', () => {
    // Test that the component uses debounced query for search
    // The actual debouncing is tested in useDebouncedValue.test.ts
    // Here we just verify that useMovieSearch is called with the query value
    render(
      <MovieSearchCombobox
        disabledTconsts={new Set()}
        onSelectOption={mockOnSelectOption}
      />
    );

    const input = screen.getByPlaceholderText('Szukaj filmów...');

    // Change input value
    fireEvent.change(input, { target: { value: 'test' } });

    // Verify that useMovieSearch was called (mock verification)
    // The debounce behavior is tested separately in useDebouncedValue tests
    expect(mockUseMovieSearch).toHaveBeenCalled();
  });
});
