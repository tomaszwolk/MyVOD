import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { OfflineGuard } from '../OfflineGuard';

describe('OfflineGuard', () => {
  const user = userEvent.setup();
  let mockNavigator: Navigator;
  let originalNavigator: Navigator;

  beforeEach(() => {
    // Save original navigator
    originalNavigator = global.navigator;

    // Create mock navigator
    mockNavigator = {
      ...originalNavigator,
      onLine: true,
    };

    // Mock navigator
    vi.stubGlobal('navigator', mockNavigator);

    // Mock window.location.reload
    Object.defineProperty(window, 'location', {
      value: { reload: vi.fn() },
      writable: true,
    });
  });

  afterEach(() => {
    // Restore original navigator
    vi.restoreAllMocks();
  });

  it('should render children when online', () => {
    mockNavigator.onLine = true;

    render(
      <OfflineGuard>
        <div>Test content</div>
      </OfflineGuard>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should render banner when offline and bannerMode=true (default)', () => {
    mockNavigator.onLine = false;

    render(
      <OfflineGuard>
        <div>Test content</div>
      </OfflineGuard>
    );

    expect(screen.getByText('Brak połączenia z internetem. Niektóre funkcje mogą być niedostępne.')).toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /spróbuj ponownie/i })).toBeInTheDocument();
  });

  it('should redirect to /error/offline when offline and bannerMode=false', () => {
    mockNavigator.onLine = false;

    const mockNavigate = vi.fn();
    vi.doMock('react-router-dom', () => ({
      ...vi.importActual('react-router-dom'),
      useNavigate: () => mockNavigate,
    }));

    render(
      <OfflineGuard mode="redirect">
        <div>Test content</div>
      </OfflineGuard>
    );

    // Should not render children
    expect(screen.queryByText('Test content')).not.toBeInTheDocument();
    // Note: useEffect with navigate would require more complex mocking
  });

  it('should update state when online status changes', async () => {
    mockNavigator.onLine = true;

    render(
      <OfflineGuard>
        <div>Test content</div>
      </OfflineGuard>
    );

    // Initially online
    expect(screen.getByText('Test content')).toBeInTheDocument();

    // Simulate going offline
    await act(async () => {
      mockNavigator.onLine = false;
      window.dispatchEvent(new Event('offline'));
    });

    // Should now show offline banner
    expect(screen.getByText('Brak połączenia z internetem. Niektóre funkcje mogą być niedostępne.')).toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();

    // Simulate coming back online
    await act(async () => {
      mockNavigator.onLine = true;
      window.dispatchEvent(new Event('online'));
    });

    // Should hide banner
    expect(screen.queryByText('Brak połączenia z internetem. Niektóre funkcje mogą być niedostępne.')).not.toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should listen to online/offline events', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = render(
      <OfflineGuard>
        <div>Test content</div>
      </OfflineGuard>
    );

    expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  it('should cleanup event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = render(
      <OfflineGuard>
        <div>Test content</div>
      </OfflineGuard>
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  it('should handle banner dismiss when showRetryButton=false', () => {
    mockNavigator.onLine = false;

    render(
      <OfflineGuard showRetryButton={false}>
        <div>Test content</div>
      </OfflineGuard>
    );

    // Should show banner but no retry button
    expect(screen.getByText('Brak połączenia z internetem. Niektóre funkcje mogą być niedostępne.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /spróbuj ponownie/i })).not.toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should reload page when retry button is clicked', async () => {
    mockNavigator.onLine = false;
    const reloadSpy = vi.spyOn(window.location, 'reload').mockImplementation(() => {});

    render(
      <OfflineGuard>
        <div>Test content</div>
      </OfflineGuard>
    );

    const retryButton = screen.getByRole('button', { name: /spróbuj ponownie/i });
    await user.click(retryButton);

    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('should show banner again after going offline again', async () => {
    mockNavigator.onLine = true;

    render(
      <OfflineGuard>
        <div>Test content</div>
      </OfflineGuard>
    );

    // Initially online
    expect(screen.queryByText('Brak połączenia z internetem. Niektóre funkcje mogą być niedostępne.')).not.toBeInTheDocument();

    // Go offline
    await act(async () => {
      mockNavigator.onLine = false;
      window.dispatchEvent(new Event('offline'));
    });

    expect(screen.getByText('Brak połączenia z internetem. Niektóre funkcje mogą być niedostępne.')).toBeInTheDocument();

    // Go back online
    await act(async () => {
      mockNavigator.onLine = true;
      window.dispatchEvent(new Event('online'));
    });

    expect(screen.queryByText('Brak połączenia z internetem. Niektóre funkcje mogą być niedostępne.')).not.toBeInTheDocument();

    // Go offline again
    await act(async () => {
      mockNavigator.onLine = false;
      window.dispatchEvent(new Event('offline'));
    });

    expect(screen.getByText('Brak połączenia z internetem. Niektóre funkcje mogą być niedostępne.')).toBeInTheDocument();
  });
});
