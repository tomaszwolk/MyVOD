import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import { SelectedMoviesList } from '../SelectedMoviesList';
import type { OnboardingSelectedItem } from '@/types/view/onboarding-watched.types';

describe('SelectedMoviesList', () => {
  const mockItem: OnboardingSelectedItem = {
    tconst: 'tt0111161',
    primary_title: 'The Shawshank Redemption',
    start_year: 1994,
    poster_path: '/poster.jpg',
    userMovieId: 123,
    source: 'newly_created',
    status: 'success',
  };

  const mockItem2: OnboardingSelectedItem = {
    tconst: 'tt0068646',
    primary_title: 'The Godfather',
    start_year: 1972,
    poster_path: null,
    userMovieId: 456,
    source: 'preexisting_watchlist',
    status: 'loading',
  };

  const defaultProps = {
    items: [],
    maxItems: 3,
    onUndo: vi.fn(),
  };

  it('should render empty state when no items', () => {
    render(<SelectedMoviesList {...defaultProps} />);

    expect(screen.getByText('Brak oznaczonych filmów')).toBeInTheDocument();
    expect(screen.getByText('Wyszukaj i oznacz filmy które już widziałeś')).toBeInTheDocument();
  });

  it('should render movie items', () => {
    render(<SelectedMoviesList {...defaultProps} items={[mockItem, mockItem2]} />);

    expect(screen.getByText('The Shawshank Redemption')).toBeInTheDocument();
    expect(screen.getByText('The Godfather')).toBeInTheDocument();
  });

  it('should show counter badge', () => {
    render(<SelectedMoviesList {...defaultProps} items={[mockItem, mockItem2]} />);

    expect(screen.getByText('2/3')).toBeInTheDocument();
    expect(screen.getByText('Oznaczone filmy')).toBeInTheDocument();
  });

  it('should call onUndo when undo button clicked', () => {
    const onUndo = vi.fn();
    render(<SelectedMoviesList {...defaultProps} items={[mockItem]} onUndo={onUndo} />);

    // Find the X button and click it
    const undoButton = screen.getByRole('button', { name: /Cofnij oznaczenie filmu The Shawshank Redemption/ });
    undoButton.click();

    expect(onUndo).toHaveBeenCalledWith(mockItem);
  });
});
