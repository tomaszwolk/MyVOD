import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@/test/utils';
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
    render(
      <TMDBPoster src="/poster.jpg" alt="Movie poster" width={200} height={300}>
        {({ imgProps }) => <img {...imgProps} alt="Movie poster" width={200} height={300} loading="lazy" />}
      </TMDBPoster>
    );

    const img = screen.getByAltText('Movie poster');
    expect(img).toHaveAttribute('src', '/poster.jpg');
    expect(img).toHaveAttribute('width', '200');
    expect(img).toHaveAttribute('height', '300');
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  it('should render placeholder when src is null', () => {
    render(
      <TMDBPoster src={null} alt="Movie poster" width={200} height={300}>
        {({ isPlaceholder, imgProps }) => (
          <div className={isPlaceholder ? 'bg-muted' : ''} style={{ width: '200px', height: '300px' }}>
            <img {...imgProps} alt="Movie poster" width={200} height={300} loading="lazy" />
          </div>
        )}
      </TMDBPoster>
    );

    const img = screen.getByAltText('Movie poster');
    expect(img).toBeInTheDocument();
    // When placeholder, src should be the placeholder image
    expect(img).toHaveAttribute('src', expect.stringContaining('poster-myVOD.png'));
  });

  it('should render placeholder when src is undefined', () => {
    render(
      <TMDBPoster src={undefined} alt="Movie poster" width={200} height={300}>
        {({ isPlaceholder, imgProps }) => (
          <img {...imgProps} alt="Movie poster" width={200} height={300} loading="lazy" />
        )}
      </TMDBPoster>
    );

    const img = screen.getByAltText('Movie poster');
    expect(img).toBeInTheDocument();
    // When placeholder, src should be the placeholder image
    expect(img).toHaveAttribute('src', expect.stringContaining('poster-myVOD.png'));
  });

  it('should render placeholder when image fails to load', async () => {
    const mockLogError = vi.mocked(logTMDBImageError);

    render(
      <TMDBPoster src="/broken.jpg" alt="Broken poster" width={200} height={300}>
        {({ isPlaceholder, imgProps }) => (
          <img {...imgProps} alt="Broken poster" width={200} height={300} loading="lazy" />
        )}
      </TMDBPoster>
    );

    const img = screen.getByAltText('Broken poster');
    expect(img).toHaveAttribute('src', '/broken.jpg');

    // Simulate error event with act()
    await act(async () => {
      img.dispatchEvent(new Event('error'));
    });

    // Should now show placeholder (src should change to placeholder)
    await waitFor(() => {
      const updatedImg = screen.getByAltText('Broken poster');
      expect(updatedImg).toHaveAttribute('src', expect.stringContaining('poster-myVOD.png'));
    });

    // Should log error
    expect(mockLogError).toHaveBeenCalledWith('/broken.jpg', 'Broken poster', {
      width: 200,
      height: 300,
    });
  });

  it('should have correct dimensions', () => {
    render(
      <TMDBPoster src="/poster.jpg" alt="Movie poster" width={150} height={225}>
        {({ imgProps }) => <img {...imgProps} alt="Movie poster" width={150} height={225} loading="lazy" />}
      </TMDBPoster>
    );

    const img = screen.getByAltText('Movie poster');
    expect(img).toHaveAttribute('width', '150');
    expect(img).toHaveAttribute('height', '225');
  });

  it('should have correct alt attribute', () => {
    render(
      <TMDBPoster src="/poster.jpg" alt="Inception poster" width={200} height={300}>
        {({ imgProps }) => <img {...imgProps} alt="Inception poster" width={200} height={300} loading="lazy" />}
      </TMDBPoster>
    );

    const img = screen.getByAltText('Inception poster');
    expect(img).toHaveAttribute('alt', 'Inception poster');
  });

  it('should have lazy loading', () => {
    render(
      <TMDBPoster src="/poster.jpg" alt="Movie poster" width={200} height={300}>
        {({ imgProps }) => <img {...imgProps} alt="Movie poster" width={200} height={300} loading="lazy" />}
      </TMDBPoster>
    );

    const img = screen.getByAltText('Movie poster');
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  it('should call logTMDBImageError when image fails', async () => {
    const mockLogError = vi.mocked(logTMDBImageError);

    render(
      <TMDBPoster src="/error.jpg" alt="Error poster" width={100} height={150}>
        {({ imgProps }) => <img {...imgProps} alt="Error poster" width={100} height={150} loading="lazy" />}
      </TMDBPoster>
    );

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
    render(
      <TMDBPoster src={null} alt="No poster movie" width={200} height={300}>
        {({ isPlaceholder, imgProps }) => (
          <img {...imgProps} alt="No poster movie" width={200} height={300} loading="lazy" />
        )}
      </TMDBPoster>
    );

    const img = screen.getByAltText('No poster movie');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', expect.stringContaining('poster-myVOD.png'));
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
      >
        {({ imgProps }) => <img {...imgProps} alt="Movie poster" width={200} height={300} loading="lazy" />}
      </TMDBPoster>
    );

    const img = screen.getByAltText('Movie poster');
    expect(img).toHaveClass(customClass);
  });

  it('should handle className for both img and placeholder', async () => {
    const customClass = 'border-2 border-gray-300';

    // Test with img
    render(
      <TMDBPoster
        src="/poster.jpg"
        alt="Movie poster"
        width={200}
        height={300}
        className={customClass}
      >
        {({ imgProps }) => <img {...imgProps} alt="Movie poster" width={200} height={300} loading="lazy" />}
      </TMDBPoster>
    );

    const element = screen.getByAltText('Movie poster');
    expect(element).toHaveClass(customClass);

    // Test with placeholder (trigger error)
    const img = screen.getByAltText('Movie poster');

    await act(async () => {
      img.dispatchEvent(new Event('error'));
    });

    // After error, className should still be applied (but object-contain replaces object-cover)
    await waitFor(() => {
      const updatedImg = screen.getByAltText('Movie poster');
      expect(updatedImg).toHaveClass(customClass);
    });
  });

  it('should handle different image sources', () => {
    const testCases = [
      'https://image.tmdb.org/t/p/w500/poster1.jpg',
      'https://example.com/poster2.jpg',
      '/local/poster3.jpg',
    ];

    testCases.forEach((src, index) => {
      const { unmount } = render(
        <TMDBPoster src={src} alt={`Test poster ${index}`} width={200} height={300}>
          {({ imgProps }) => <img {...imgProps} alt={`Test poster ${index}`} width={200} height={300} loading="lazy" />}
        </TMDBPoster>
      );

      const img = screen.getByAltText(`Test poster ${index}`);
      expect(img).toHaveAttribute('src', src);
      unmount();
    });
  });
});
