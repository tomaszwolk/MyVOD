import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/utils';
import { SearchResultItem } from '../SearchResultItem';
import type { SearchOptionVM } from '@/types/api.types';

const mockSearchOption: SearchOptionVM = {
  tconst: 'tt0111161',
  primaryTitle: 'The Shawshank Redemption',
  startYear: 1994,
  avgRating: '9.3',
  posterUrl: '/poster.jpg',
};

const mockSearchOptionWithoutPoster: SearchOptionVM = {
  tconst: 'tt0111161',
  primaryTitle: 'The Shawshank Redemption',
  startYear: 1994,
  avgRating: '9.3',
  posterUrl: null,
};

describe('SearchResultItem', () => {
  it('should render movie title and year', () => {
    const mockOnAdd = vi.fn();

    render(<SearchResultItem item={mockSearchOption} disabled={false} onAdd={mockOnAdd} />);

    expect(screen.getByText('The Shawshank Redemption')).toBeInTheDocument();
    expect(screen.getByText('1994')).toBeInTheDocument();
  });

  it('should render poster image when posterUrl exists', () => {
    const mockOnAdd = vi.fn();

    render(<SearchResultItem item={mockSearchOption} disabled={false} onAdd={mockOnAdd} />);

    const img = screen.getByAltText('The Shawshank Redemption poster');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/poster.jpg');
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  it('should render placeholder when posterUrl is null', () => {
    const mockOnAdd = vi.fn();

    render(<SearchResultItem item={mockSearchOptionWithoutPoster} disabled={false} onAdd={mockOnAdd} />);

    expect(screen.getByText('No image')).toBeInTheDocument();
  });

  it('should call onAdd when item is clicked', () => {
    const mockOnAdd = vi.fn();

    render(<SearchResultItem item={mockSearchOption} disabled={false} onAdd={mockOnAdd} />);

    const item = screen.getByRole('option');
    fireEvent.click(item);

    expect(mockOnAdd).toHaveBeenCalledTimes(1);
    expect(mockOnAdd).toHaveBeenCalledWith(mockSearchOption);
  });

  it('should call onAdd when button is clicked', () => {
    const mockOnAdd = vi.fn();

    render(<SearchResultItem item={mockSearchOption} disabled={false} onAdd={mockOnAdd} />);

    const button = screen.getByRole('button', { name: /add.*shawshank.*watchlist/i });
    fireEvent.click(button);

    expect(mockOnAdd).toHaveBeenCalledTimes(1);
    expect(mockOnAdd).toHaveBeenCalledWith(mockSearchOption);
  });

  it('should be disabled when disabled prop is true', () => {
    const mockOnAdd = vi.fn();

    render(<SearchResultItem item={mockSearchOption} disabled={true} onAdd={mockOnAdd} />);

    const item = screen.getByRole('option');
    const button = screen.getByRole('button');

    expect(item).toHaveClass('opacity-50');
    expect(item).toHaveClass('cursor-not-allowed');
    expect(item).toHaveAttribute('aria-disabled', 'true');
    expect(item).toHaveAttribute('tabIndex', '-1');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:opacity-50');
  });

  it('should handle keyboard navigation (Enter, Space)', () => {
    const mockOnAdd = vi.fn();

    render(<SearchResultItem item={mockSearchOption} disabled={false} onAdd={mockOnAdd} />);

    const item = screen.getByRole('option');

    // Test Enter key
    fireEvent.keyDown(item, { key: 'Enter' });
    expect(mockOnAdd).toHaveBeenCalledWith(mockSearchOption);

    // Reset mock
    mockOnAdd.mockClear();

    // Test Space key
    fireEvent.keyDown(item, { key: ' ' });
    expect(mockOnAdd).toHaveBeenCalledWith(mockSearchOption);
  });

  it('should not call onAdd when disabled and clicked', () => {
    const mockOnAdd = vi.fn();

    render(<SearchResultItem item={mockSearchOption} disabled={true} onAdd={mockOnAdd} />);

    const item = screen.getByRole('option');
    const button = screen.getByRole('button');

    fireEvent.click(item);
    fireEvent.click(button);

    expect(mockOnAdd).not.toHaveBeenCalled();
  });

  it('should not call onAdd when disabled and keyboard activated', () => {
    const mockOnAdd = vi.fn();

    render(<SearchResultItem item={mockSearchOption} disabled={true} onAdd={mockOnAdd} />);

    const item = screen.getByRole('option');

    fireEvent.keyDown(item, { key: 'Enter' });
    fireEvent.keyDown(item, { key: ' ' });

    expect(mockOnAdd).not.toHaveBeenCalled();
  });

  it('should render rating when available', () => {
    const mockOnAdd = vi.fn();

    render(<SearchResultItem item={mockSearchOption} disabled={false} onAdd={mockOnAdd} />);

    expect(screen.getByText(/⭐\s*9.3/)).toBeInTheDocument();
  });

  it('should have correct accessibility attributes', () => {
    const mockOnAdd = vi.fn();

    render(<SearchResultItem item={mockSearchOption} disabled={false} onAdd={mockOnAdd} />);

    const item = screen.getByRole('option');
    expect(item).toHaveAttribute('role', 'option');
    expect(item).toHaveAttribute('tabIndex', '0');
    expect(item).toHaveAttribute('aria-disabled', 'false');

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Add The Shawshank Redemption to watchlist');
  });
});
