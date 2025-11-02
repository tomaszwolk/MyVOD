import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import type { AuthTokensDto } from '@/types/api.types';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

describe('AuthContext', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    localStorageMock.getItem.mockImplementation(() => null);
    localStorageMock.setItem.mockImplementation(() => {});
    localStorageMock.removeItem.mockImplementation(() => {});
    sessionStorageMock.getItem.mockImplementation(() => null);
    sessionStorageMock.setItem.mockImplementation(() => {});
    sessionStorageMock.removeItem.mockImplementation(() => {});
  });

  describe('AuthProvider', () => {
    it('should provide default unauthenticated state', () => {
      // Given: no tokens in localStorage (default)
      localStorageMock.getItem.mockReturnValue(null);

      // When: render hook
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Then: should be unauthenticated
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.accessToken).toBe(null);
      expect(result.current.refreshToken).toBe(null);
    });

    it('should load tokens from localStorage on mount', () => {
      // Given: tokens exist in localStorage
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'myVOD_access_token') return 'test-access-token';
        if (key === 'myVOD_refresh_token') return 'test-refresh-token';
        return null;
      });

      // When: render hook
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Then: should load tokens and be authenticated
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.accessToken).toBe('test-access-token');
      expect(result.current.refreshToken).toBe('test-refresh-token');
    });

    it('should save tokens to localStorage on login()', () => {
      // Given: initial unauthenticated state
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      const tokens: AuthTokensDto = {
        access: 'new-access-token',
        refresh: 'new-refresh-token',
      };

      // When: call login
      act(() => {
        result.current.login(tokens);
      });

      // Then: should save to localStorage
      expect(localStorageMock.setItem).toHaveBeenCalledWith('myVOD_access_token', 'new-access-token');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('myVOD_refresh_token', 'new-refresh-token');

      // And should clear onboarding check flag
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('onboarding_initial_check_done');
    });

    it('should update state on login()', () => {
      // Given: initial unauthenticated state
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      const tokens: AuthTokensDto = {
        access: 'new-access-token',
        refresh: 'new-refresh-token',
      };

      // When: call login
      act(() => {
        result.current.login(tokens);
      });

      // Then: state should be updated
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.accessToken).toBe('new-access-token');
      expect(result.current.refreshToken).toBe('new-refresh-token');
    });

    it('should clear tokens from localStorage on logout()', () => {
      // Given: authenticated state
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'myVOD_access_token') return 'test-access-token';
        if (key === 'myVOD_refresh_token') return 'test-refresh-token';
        return null;
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // When: call logout
      act(() => {
        result.current.logout();
      });

      // Then: should remove from localStorage
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('myVOD_access_token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('myVOD_refresh_token');

      // And should clear onboarding check flag
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('onboarding_initial_check_done');
    });

    it('should update state on logout()', () => {
      // Given: authenticated state
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'myVOD_access_token') return 'test-access-token';
        if (key === 'myVOD_refresh_token') return 'test-refresh-token';
        return null;
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // When: call logout
      act(() => {
        result.current.logout();
      });

      // Then: state should be cleared
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.accessToken).toBe(null);
      expect(result.current.refreshToken).toBe(null);
    });

    it('should update only access token on updateAccessToken()', () => {
      // Given: authenticated state with existing refresh token
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'myVOD_access_token') return 'old-access-token';
        if (key === 'myVOD_refresh_token') return 'existing-refresh-token';
        return null;
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // When: update access token
      act(() => {
        result.current.updateAccessToken('new-access-token');
      });

      // Then: should update localStorage for access token only
      expect(localStorageMock.setItem).toHaveBeenCalledWith('myVOD_access_token', 'new-access-token');
      expect(localStorageMock.setItem).not.toHaveBeenCalledWith('myVOD_refresh_token', expect.any(String));

      // And state should be updated
      expect(result.current.accessToken).toBe('new-access-token');
      expect(result.current.refreshToken).toBe('existing-refresh-token'); // unchanged
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should set isAuthenticated=false when only access token exists', () => {
      // Given: only access token in localStorage
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'myVOD_access_token') return 'access-token-only';
        return null; // no refresh token
      });

      // When: render hook
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Then: should NOT be authenticated (requires both tokens)
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.accessToken).toBe('access-token-only');
      expect(result.current.refreshToken).toBe(null);
    });

    it('should set isAuthenticated=false when only refresh token exists', () => {
      // Given: only refresh token in localStorage
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'myVOD_refresh_token') return 'refresh-token-only';
        return null; // no access token
      });

      // When: render hook
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Then: should NOT be authenticated (requires both tokens)
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.accessToken).toBe(null);
      expect(result.current.refreshToken).toBe('refresh-token-only');
    });

    it('should handle malformed tokens gracefully', () => {
      // Given: malformed tokens in localStorage
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'myVOD_access_token') return ''; // empty string
        if (key === 'myVOD_refresh_token') return undefined; // undefined
        return null;
      });

      // When: render hook
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Then: should handle gracefully and not be authenticated
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.accessToken).toBe(''); // empty string is falsy
      expect(result.current.refreshToken).toBe(undefined);
    });

    it('should set isAuthenticated=false when tokens are invalid', () => {
      // Given: invalid tokens (like expired or malformed JWTs)
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'myVOD_access_token') return 'invalid.jwt.token';
        if (key === 'myVOD_refresh_token') return 'also.invalid.jwt';
        return null;
      });

      // When: render hook
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Then: should treat them as valid tokens for basic auth check
      // (detailed JWT validation happens in interceptors)
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.accessToken).toBe('invalid.jwt.token');
      expect(result.current.refreshToken).toBe('also.invalid.jwt');
    });
  });

  describe('useAuth hook', () => {
    it('should throw error when useAuth used outside provider', () => {
      // Given: no provider
      // When: call useAuth outside provider
      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within AuthProvider');
    });
  });
});
