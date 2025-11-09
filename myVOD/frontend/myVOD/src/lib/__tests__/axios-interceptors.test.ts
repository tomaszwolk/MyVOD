import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { setupAxiosInterceptors, resetAxiosInterceptors } from '../axios-interceptors';
import { refreshAccessToken } from '../api/auth';

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
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
    })),
  },
}));

vi.mock('../api/auth', () => ({
  refreshAccessToken: vi.fn(),
}));

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

type MockAxiosInstance = AxiosInstance & {
  (config: InternalAxiosRequestConfig): Promise<any>;
  interceptors: {
    request: { use: vi.Mock };
    response: { use: vi.Mock };
  };
  get: vi.Mock;
  post: vi.Mock;
};

describe('setupAxiosInterceptors', () => {
  let mockAxios: MockAxiosInstance;
  let onLogout: vi.MockedFunction<() => void>;
  let onUnauthorized: vi.MockedFunction<() => void>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset interceptor state
    resetAxiosInterceptors();

    // Reset localStorage mock
    localStorageMock.getItem.mockImplementation(() => null);
    localStorageMock.setItem.mockImplementation(() => {});
    localStorageMock.removeItem.mockImplementation(() => {});

    // Create mock axios instance that is also callable
    const mockAxiosInstance = vi.fn().mockResolvedValue({ data: 'retried' });
    mockAxiosInstance.interceptors = {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    };
    mockAxiosInstance.get = vi.fn();
    mockAxiosInstance.post = vi.fn();
    mockAxios = mockAxiosInstance as MockAxiosInstance;

    // Mock callbacks
    onLogout = vi.fn();
    onUnauthorized = vi.fn();

    // Setup interceptors
    setupAxiosInterceptors(mockAxios, onLogout, onUnauthorized);
  });

  describe('Request Interceptor', () => {
    let requestInterceptor: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig;

    beforeEach(() => {
      requestInterceptor = mockAxios.interceptors.request.use.mock.calls[mockAxios.interceptors.request.use.mock.calls.length - 1][0];
    });

    it('should add Authorization header to requests when token exists', () => {
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

    it('should NOT add token to /api/register/ endpoints', () => {
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

    it('should NOT add token to /api/platforms/ endpoints', () => {
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
    let responseInterceptor: (error: any) => Promise<any>;

    beforeEach(() => {
      responseInterceptor = mockAxios.interceptors.response.use.mock.calls[mockAxios.interceptors.response.use.mock.calls.length - 1][1];
    });

    it('should call onUnauthorized when refresh token is missing', async () => {
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

      // Then: onUnauthorized should be called
      expect(onUnauthorized).toHaveBeenCalled();
      expect(onLogout).not.toHaveBeenCalled();
    });

    it('should call onLogout when onUnauthorized is not provided and refresh token is missing', async () => {
      // Reset state before setting up new interceptors
      resetAxiosInterceptors();
      
      // Setup interceptors without onUnauthorized
      setupAxiosInterceptors(mockAxios, onLogout);

      // Extract the new response interceptor after setup
      const newResponseInterceptor = mockAxios.interceptors.response.use.mock.calls[mockAxios.interceptors.response.use.mock.calls.length - 1][1];

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
        await newResponseInterceptor(error);
      } catch {
        // Expected to reject
      }

      // Then: onLogout should be called
      expect(onLogout).toHaveBeenCalled();
    });

    it('should attempt token refresh on 401 error when refresh token exists', async () => {
      // Given: refresh token exists and refresh succeeds
      const mockRefresh = vi.mocked(refreshAccessToken);
      mockRefresh.mockResolvedValue({ access: 'new-token' });

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'myVOD_refresh_token') return 'refresh-token';
        if (key === 'myVOD_access_token') return 'old-token';
        return null;
      });

      // Mock axios.get to resolve for token refresh
      mockAxios.get.mockResolvedValue({ data: { access: 'new-token' } });

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

    it('should update localStorage with new access token after successful refresh', async () => {
      // Given: refresh succeeds
      const mockRefresh = vi.mocked(refreshAccessToken);
      mockRefresh.mockResolvedValue({ access: 'new-token' });

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'myVOD_refresh_token') return 'refresh-token';
        return null;
      });

      // Mock axios.get to resolve for token refresh
      mockAxios.get.mockResolvedValue({ data: { access: 'new-token' } });

      const error = {
        config: { url: '/api/me/', headers: {} },
        response: { status: 401 },
      };

      // When: 401 error occurs and refresh succeeds
      await responseInterceptor(error);

      // Then: localStorage should be updated
      expect(localStorageMock.setItem).toHaveBeenCalledWith('myVOD_access_token', 'new-token');
    });

    it('should retry original request with new token after successful refresh', async () => {
      // Given: refresh succeeds
      const mockRefresh = vi.mocked(refreshAccessToken);
      mockRefresh.mockResolvedValue({ access: 'new-token' });

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'myVOD_refresh_token') return 'refresh-token';
        return null;
      });

      // Mock axios.get to resolve for token refresh
      mockAxios.get.mockResolvedValue({ data: { access: 'new-token' } });

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

    it('should call onUnauthorized when refresh token expires', async () => {
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

      // Then: onUnauthorized should be called
      expect(onUnauthorized).toHaveBeenCalled();
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

    it('should NOT retry login requests', async () => {
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

    it('should NOT retry register requests', async () => {
      // Given: register request fails with 401
      const error = {
        config: { url: '/api/register/' },
        response: { status: 401 },
      };

      // When: 401 error occurs on register endpoint
      try {
        await responseInterceptor(error);
      } catch (rejectedError) {
        // Then: should reject without attempting refresh
        expect(rejectedError).toBe(error);
      }

      // And refresh should not be called
      expect(vi.mocked(refreshAccessToken)).not.toHaveBeenCalled();
    });

    it('should queue multiple requests during refresh', async () => {
      // Given: first request triggers refresh
      const mockRefresh = vi.mocked(refreshAccessToken);
      mockRefresh.mockResolvedValue({ access: 'new-token' });

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'myVOD_refresh_token') return 'refresh-token';
        return null;
      });

      // Mock axios.get to resolve for token refresh
      mockAxios.get.mockResolvedValue({ data: { access: 'new-token' } });

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

    it('should reject non-401 errors without attempting refresh', async () => {
      // Given: 500 error (not 401)
      const error = {
        config: { url: '/api/me/' },
        response: { status: 500 },
      };

      // When: non-401 error occurs
      try {
        await responseInterceptor(error);
      } catch (rejectedError) {
        // Then: should reject without attempting refresh
        expect(rejectedError).toBe(error);
      }

      // And refresh should not be called
      expect(vi.mocked(refreshAccessToken)).not.toHaveBeenCalled();
    });

    it('should handle successful response normally', async () => {
      // Given: successful response
      const response = {
        data: 'success',
        status: 200,
      };

      // Get the success handler (first argument to response.use)
      const responseSuccessHandler = mockAxios.interceptors.response.use.mock.calls[mockAxios.interceptors.response.use.mock.calls.length - 1][0];

      // When: successful response is handled
      const result = await responseSuccessHandler(response);

      // Then: should return response unchanged
      expect(result).toBe(response);
    });
  });
});