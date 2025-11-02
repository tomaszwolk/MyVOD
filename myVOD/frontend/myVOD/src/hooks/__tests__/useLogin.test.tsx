import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLogin } from '../useLogin';
import { loginUser } from '@/lib/api/auth';
import type { LoginUserCommand, AuthTokensDto } from '@/types/api.types';

// Mock loginUser API function
vi.mock('@/lib/api/auth', () => ({
  loginUser: vi.fn(),
}));

const mockLoginUser = vi.mocked(loginUser);

describe('useLogin', () => {
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
    const { result } = renderHook(() => useLogin(), { wrapper: Wrapper });

    // Then: should return useMutation object with expected properties
    expect(result.current).toHaveProperty('mutate');
    expect(result.current).toHaveProperty('isPending');
    expect(result.current).toHaveProperty('isError');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('data');
  });

  it('should call loginUser API with payload', async () => {
    // Given: mock successful API response
    const mockResponse: AuthTokensDto = { access: 'token1', refresh: 'token2' };
    mockLoginUser.mockResolvedValueOnce(mockResponse);

    const { Wrapper } = createWrapper();

    // When: render hook and call mutate
    const { result } = renderHook(() => useLogin(), { wrapper: Wrapper });
    const payload: LoginUserCommand = {
      email: 'test@example.com',
      password: 'password123'
    };

    result.current.mutate(payload);

    // Then: API should be called with correct payload
    await waitFor(() => {
      expect(mockLoginUser).toHaveBeenCalledWith(payload, expect.any(Object));
    });
  });

  it('should handle successful response with tokens', async () => {
    // Given: mock successful API response
    const mockResponse: AuthTokensDto = { access: 'token1', refresh: 'token2' };
    mockLoginUser.mockResolvedValueOnce(mockResponse);

    const { Wrapper } = createWrapper();

    // When: render hook and call mutate
    const { result } = renderHook(() => useLogin(), { wrapper: Wrapper });
    const payload: LoginUserCommand = {
      email: 'test@example.com',
      password: 'password123'
    };

    result.current.mutate(payload, {
      onSuccess: (data) => {
        // Then: onSuccess should receive the tokens
        expect(data).toEqual(mockResponse);
      }
    });

    // Wait for the mutation to complete
    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
  });

  it('should handle 401 error', async () => {
    // Given: mock 401 error API response
    const mockError = { response: { status: 401, data: { detail: 'Invalid credentials' } } };
    mockLoginUser.mockRejectedValueOnce(mockError);

    const { Wrapper } = createWrapper();

    // When: render hook and call mutate
    const { result } = renderHook(() => useLogin(), { wrapper: Wrapper });
    const payload: LoginUserCommand = {
      email: 'test@example.com',
      password: 'wrongpassword'
    };

    result.current.mutate(payload, {
      onError: (error) => {
        // Then: onError should receive the 401 error
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

  it('should handle loading state during login', async () => {
    // Given: mock API call that takes time
    const mockResponse: AuthTokensDto = { access: 'token1', refresh: 'token2' };
    mockLoginUser.mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve(mockResponse), 50))
    );

    const { Wrapper } = createWrapper();

    // When: render hook and call mutate
    const { result } = renderHook(() => useLogin(), { wrapper: Wrapper });
    const payload: LoginUserCommand = {
      email: 'test@example.com',
      password: 'password123'
    };

    result.current.mutate(payload);

    // Then: should eventually complete successfully with tokens
    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
      expect(result.current.data).toEqual(mockResponse);
      expect(result.current.isError).toBe(false);
    });
  });
});
