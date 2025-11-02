import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import { SelectedMovieItem } from '../SelectedMovieItem';
import type { OnboardingSelectedItem } from '@/types/view/onboarding-watched.types';

describe('SelectedMovieItem', () => {
  const baseItem: OnboardingSelectedItem = {
    tconst: 'tt0111161',
    primary_title: 'The Shawshank Redemption',
    start_year: 1994,
    poster_path: '/poster.jpg',
    userMovieId: 123,
    source: 'newly_created',
    status: 'success',
  };

  const defaultProps = {
    item: baseItem,
    onUndo: vi.fn(),
  };

  it('should render movie title and year', () => {
    render(<SelectedMovieItem {...defaultProps} />);

    expect(screen.getByText('The Shawshank Redemption')).toBeInTheDocument();
    expect(screen.getByText('1994')).toBeInTheDocument();
  });

  it('should render poster when available', () => {
    render(<SelectedMovieItem {...defaultProps} />);

    const img = screen.getByAltText('The Shawshank Redemption poster');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/poster.jpg');
  });

  it('should render placeholder when poster not available', () => {
    const itemWithoutPoster = { ...baseItem, poster_path: null };
    render(<SelectedMovieItem {...defaultProps} item={itemWithoutPoster} />);

    expect(screen.getByText('No image')).toBeInTheDocument();
  });

  it('should show loading status', () => {
    const loadingItem = { ...baseItem, status: 'loading' as const };
    render(<SelectedMovieItem {...defaultProps} item={loadingItem} />);

    expect(screen.getByText('Oznaczanie...')).toBeInTheDocument();
    // Check for loading spinner (Loader2 icon with animate-spin)
    const spinner = document.querySelector('[class*="animate-spin"]');
    expect(spinner).toBeInTheDocument();
  });

  it('should show success status', () => {
    const successItem = { ...baseItem, status: 'success' as const };
    render(<SelectedMovieItem {...defaultProps} item={successItem} />);

    expect(screen.getByText('Obejrzany')).toBeInTheDocument();
    // Check for success icon (CheckCircle2 with green color)
    const checkIcon = document.querySelector('[class*="text-green-600"]');
    expect(checkIcon).toBeInTheDocument();
  });

  it('should show error status', () => {
    const errorItem = { ...baseItem, status: 'error' as const, error: 'Test error' };
    render(<SelectedMovieItem {...defaultProps} item={errorItem} />);

    expect(screen.getByText('Test error')).toBeInTheDocument();
    // Check for error styling on the main container (border-destructive, bg-destructive/5)
    // The main container is the one that contains the movie title
    const titleElement = screen.getByText('The Shawshank Redemption');
    const mainContainer = titleElement.parentElement?.parentElement;
    expect(mainContainer).toHaveClass('border-destructive', 'bg-destructive/5');
  });

  it('should disable undo button when loading', () => {
    const loadingItem = { ...baseItem, status: 'loading' as const };
    render(<SelectedMovieItem {...defaultProps} item={loadingItem} />);

    const undoButton = screen.getByRole('button', { name: /Cofnij oznaczenie filmu/ });
    expect(undoButton).toBeDisabled();
  });

  it('should call onUndo when X clicked', () => {
    const onUndo = vi.fn();
    const successItem = { ...baseItem, status: 'success' as const };
    render(<SelectedMovieItem {...defaultProps} item={successItem} onUndo={onUndo} />);

    const undoButton = screen.getByRole('button', { name: /Cofnij oznaczenie filmu The Shawshank Redemption/ });
    undoButton.click();

    expect(onUndo).toHaveBeenCalledWith(successItem);
  });
});
