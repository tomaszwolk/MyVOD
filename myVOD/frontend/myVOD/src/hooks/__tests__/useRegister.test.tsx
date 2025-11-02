import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRegister } from '../useRegister';
import { registerUser } from '@/lib/api/auth';
import type { RegisterUserCommand, RegisteredUserDto } from '@/types/api.types';

// Mock registerUser API function
vi.mock('@/lib/api/auth', () => ({
  registerUser: vi.fn(),
}));

const mockRegisterUser = vi.mocked(registerUser);

describe('useRegister', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    return { Wrapper, queryClient };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return useMutation object', () => {
    // Given: wrapper for TanStack Query
    const { Wrapper } = createWrapper();

    // When: render hook
    const { result } = renderHook(() => useRegister(), { wrapper: Wrapper });

    // Then: should return useMutation object with expected properties
    expect(result.current).toHaveProperty('mutate');
    expect(result.current).toHaveProperty('isPending');
    expect(result.current).toHaveProperty('isError');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('data');
  });

  it('should call registerUser API with payload', async () => {
    // Given: mock successful API response
    const mockResponse: RegisteredUserDto = { email: 'test@example.com' };
    mockRegisterUser.mockResolvedValueOnce(mockResponse);

    const { Wrapper } = createWrapper();

    // When: render hook and call mutate
    const { result } = renderHook(() => useRegister(), { wrapper: Wrapper });
    const payload: RegisterUserCommand = {
      email: 'test@example.com',
      password: 'password123'
    };

    result.current.mutate(payload);

    // Then: API should be called with correct payload
    await waitFor(() => {
      expect(mockRegisterUser).toHaveBeenCalledWith(payload, expect.any(Object));
    });
  });

  it('should handle successful response', async () => {
    // Given: mock successful API response
    const mockResponse: RegisteredUserDto = { email: 'test@example.com' };
    mockRegisterUser.mockResolvedValueOnce(mockResponse);

    const { Wrapper } = createWrapper();

    // When: render hook and call mutate
    const { result } = renderHook(() => useRegister(), { wrapper: Wrapper });
    const payload: RegisterUserCommand = {
      email: 'test@example.com',
      password: 'password123'
    };

    result.current.mutate(payload, {
      onSuccess: (data) => {
        // Then: onSuccess should receive the response
        expect(data).toEqual(mockResponse);
      }
    });

    // Wait for the mutation to complete
    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
  });

  it('should handle error response', async () => {
    // Given: mock error API response
    const mockError = new Error('Registration failed');
    mockRegisterUser.mockRejectedValueOnce(mockError);

    const { Wrapper } = createWrapper();

    // When: render hook and call mutate
    const { result } = renderHook(() => useRegister(), { wrapper: Wrapper });
    const payload: RegisterUserCommand = {
      email: 'test@example.com',
      password: 'password123'
    };

    result.current.mutate(payload, {
      onError: (error) => {
        // Then: onError should receive the error
        expect(error).toBe(mockError);
      }
    });

    // Wait for the mutation to complete
    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(mockError);
    });
  });

  it('should handle loading state', async () => {
    // Given: mock API call that takes time
    const mockResponse: RegisteredUserDto = { email: 'test@example.com' };
    mockRegisterUser.mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve(mockResponse), 50))
    );

    const { Wrapper } = createWrapper();

    // When: render hook and call mutate
    const { result } = renderHook(() => useRegister(), { wrapper: Wrapper });
    const payload: RegisterUserCommand = {
      email: 'test@example.com',
      password: 'password123'
    };

    result.current.mutate(payload);

    // Then: should eventually complete successfully
    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
      expect(result.current.data).toEqual(mockResponse);
      expect(result.current.isError).toBe(false);
    });
  });
});
