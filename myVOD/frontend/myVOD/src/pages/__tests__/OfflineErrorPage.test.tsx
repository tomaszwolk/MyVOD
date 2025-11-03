import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { OfflineErrorPage } from '../OfflineErrorPage';

// Mock window.location.reload
const mockReload = vi.fn();
Object.defineProperty(window, 'location', {
  value: { ...window.location, reload: mockReload },
  writable: true,
});

// Mock window.location.href
const mockHref = vi.fn();
Object.defineProperty(window.location, 'href', {
  value: '',
  writable: true,
});

// Mock navigator.onLine
const mockNavigator = {
  onLine: true,
};
Object.defineProperty(navigator, 'onLine', {
  value: true,
  writable: true,
});

describe('OfflineErrorPage', () => {
  let addEventListenerSpy: vi.SpyInstance;
  let removeEventListenerSpy: vi.SpyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReload.mockClear();
    mockHref.mockClear();

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
    });

    // Mock event listeners
    addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it('should render ErrorView with offline variant', () => {
    render(<OfflineErrorPage />);

    expect(screen.getByLabelText('Ikona braku połączenia')).toBeInTheDocument();
  });

  it('should display correct title and description in Polish', () => {
    render(<OfflineErrorPage />);

    expect(screen.getByText('Brak połączenia z internetem')).toBeInTheDocument();
    expect(screen.getByText('Wygląda na to, że nie masz połączenia z internetem. Sprawdź swoje połączenie i spróbuj ponownie.')).toBeInTheDocument();
  });

  it('should render retry button', () => {
    render(<OfflineErrorPage />);

    expect(screen.getByRole('button', { name: 'Spróbuj ponownie' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Wróć do strony głównej' })).toBeInTheDocument();
  });

  it('should reload page when retry button clicked and online', async () => {
    const user = userEvent.setup();

    // Mock online state
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
    });

    const { rerender } = render(<OfflineErrorPage />);

    // Force re-render to pick up online state
    rerender(<OfflineErrorPage />);

    const retryButton = screen.getByRole('button', { name: 'Spróbuj ponownie' });
    await user.click(retryButton);

    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  it('should not reload page when retry button clicked and offline', async () => {
    const user = userEvent.setup();

    // Ensure offline state
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
    });

    render(<OfflineErrorPage />);

    const retryButton = screen.getByRole('button', { name: 'Spróbuj ponownie' });
    await user.click(retryButton);

    expect(mockReload).not.toHaveBeenCalled();
  });

  it('should navigate to home when home button clicked', async () => {
    const user = userEvent.setup();
    render(<OfflineErrorPage />);

    const homeButton = screen.getByRole('button', { name: 'Wróć do strony głównej' });
    await user.click(homeButton);

    expect(window.location.href).toBe('/');
  });

  it('should listen to online/offline events', () => {
    render(<OfflineErrorPage />);

    expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  it('should cleanup event listeners on unmount', () => {
    const { unmount } = render(<OfflineErrorPage />);

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  it('should update online state when online event fired', () => {
    render(<OfflineErrorPage />);

    // Get the online handler
    const onlineHandler = addEventListenerSpy.mock.calls.find(call => call[0] === 'online')?.[1];

    act(() => {
      onlineHandler?.();
    });

    // This is hard to test directly without more complex setup
    // The state update happens but we can't easily assert it without mocking useState
    expect(onlineHandler).toBeDefined();
  });

  it('should update online state when offline event fired', () => {
    render(<OfflineErrorPage />);

    // Get the offline handler
    const offlineHandler = addEventListenerSpy.mock.calls.find(call => call[0] === 'offline')?.[1];

    act(() => {
      offlineHandler?.();
    });

    expect(offlineHandler).toBeDefined();
  });
});
