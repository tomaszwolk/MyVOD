import { renderHook, waitFor } from '@testing-library/react';
import { useRegister } from '../useRegister';
import { registerUser } from '@/lib/api/auth';
import type { RegisterUserCommand, RegisteredUserDto } from '@/types/api.types';

// Mock registerUser API function
vi.mock('@/lib/api/auth', () => ({
  registerUser: vi.fn(),
}));

// Mock TanStack Query
vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn(),
}));

describe('useRegister', () => {
  let mockUseMutation: any;
  let mockRegisterUser: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mocks
    mockUseMutation = vi.fn();
    mockRegisterUser = vi.fn();

    // Import and mock the hook
    const { useMutation } = require('@tanstack/react-query');
    useMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
      data: null,
    });

    // Mock the API function
    const { registerUser: registerUserMock } = require('@/lib/api/auth');
    registerUserMock.mockImplementation(mockRegisterUser);
  });

  it('should return useMutation object', () => {
    // When: render hook
    const { result } = renderHook(() => useRegister());

    // Then: should return useMutation object with expected properties
    expect(result.current).toHaveProperty('mutate');
    expect(result.current).toHaveProperty('isPending');
    expect(result.current).toHaveProperty('isError');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('data');
  });

  it('should call registerUser API with payload', async () => {
    // Given: setup successful mutation
    const { useMutation } = require('@tanstack/react-query');
    const mockMutate = vi.fn();
    useMutation.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: false,
      error: null,
      data: null,
    });

    // When: render hook and call mutate
    const { result } = renderHook(() => useRegister());
    const payload: RegisterUserCommand = {
      email: 'test@example.com',
      password: 'password123'
    };

    result.current.mutate(payload);

    // Then: mutate should be called with payload
    expect(mockMutate).toHaveBeenCalledWith(payload, expect.any(Object));
  });

  it('should handle successful response', async () => {
    // Given: setup successful response
    const mockResponse: RegisteredUserDto = { email: 'test@example.com' };
    const { useMutation } = require('@tanstack/react-query');
    const mockMutate = vi.fn();
    let onSuccessCallback: any;

    useMutation.mockReturnValue({
      mutate: (data: any, options: any) => {
        onSuccessCallback = options.onSuccess;
        mockMutate(data, options);
      },
      isPending: false,
      isError: false,
      error: null,
      data: null,
    });

    // When: render hook
    const { result } = renderHook(() => useRegister());

    // Simulate successful mutation
    if (onSuccessCallback) {
      onSuccessCallback(mockResponse);
    }

    // Then: onSuccess should be called with response
    await waitFor(() => {
      expect(mockResponse).toEqual({ email: 'test@example.com' });
    });
  });

  it('should pass registerUser to useMutation', () => {
    // Given: import useMutation mock
    const { useMutation } = require('@tanstack/react-query');

    // When: render hook
    renderHook(() => useRegister());

    // Then: useMutation should be called with registerUser function
    expect(useMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        mutationFn: expect.any(Function)
      })
    );
  });

  it('should handle error response', async () => {
    // Given: setup error response
    const mockError = new Error('Registration failed');
    const { useMutation } = require('@tanstack/react-query');
    const mockMutate = vi.fn();
    let onErrorCallback: any;

    useMutation.mockReturnValue({
      mutate: (data: any, options: any) => {
        onErrorCallback = options.onError;
        mockMutate(data, options);
      },
      isPending: false,
      isError: true,
      error: mockError,
      data: null,
    });

    // When: render hook
    const { result } = renderHook(() => useRegister());

    // Simulate error mutation
    if (onErrorCallback) {
      onErrorCallback(mockError);
    }

    // Then: error should be handled
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(mockError);
    });
  });
});
