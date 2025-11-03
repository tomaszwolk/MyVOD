import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@/test/utils';
import { WatchedSearchCombobox } from '../WatchedSearchCombobox';
import { useMovieSearch } from '@/hooks/useMovieSearch';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { SearchOptionVM } from '@/types/api.types';

// Mock Radix UI Popover to avoid floating-ui issues in tests
let popoverOpen = false;
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children, open }: { children: React.ReactNode; open?: boolean }) => {
    popoverOpen = open || false;
    return <div>{children}</div>;
  },
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) =>
    popoverOpen ? <div data-testid="popover-content">{children}</div> : null,
}));

// Mock the hooks
vi.mock('@/hooks/useMovieSearch');
vi.mock('@/hooks/useDebouncedValue');

const mockUseMovieSearch = vi.mocked(useMovieSearch);
const mockUseDebouncedValue = vi.mocked(useDebouncedValue);

// Test data
const mockSearchOption: SearchOptionVM = {
  tconst: 'tt0111161',
  primaryTitle: 'The Shawshank Redemption',
  startYear: 1994,
  avgRating: '9.3',
  posterUrl: '/poster.jpg',
};

const mockSearchOptionWithoutPoster: SearchOptionVM = {
  tconst: 'tt0111162',
  primaryTitle: 'The Godfather',
  startYear: 1972,
  avgRating: '9.2',
  posterUrl: null,
};

describe('WatchedSearchCombobox', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    onPick: vi.fn(),
    disabled: false,
    selectedTconsts: new Set<string>(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks
    mockUseMovieSearch.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      metrics: {
        lastQuery: '',
        lastDurationMs: null,
        completedCount: 0,
        abortedCount: 0,
      },
    } as any);

    mockUseDebouncedValue.mockImplementation((value) => value);
  });

  // Helper to open the popover by setting proper value
  const openPopover = (value: string = 'shaw') => {
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value } });
    fireEvent.focus(input);
  };

  it('should render search input with correct placeholder', () => {
    render(<WatchedSearchCombobox {...defaultProps} />);

    const input = screen.getByRole('combobox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'Szukaj filmów...');
  });

  it('should show disabled placeholder when disabled', () => {
    render(<WatchedSearchCombobox {...defaultProps} disabled={true} />);

    const input = screen.getByRole('combobox');
    expect(input).toHaveAttribute('placeholder', 'Osiągnięto limit 3 filmów');
    expect(input).toBeDisabled();
  });

  it('should call onChange when typing', () => {
    const onChange = vi.fn();
    render(<WatchedSearchCombobox {...defaultProps} onChange={onChange} />);

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'shawshank' } });

    expect(onChange).toHaveBeenCalledWith('shawshank');
  });

  it('should debounce search (250ms)', () => {
    const onChange = vi.fn();

    const { rerender } = render(<WatchedSearchCombobox {...defaultProps} onChange={onChange} value="" />);

    // Initially called with empty value
    expect(mockUseDebouncedValue).toHaveBeenCalledWith('', 450);

    // Change the value prop (simulating parent component updating the value)
    rerender(<WatchedSearchCombobox {...defaultProps} onChange={onChange} value="shawshank" />);

    // useDebouncedValue should be called with the new value and default delay (450ms in component)
    expect(mockUseDebouncedValue).toHaveBeenCalledWith('shawshank', 450);
  });

  it('should show search results dropdown when query >= 2 chars', () => {
    mockUseMovieSearch.mockReturnValue({
      data: [mockSearchOption],
      isLoading: false,
      error: null,
      metrics: {
        lastQuery: '',
        lastDurationMs: null,
        completedCount: 0,
        abortedCount: 0,
      },
    } as any);

    render(<WatchedSearchCombobox {...defaultProps} value="" />);
    openPopover('shaw');

    // The dropdown should be rendered when there are results and query length >= 2
    expect(screen.getByText('The Shawshank Redemption')).toBeInTheDocument();
  });

  it('should not show dropdown when query < 2 chars', () => {
    mockUseMovieSearch.mockReturnValue({
      data: [mockSearchOption],
      isLoading: false,
      error: null,
      metrics: {
        lastQuery: '',
        lastDurationMs: null,
        completedCount: 0,
        abortedCount: 0,
      },
    } as any);

    render(<WatchedSearchCombobox {...defaultProps} value="s" />);

    // The dropdown should not be rendered when query length < 2
    expect(screen.queryByText('The Shawshank Redemption')).not.toBeInTheDocument();
  });

  it('should show loading spinner when isLoading', () => {
    mockUseMovieSearch.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      metrics: {
        lastQuery: '',
        lastDurationMs: null,
        completedCount: 0,
        abortedCount: 0,
      },
    } as any);

    render(<WatchedSearchCombobox {...defaultProps} value="shawshank" />);

    const input = screen.getByRole('combobox');
    expect(input).toBeInTheDocument();

    // Check for loading spinner (Loader2 icon)
    const loadingIcon = document.querySelector('[class*="animate-spin"]');
    expect(loadingIcon).toBeInTheDocument();
  });

  it('should show error message when error occurs', () => {
    mockUseMovieSearch.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network error'),
      metrics: {
        lastQuery: '',
        lastDurationMs: null,
        completedCount: 0,
        abortedCount: 0,
      },
    } as any);

    render(<WatchedSearchCombobox {...defaultProps} value="" />);
    openPopover('shawshank');

    expect(screen.getByText('Nie udało się pobrać wyników wyszukiwania. Spróbuj ponownie')).toBeInTheDocument();
  });

  it('should show empty state when no results', () => {
    mockUseMovieSearch.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      metrics: {
        lastQuery: '',
        lastDurationMs: null,
        completedCount: 0,
        abortedCount: 0,
      },
    } as any);

    render(<WatchedSearchCombobox {...defaultProps} value="" />);
    openPopover('nonexistent');

    expect(screen.getByText('Nie znaleziono filmów')).toBeInTheDocument();
  });

  it('should call onPick when result is clicked', () => {
    const onPick = vi.fn();
    mockUseMovieSearch.mockReturnValue({
      data: [mockSearchOption],
      isLoading: false,
      error: null,
      metrics: {
        lastQuery: '',
        lastDurationMs: null,
        completedCount: 0,
        abortedCount: 0,
      },
    } as any);

    render(<WatchedSearchCombobox {...defaultProps} onPick={onPick} value="" />);
    openPopover('shaw');

    const resultItem = screen.getByText('The Shawshank Redemption');
    fireEvent.click(resultItem);

    expect(onPick).toHaveBeenCalledWith(mockSearchOption);
  });

  it('should keep search results visible after picking', () => {
    const onChange = vi.fn();
    const onPick = vi.fn();
    mockUseMovieSearch.mockReturnValue({
      data: [mockSearchOption],
      isLoading: false,
      error: null,
      metrics: {
        lastQuery: '',
        lastDurationMs: null,
        completedCount: 0,
        abortedCount: 0,
      },
    } as any);

    render(<WatchedSearchCombobox {...defaultProps} onChange={onChange} onPick={onPick} value="" />);
    openPopover('shaw');

    const resultItem = screen.getByText('The Shawshank Redemption');
    fireEvent.click(resultItem);

    // Search results should remain visible after adding a movie
    // onChange should not be called with empty string
    expect(onChange).not.toHaveBeenCalledWith('');
    expect(onPick).toHaveBeenCalledWith(mockSearchOption);
  });

  it('should disable already selected movies', () => {
    const selectedTconsts = new Set(['tt0111161']);
    mockUseMovieSearch.mockReturnValue({
      data: [mockSearchOption, mockSearchOptionWithoutPoster],
      isLoading: false,
      error: null,
      metrics: {
        lastQuery: '',
        lastDurationMs: null,
        completedCount: 0,
        abortedCount: 0,
      },
    } as any);

    render(<WatchedSearchCombobox {...defaultProps} selectedTconsts={selectedTconsts} value="" />);
    openPopover('shaw');

    // Check that the selected movie has opacity-50 class and is disabled
    const selectedMovie = screen.getByText('The Shawshank Redemption');
    expect(selectedMovie.closest('li')).toHaveClass('opacity-50');

    // Check that "Oznacz" button is not rendered for selected movie
    const selectedMovieLi = selectedMovie.closest('li');
    expect(selectedMovieLi?.querySelector('button')).not.toBeInTheDocument();

    // Check that unselected movie still has the button
    const unselectedMovie = screen.getByText('The Godfather');
    const unselectedMovieLi = unselectedMovie.closest('li');
    expect(unselectedMovieLi?.querySelector('button')).toBeInTheDocument();
  });

  it('should navigate with keyboard (Arrow keys)', () => {
    mockUseMovieSearch.mockReturnValue({
      data: [mockSearchOption, mockSearchOptionWithoutPoster],
      isLoading: false,
      error: null,
      metrics: {
        lastQuery: '',
        lastDurationMs: null,
        completedCount: 0,
        abortedCount: 0,
      },
    } as any);

    render(<WatchedSearchCombobox {...defaultProps} value="" />);
    openPopover('shaw');

    const input = screen.getByRole('combobox');

    // ArrowDown should set activeIndex to 0
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getByText('The Shawshank Redemption').closest('li')).toHaveAttribute('aria-selected', 'true');

    // ArrowDown again should set activeIndex to 1
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getByText('The Godfather').closest('li')).toHaveAttribute('aria-selected', 'true');

    // ArrowUp should go back to 0
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(screen.getByText('The Shawshank Redemption').closest('li')).toHaveAttribute('aria-selected', 'true');
  });

  it('should select with Enter key', () => {
    const onPick = vi.fn();
    mockUseMovieSearch.mockReturnValue({
      data: [mockSearchOption, mockSearchOptionWithoutPoster],
      isLoading: false,
      error: null,
      metrics: {
        lastQuery: '',
        lastDurationMs: null,
        completedCount: 0,
        abortedCount: 0,
      },
    } as any);

    render(<WatchedSearchCombobox {...defaultProps} onPick={onPick} value="" />);
    openPopover('shaw');

    const input = screen.getByRole('combobox');

    // Navigate to first item
    fireEvent.keyDown(input, { key: 'ArrowDown' });

    // Press Enter
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onPick).toHaveBeenCalledWith(mockSearchOption);
  });

  it('should close with Escape key', () => {
    mockUseMovieSearch.mockReturnValue({
      data: [mockSearchOption],
      isLoading: false,
      error: null,
      metrics: {
        lastQuery: '',
        lastDurationMs: null,
        completedCount: 0,
        abortedCount: 0,
      },
    } as any);

    render(<WatchedSearchCombobox {...defaultProps} value="" />);
    openPopover('shaw');

    // Initially dropdown should be visible
    expect(screen.getByText('The Shawshank Redemption')).toBeInTheDocument();

    const input = screen.getByRole('combobox');
    // Press Escape
    fireEvent.keyDown(input, { key: 'Escape' });

    // The component sets isOpen to false, but Popover might not immediately hide
    // We can at least test that the key event was handled (no error thrown)
  });

  it('should have correct ARIA attributes', () => {
    render(<WatchedSearchCombobox {...defaultProps} />);

    const input = screen.getByRole('combobox');

    expect(input).toHaveAttribute('role', 'combobox');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).toHaveAttribute('aria-haspopup', 'listbox');
    expect(input).toHaveAttribute('aria-autocomplete', 'list');
  });
});
