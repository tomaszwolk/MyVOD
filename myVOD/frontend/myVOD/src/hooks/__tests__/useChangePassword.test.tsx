import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useChangePassword } from '../useChangePassword';

// Mock the API and toast
vi.mock('@/lib/api/auth', () => ({
  changePassword: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { changePassword } from '@/lib/api/auth';
import { toast } from 'sonner';

const mockChangePassword = vi.mocked(changePassword);
const mockToastSuccess = vi.mocked(toast.success);
const mockToastError = vi.mocked(toast.error);

describe('useChangePassword', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        mutations: {
          retry: false,
        },
      },
    });

    mockChangePassword.mockClear();
    mockToastSuccess.mockClear();
    mockToastError.mockClear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  it('should call changePassword with correct payload', async () => {
    const mockResponse = {
      message: 'Password changed successfully',
    };

    mockChangePassword.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useChangePassword(), { wrapper });

    const payload = {
      current_password: 'OldPassword123',
      new_password: 'NewPassword456',
    };

    await act(async () => {
      await result.current.mutateAsync(payload);
    });

    expect(mockChangePassword).toHaveBeenCalledWith(payload);
  });

  it('should show success toast on successful password change', async () => {
    const mockResponse = {
      message: 'Password changed successfully',
    };

    mockChangePassword.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useChangePassword(), { wrapper });

    const payload = {
      current_password: 'OldPassword123',
      new_password: 'NewPassword456',
    };

    await act(async () => {
      await result.current.mutateAsync(payload);
    });

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith('Hasło zostało zmienione');
    });
  });

  it('should show error toast for invalid current password (400)', async () => {
    const error = new Error('400 Bad Request');
    (error as any).response = {
      data: {
        current_password: ['Current password is incorrect.'],
      },
    };

    mockChangePassword.mockRejectedValue(error);

    const { result } = renderHook(() => useChangePassword(), { wrapper });

    const payload = {
      current_password: 'WrongPassword123',
      new_password: 'NewPassword456',
    };

    await act(async () => {
      try {
        await result.current.mutateAsync(payload);
      } catch (e) {
        // Expected to throw
      }
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Nieprawidłowe obecne hasło');
    });
  });

  it('should show error toast for invalid new password (400)', async () => {
    const error = new Error('400 Bad Request');
    (error as any).response = {
      data: {
        new_password: ['This password is too short.'],
      },
    };

    mockChangePassword.mockRejectedValue(error);

    const { result } = renderHook(() => useChangePassword(), { wrapper });

    const payload = {
      current_password: 'OldPassword123',
      new_password: 'Short1',
    };

    await act(async () => {
      try {
        await result.current.mutateAsync(payload);
      } catch (e) {
        // Expected to throw
      }
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled();
    });
  });

  it('should show error toast for unauthorized (401)', async () => {
    const error = new Error('401 Unauthorized');
    (error as any).response = {
      status: 401,
    };

    mockChangePassword.mockRejectedValue(error);

    const { result } = renderHook(() => useChangePassword(), { wrapper });

    const payload = {
      current_password: 'OldPassword123',
      new_password: 'NewPassword456',
    };

    await act(async () => {
      try {
        await result.current.mutateAsync(payload);
      } catch (e) {
        // Expected to throw
      }
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Sesja wygasła. Zaloguj się ponownie.');
    });
  });

  it('should show generic error toast for server errors (500)', async () => {
    const error = new Error('500 Internal Server Error');
    (error as any).response = {
      status: 500,
    };

    mockChangePassword.mockRejectedValue(error);

    const { result } = renderHook(() => useChangePassword(), { wrapper });

    const payload = {
      current_password: 'OldPassword123',
      new_password: 'NewPassword456',
    };

    await act(async () => {
      try {
        await result.current.mutateAsync(payload);
      } catch (e) {
        // Expected to throw
      }
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        'Wystąpił błąd podczas zmiany hasła. Spróbuj ponownie później.'
      );
    });
  });

  it('should show generic error toast for network errors', async () => {
    const error = new Error('Network Error');

    mockChangePassword.mockRejectedValue(error);

    const { result } = renderHook(() => useChangePassword(), { wrapper });

    const payload = {
      current_password: 'OldPassword123',
      new_password: 'NewPassword456',
    };

    await act(async () => {
      try {
        await result.current.mutateAsync(payload);
      } catch (e) {
        // Expected to throw
      }
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        'Wystąpił błąd podczas zmiany hasła. Spróbuj ponownie później.'
      );
    });
  });

  it('should expose mutation state', () => {
    const { result } = renderHook(() => useChangePassword(), { wrapper });

    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.isSuccess).toBe(false);
  });

  it('should set isPending to true during mutation', async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    mockChangePassword.mockReturnValue(promise);

    const { result } = renderHook(() => useChangePassword(), { wrapper });

    const payload = {
      current_password: 'OldPassword123',
      new_password: 'NewPassword456',
    };

    act(() => {
      result.current.mutate(payload);
    });

    // Wait for the mutation to start and isPending to become true
    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });

    await act(async () => {
      resolvePromise!({ message: 'Password changed successfully' });
      await promise;
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
  });
});

