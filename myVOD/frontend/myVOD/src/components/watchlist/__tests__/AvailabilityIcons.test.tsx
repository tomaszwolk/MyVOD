import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AvailabilityIcons } from '../AvailabilityIcons';
import type { MovieAvailabilityDto, PlatformDto } from '@/types/api.types';

describe('AvailabilityIcons', () => {
  const mockPlatforms: PlatformDto[] = [
    { id: 1, platform_slug: 'netflix', platform_name: 'Netflix' },
    { id: 2, platform_slug: 'hbo', platform_name: 'HBO' },
    { id: 3, platform_slug: 'amazon-prime', platform_name: 'Amazon Prime' },
  ];

  it('should render platform icons for all user platforms with availability status', () => {
    const availability: MovieAvailabilityDto[] = [
      { platform_id: 1, platform_name: 'Netflix', is_available: true },
      { platform_id: 2, platform_name: 'HBO', is_available: false },
    ];

    render(<AvailabilityIcons availability={availability} platforms={mockPlatforms} />);

    // Should show accessible labels for both platforms
    expect(screen.getByRole('img', { name: 'Netflix: Dostępny' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'HBO: Niedostępny' })).toBeInTheDocument();

    // Should have green styling for available platform
    const netflixIcon = screen.getByRole('img', { name: 'Netflix: Dostępny' });
    expect(netflixIcon).toHaveClass('bg-white-100', 'text-green-800');

    // Should have gray styling for unavailable platform
    const hboIcon = screen.getByRole('img', { name: 'HBO: Niedostępny' });
    expect(hboIcon).toHaveClass('bg-gray-100', 'text-gray-500');
  });

  it('should show unknown availability badge when no user platforms available', () => {
    const availability: MovieAvailabilityDto[] = [
      { platform_id: 3, platform_name: 'Amazon Prime', is_available: true },
    ];

    // User only has Netflix and HBO platforms
    const userPlatforms = mockPlatforms.slice(0, 2);

    render(<AvailabilityIcons availability={availability} platforms={userPlatforms} />);

    expect(screen.getByText('Niedostępny')).toBeInTheDocument();
  });

  it('should show unknown availability badge when no availability data', () => {
    render(<AvailabilityIcons availability={[]} platforms={mockPlatforms} />);

    expect(screen.getByText('Niedostępny')).toBeInTheDocument();
  });

  it('should only show platforms that user has selected', () => {
    const availability: MovieAvailabilityDto[] = [
      { platform_id: 1, platform_name: 'Netflix', is_available: true },
      { platform_id: 2, platform_name: 'HBO', is_available: true },
      { platform_id: 3, platform_name: 'Amazon Prime', is_available: true },
    ];

    // User only has Netflix
    const userPlatforms = [mockPlatforms[0]];

    render(<AvailabilityIcons availability={availability} platforms={userPlatforms} />);

    // Should only show Netflix icon
    expect(screen.getByRole('img', { name: 'Netflix: Dostępny' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'HBO: Dostępny' })).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Amazon Prime: Dostępny' })).not.toBeInTheDocument();
  });

  it('should handle unknown platform slugs gracefully', () => {
    const availability: MovieAvailabilityDto[] = [
      { platform_id: 1, platform_name: 'Netflix', is_available: true },
    ];

    const platformsWithUnknown: PlatformDto[] = [
      { ...mockPlatforms[0], platform_slug: 'unknown-platform' },
    ];

    render(<AvailabilityIcons availability={availability} platforms={platformsWithUnknown} />);

    // Should show tooltip for unknown platform
    expect(screen.getByRole('img', { name: 'Netflix: Dostępny' })).toBeInTheDocument();
    // Should still render even with unknown slug (uses default icon)
    expect(screen.getByRole('img', { name: 'Netflix: Dostępny' })).toBeInTheDocument();
  });

  it('should show multiple available platforms', () => {
    const availability: MovieAvailabilityDto[] = [
      { platform_id: 1, platform_name: 'Netflix', is_available: true },
      { platform_id: 2, platform_name: 'HBO', is_available: true },
    ];

    render(<AvailabilityIcons availability={availability} platforms={mockPlatforms} />);

    expect(screen.getByRole('img', { name: 'Netflix: Dostępny' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'HBO: Dostępny' })).toBeInTheDocument();
  });

  it('should handle null availability status as unavailable', () => {
    const availability: MovieAvailabilityDto[] = [
      { platform_id: 1, platform_name: 'Netflix', is_available: null },
    ];

    render(<AvailabilityIcons availability={availability} platforms={mockPlatforms} />);

    // Should show Netflix icon as unavailable (gray) when availability is null
    const netflixIcon = screen.getByRole('img', { name: 'Netflix: Niedostępny' });
    expect(netflixIcon).toBeInTheDocument();
    expect(netflixIcon).toHaveClass('bg-gray-100', 'text-gray-500');
    expect(screen.queryByText('Niedostępny')).not.toBeInTheDocument();
  });
});
