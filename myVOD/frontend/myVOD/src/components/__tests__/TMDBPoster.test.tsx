import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@/test/utils';
import { TMDBPoster } from '../TMDBPoster';
import { logTMDBImageError } from '@/utils/error-logger';

vi.mock('@/utils/error-logger', () => ({
  logTMDBImageError: vi.fn(),
}));

describe('TMDBPoster', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render img when src provided', () => {
    render(<TMDBPoster src="/poster.jpg" alt="Movie poster" width={200} height={300} />);

    const img = screen.getByAltText('Movie poster');
    expect(img).toHaveAttribute('src', '/poster.jpg');
    expect(img).toHaveAttribute('width', '200');
    expect(img).toHaveAttribute('height', '300');
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  it('should render placeholder when src is null', () => {
    render(<TMDBPoster src={null} alt="Movie poster" width={200} height={300} />);

    const placeholder = screen.getByRole('img', { hidden: true });
    expect(placeholder).toHaveAttribute('aria-label', 'Brak plakatu dla filmu Movie poster');
    expect(placeholder).toHaveClass('bg-muted');
    expect(placeholder).toHaveStyle({ width: '200px', height: '300px' });
  });

  it('should render placeholder when src is undefined', () => {
    render(<TMDBPoster src={undefined} alt="Movie poster" width={200} height={300} />);

    const placeholder = screen.getByRole('img', { hidden: true });
    expect(placeholder).toHaveAttribute('aria-label', 'Brak plakatu dla filmu Movie poster');
  });

  it('should render placeholder when image fails to load', async () => {
    const mockLogError = vi.mocked(logTMDBImageError);

    render(<TMDBPoster src="/broken.jpg" alt="Broken poster" width={200} height={300} />);

    const img = screen.getByAltText('Broken poster');
    expect(img).toHaveAttribute('src', '/broken.jpg');

    // Simulate error event with act()
    await act(async () => {
      img.dispatchEvent(new Event('error'));
    });

    // Should now show placeholder
    const placeholder = screen.getByRole('img', { hidden: true });
    expect(placeholder).toHaveAttribute('aria-label', 'Brak plakatu dla filmu Broken poster');
    expect(placeholder).toHaveStyle({ width: '200px', height: '300px' });

    // Should log error
    expect(mockLogError).toHaveBeenCalledWith('/broken.jpg', 'Broken poster', {
      width: 200,
      height: 300,
    });
  });

  it('should have correct dimensions', () => {
    render(<TMDBPoster src="/poster.jpg" alt="Movie poster" width={150} height={225} />);

    const img = screen.getByAltText('Movie poster');
    expect(img).toHaveAttribute('width', '150');
    expect(img).toHaveAttribute('height', '225');
  });

  it('should have correct alt attribute', () => {
    render(<TMDBPoster src="/poster.jpg" alt="Inception poster" width={200} height={300} />);

    const img = screen.getByAltText('Inception poster');
    expect(img).toHaveAttribute('alt', 'Inception poster');
  });

  it('should have lazy loading', () => {
    render(<TMDBPoster src="/poster.jpg" alt="Movie poster" width={200} height={300} />);

    const img = screen.getByAltText('Movie poster');
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  it('should call logTMDBImageError when image fails', async () => {
    const mockLogError = vi.mocked(logTMDBImageError);

    render(<TMDBPoster src="/error.jpg" alt="Error poster" width={100} height={150} />);

    const img = screen.getByAltText('Error poster');

    await act(async () => {
      img.dispatchEvent(new Event('error'));
    });

    expect(mockLogError).toHaveBeenCalledWith('/error.jpg', 'Error poster', {
      width: 100,
      height: 150,
    });
  });

  it('should have correct ARIA attributes for placeholder', () => {
    render(<TMDBPoster src={null} alt="No poster movie" width={200} height={300} />);

    const placeholder = screen.getByRole('img', { hidden: true });
    expect(placeholder).toHaveAttribute('role', 'img');
    expect(placeholder).toHaveAttribute('aria-label', 'Brak plakatu dla filmu No poster movie');
  });

  it('should apply custom className', () => {
    const customClass = 'rounded-lg shadow-md';

    render(
      <TMDBPoster
        src="/poster.jpg"
        alt="Movie poster"
        width={200}
        height={300}
        className={customClass}
      />
    );

    const img = screen.getByAltText('Movie poster');
    expect(img).toHaveClass(customClass);
  });

  it('should handle className for both img and placeholder', async () => {
    const customClass = 'border-2 border-gray-300';

    // Test with img
    const { rerender } = render(
      <TMDBPoster
        src="/poster.jpg"
        alt="Movie poster"
        width={200}
        height={300}
        className={customClass}
      />
    );

    const element = screen.getByAltText('Movie poster');
    expect(element).toHaveClass(customClass);

    // Test with placeholder (trigger error)
    const img = screen.getByAltText('Movie poster');

    await act(async () => {
      img.dispatchEvent(new Event('error'));
    });

    const placeholder = screen.getByRole('img', { hidden: true });
    expect(placeholder).toHaveClass('bg-muted', customClass);
  });

  it('should handle different image sources', () => {
    const testCases = [
      'https://image.tmdb.org/t/p/w500/poster1.jpg',
      'https://example.com/poster2.jpg',
      '/local/poster3.jpg',
    ];

    testCases.forEach((src, index) => {
      const { rerender } = render(
        <TMDBPoster src={src} alt={`Test poster ${index}`} width={200} height={300} />
      );

      const img = screen.getByAltText(`Test poster ${index}`);
      expect(img).toHaveAttribute('src', src);
    });
  });
});
