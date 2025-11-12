import { describe, it, expect } from 'vitest';
import { screen, renderWithProviders } from '@/test/utils';
import { ProgressBar } from '../ProgressBar';

describe('ProgressBar', () => {
  it('should display correct step numbers', () => {
    renderWithProviders(<ProgressBar current={2} total={3} />);

    expect(screen.getByText('Krok 2 z 3')).toBeInTheDocument();
  });

  it('should calculate progress percentage', () => {
    renderWithProviders(<ProgressBar current={1} total={3} />);

    expect(screen.getByText('33% ukończony')).toBeInTheDocument();
  });

  it('should render progress bar with correct width', () => {
    const { container } = renderWithProviders(<ProgressBar current={2} total={4} />);

    const progressBar = container.querySelector('[style*="width"]') as HTMLElement;
    expect(progressBar).toBeInTheDocument();
    expect(progressBar.style.width).toBe('50%'); // 2/4 = 50%
  });

  it('should show progress text', () => {
    renderWithProviders(<ProgressBar current={3} total={5} />);

    expect(screen.getByText('60% ukończony')).toBeInTheDocument(); // 3/5 = 60%
  });

  it('should handle edge cases', () => {
    // Test 0 progress
    renderWithProviders(<ProgressBar current={0} total={5} />);
    expect(screen.getByText('0% ukończony')).toBeInTheDocument();

    // Test 100% progress
    renderWithProviders(<ProgressBar current={5} total={5} />);
    expect(screen.getByText('100% ukończony')).toBeInTheDocument();
  });

  it('should have correct structure and styling', () => {
    const { container } = renderWithProviders(<ProgressBar current={1} total={2} />);

    const progressContainer = container.firstChild as HTMLElement;
    expect(progressContainer).toHaveClass('space-y-2');

    const progressBarBackground = container.querySelector('.bg-secondary');
    const progressBarFill = container.querySelector('.bg-primary');

    expect(progressBarBackground).toBeInTheDocument();
    expect(progressBarFill).toBeInTheDocument();
    expect(progressBarFill).toHaveClass('transition-all', 'duration-300', 'ease-in-out');
  });
});
