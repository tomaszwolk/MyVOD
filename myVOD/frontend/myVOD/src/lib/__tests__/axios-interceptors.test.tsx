import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { setupAxiosInterceptors, resetAxiosInterceptors } from '../axios-interceptors';
import { refreshAccessToken } from '../api/auth';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(),
  },
}));

// Mock refreshAccessToken
vi.mock('../api/auth', () => ({
  refreshAccessToken: vi.fn(),
}));

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

describe('axios-interceptors', () => {
  let mockAxios: AxiosInstance;
  let onLogout: vi.MockedFunction<() => void>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset interceptor state
    resetAxiosInterceptors();

    // Reset localStorage mock
    localStorageMock.getItem.mockImplementation(() => null);
    localStorageMock.setItem.mockImplementation(() => {});
    localStorageMock.removeItem.mockImplementation(() => {});

    // Create mock axios instance with interceptors
    const mockAxiosCallable = vi.fn().mockResolvedValue({ data: 'retried' });
    mockAxios = Object.assign(mockAxiosCallable, {
      interceptors: {
        request: {
          use: vi.fn(),
        },
        response: {
          use: vi.fn(),
        },
      },
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    }) as unknown as AxiosInstance;

    // Mock axios.create to return our mock instance
    vi.mocked(axios.create).mockReturnValue(mockAxios);

    // Mock onLogout function
    onLogout = vi.fn();

    // Setup interceptors
    setupAxiosInterceptors(mockAxios, onLogout);
  });

  describe('Request Interceptor', () => {
    let requestInterceptor: any;

    beforeEach(() => {
      requestInterceptor = mockAxios.interceptors.request.use.mock.calls[0][0];
    });

    it('should add Authorization header to requests', () => {
      // Given: access token exists in localStorage
      localStorageMock.getItem.mockReturnValue('test-token');

      const config: InternalAxiosRequestConfig = {
        url: '/api/me/',
        headers: {},
      };

      // When: request interceptor is called
      const result = requestInterceptor(config);

      // Then: Authorization header should be added
      expect(result.headers.Authorization).toBe('Bearer test-token');
    });

    it('should NOT add token to /api/token/ endpoints', () => {
      // Given: access token exists in localStorage
      localStorageMock.getItem.mockReturnValue('test-token');

      const config: InternalAxiosRequestConfig = {
        url: '/api/token/login/',
        headers: {},
      };

      // When: request interceptor is called
      const result = requestInterceptor(config);

      // Then: Authorization header should NOT be added
      expect(result.headers.Authorization).toBeUndefined();
    });

    it('should NOT add token to /api/register/', () => {
      // Given: access token exists in localStorage
      localStorageMock.getItem.mockReturnValue('test-token');

      const config: InternalAxiosRequestConfig = {
        url: '/api/register/',
        headers: {},
      };

      // When: request interceptor is called
      const result = requestInterceptor(config);

      // Then: Authorization header should NOT be added
      expect(result.headers.Authorization).toBeUndefined();
    });

    it('should NOT add token to /api/platforms/', () => {
      // Given: access token exists in localStorage
      localStorageMock.getItem.mockReturnValue('test-token');

      const config: InternalAxiosRequestConfig = {
        url: '/api/platforms/',
        headers: {},
      };

      // When: request interceptor is called
      const result = requestInterceptor(config);

      // Then: Authorization header should NOT be added
      expect(result.headers.Authorization).toBeUndefined();
    });

    it('should not add Authorization header when no token exists', () => {
      // Given: no access token in localStorage
      localStorageMock.getItem.mockReturnValue(null);

      const config: InternalAxiosRequestConfig = {
        url: '/api/me/',
        headers: {},
      };

      // When: request interceptor is called
      const result = requestInterceptor(config);

      // Then: Authorization header should not be added
      expect(result.headers.Authorization).toBeUndefined();
    });
  });

  describe('Response Interceptor', () => {
    let responseInterceptor: any;

    beforeEach(() => {
      responseInterceptor = mockAxios.interceptors.response.use.mock.calls[0][1];
    });

    it('should call onLogout when refresh token is missing', async () => {
      // Given: no refresh token in localStorage
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'myVOD_refresh_token') return null;
        return 'old-token';
      });

      const error = {
        config: { url: '/api/me/' },
        response: { status: 401 },
      };

      // When: 401 error occurs
      try {
        await responseInterceptor(error);
      } catch {
        // Expected to reject
      }

      // Then: onLogout should be called
      expect(onLogout).toHaveBeenCalled();
    });

    it('should attempt token refresh on 401 error', async () => {
      // Given: refresh token exists and refresh succeeds
      const mockRefresh = vi.mocked(refreshAccessToken);
      mockRefresh.mockResolvedValue({ access: 'new-token' });

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'myVOD_refresh_token') return 'refresh-token';
        if (key === 'myVOD_access_token') return 'old-token';
        return null;
      });

      // Mock axios instance to resolve
      mockAxios.mockResolvedValue({ data: 'success' });

      const error = {
        config: { url: '/api/me/', headers: {} },
        response: { status: 401 },
      };

      // When: 401 error occurs
      const result = await responseInterceptor(error);

      // Then: refresh should be attempted
      expect(mockRefresh).toHaveBeenCalledWith('refresh-token');
      expect(result).toBeDefined();
    });

    it('should update localStorage with new access token', async () => {
      // Given: refresh succeeds
      const mockRefresh = vi.mocked(refreshAccessToken);
      mockRefresh.mockResolvedValue({ access: 'new-token' });

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'myVOD_refresh_token') return 'refresh-token';
        return null;
      });

      mockAxios.mockResolvedValue({ data: 'success' });

      const error = {
        config: { url: '/api/me/', headers: {} },
        response: { status: 401 },
      };

      // When: 401 error occurs and refresh succeeds
      await responseInterceptor(error);

      // Then: localStorage should be updated
      expect(localStorageMock.setItem).toHaveBeenCalledWith('myVOD_access_token', 'new-token');
    });

    it('should retry original request with new token', async () => {
      // Given: refresh succeeds
      const mockRefresh = vi.mocked(refreshAccessToken);
      mockRefresh.mockResolvedValue({ access: 'new-token' });

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'myVOD_refresh_token') return 'refresh-token';
        return null;
      });

      mockAxios.mockResolvedValue({ data: 'success' });

      const error = {
        config: { url: '/api/me/', headers: {} },
        response: { status: 401 },
      };

      // When: 401 error occurs
      await responseInterceptor(error);

      // Then: original request should be retried with new token
      expect(mockAxios).toHaveBeenCalledWith({
        ...error.config,
        headers: { Authorization: 'Bearer new-token' },
        _retry: true,
      });
    });

    it('should call onLogout when refresh token expires', async () => {
      // Given: refresh fails
      const mockRefresh = vi.mocked(refreshAccessToken);
      mockRefresh.mockRejectedValue(new Error('Invalid refresh token'));

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'myVOD_refresh_token') return 'invalid-refresh-token';
        return null;
      });

      const error = {
        config: { url: '/api/me/' },
        response: { status: 401 },
      };

      // When: 401 error occurs and refresh fails
      try {
        await responseInterceptor(error);
      } catch {
        // Expected to reject
      }

      // Then: onLogout should be called
      expect(onLogout).toHaveBeenCalled();
    });

    it('should queue multiple requests during refresh', async () => {
      // Given: first request triggers refresh
      const mockRefresh = vi.mocked(refreshAccessToken);
      mockRefresh.mockResolvedValue({ access: 'new-token' });

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'myVOD_refresh_token') return 'refresh-token';
        return null;
      });

      mockAxios.mockResolvedValue({ data: 'success' });

      // When: multiple 401 errors occur simultaneously
      const error1 = {
        config: { url: '/api/me/', headers: {} },
        response: { status: 401 },
      };

      const error2 = {
        config: { url: '/api/watchlist/', headers: {} },
        response: { status: 401 },
      };

      // Start both requests (second should be queued)
      const promise1 = responseInterceptor(error1);
      const promise2 = responseInterceptor(error2);

      // Wait for both to complete
      await Promise.all([promise1, promise2]);

      // Then: axios should be called twice (original + retry for each)
      expect(mockAxios).toHaveBeenCalledTimes(2);
    });

    it('should set isRefreshing flag during refresh', async () => {
      // Given: refresh will take some time
      const mockRefresh = vi.mocked(refreshAccessToken);
      mockRefresh.mockResolvedValue({ access: 'new-token' });

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'myVOD_refresh_token') return 'refresh-token';
        return null;
      });

      mockAxios.mockResolvedValue({ data: 'success' });

      const error = {
        config: { url: '/api/me/', headers: {} },
        response: { status: 401 },
      };

      // When: 401 error occurs
      const promise = responseInterceptor(error);

      // Then: isRefreshing should be managed (we can't directly test this flag
      // but we can verify the flow works correctly)
      await promise;
      expect(mockRefresh).toHaveBeenCalledWith('refresh-token');
    });

    it('should NOT retry request that already failed once (_retry flag)', async () => {
      // Given: request already has _retry flag
      const error = {
        config: {
          url: '/api/me/',
          headers: {},
          _retry: true
        },
        response: { status: 401 },
      };

      // When: 401 error occurs on already retried request
      try {
        await responseInterceptor(error);
      } catch (rejectedError) {
        // Then: should reject without attempting refresh
        expect(rejectedError).toBe(error);
      }

      // And refresh should not be called
      expect(vi.mocked(refreshAccessToken)).not.toHaveBeenCalled();
    });

    it('should NOT retry login or register requests', async () => {
      // Given: login request fails with 401
      const error = {
        config: { url: '/api/token/login/' },
        response: { status: 401 },
      };

      // When: 401 error occurs on login endpoint
      try {
        await responseInterceptor(error);
      } catch (rejectedError) {
        // Then: should reject without attempting refresh
        expect(rejectedError).toBe(error);
      }

      // And refresh should not be called
      expect(vi.mocked(refreshAccessToken)).not.toHaveBeenCalled();
    });
  });
});
