import { describe, it, expect, vi } from 'vitest';
import { screen, renderWithProviders } from '@/test/utils';
import { ActionBar } from '../ActionBar';

describe('ActionBar', () => {
  const defaultProps = {
    onSkip: vi.fn(),
    onNext: vi.fn(),
    isBusy: false,
  };

  it('should render Skip and Next buttons', () => {
    renderWithProviders(<ActionBar {...defaultProps} />);

    expect(screen.getByRole('button', { name: 'Skip platform selection and continue to next step' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save platform selection and continue' })).toBeInTheDocument();
  });

  it('should call onSkip when Skip clicked', () => {
    const onSkip = vi.fn();
    renderWithProviders(<ActionBar {...defaultProps} onSkip={onSkip} />);

    const skipButton = screen.getByRole('button', { name: 'Skip platform selection and continue to next step' });
    skipButton.click();

    expect(onSkip).toHaveBeenCalled();
  });

  it('should call onNext when Next clicked', () => {
    const onNext = vi.fn();
    renderWithProviders(<ActionBar {...defaultProps} onNext={onNext} />);

    const nextButton = screen.getByRole('button', { name: 'Save platform selection and continue' });
    nextButton.click();

    expect(onNext).toHaveBeenCalled();
  });

  it('should disable buttons when isBusy=true', () => {
    renderWithProviders(<ActionBar {...defaultProps} isBusy={true} />);

    const skipButton = screen.getByRole('button', { name: 'Skip platform selection and continue to next step' });
    const nextButton = screen.getByRole('button', { name: 'Saving...' });

    expect(skipButton).toBeDisabled();
    expect(nextButton).toBeDisabled();
  });

  it('should show "Saving..." text when busy', () => {
    renderWithProviders(<ActionBar {...defaultProps} isBusy={true} />);

    expect(screen.getByRole('button', { name: 'Saving...' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save platform selection and continue' })).not.toBeInTheDocument();
  });

  it('should have correct aria-labels', () => {
    renderWithProviders(<ActionBar {...defaultProps} />);

    const skipButton = screen.getByRole('button', { name: 'Skip platform selection and continue to next step' });
    const nextButton = screen.getByRole('button', { name: 'Save platform selection and continue' });

    expect(skipButton).toHaveAttribute('aria-label', 'Skip platform selection and continue to next step');
    expect(nextButton).toHaveAttribute('aria-label', 'Save platform selection and continue');
  });

  it('should have correct aria-label when busy', () => {
    renderWithProviders(<ActionBar {...defaultProps} isBusy={true} />);

    const nextButton = screen.getByRole('button', { name: 'Saving...' });
    expect(nextButton).toHaveAttribute('aria-label', 'Saving...');
  });

  it('should be keyboard accessible', () => {
    renderWithProviders(<ActionBar {...defaultProps} />);

    const skipButton = screen.getByRole('button', { name: 'Skip platform selection and continue to next step' });
    const nextButton = screen.getByRole('button', { name: 'Save platform selection and continue' });

    expect(skipButton).toBeEnabled();
    expect(nextButton).toBeEnabled();
  });

  it('should have correct role and aria-label for group', () => {
    const { container } = renderWithProviders(<ActionBar {...defaultProps} />);

    const actionBar = container.firstChild as HTMLElement;
    expect(actionBar).toHaveAttribute('role', 'group');
    expect(actionBar).toHaveAttribute('aria-label', 'Onboarding actions');
  });
});
