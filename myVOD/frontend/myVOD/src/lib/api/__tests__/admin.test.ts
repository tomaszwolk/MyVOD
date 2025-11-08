import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { http } from "@/lib/http";
import {
  getAdminMetrics,
  getTopMovies,
  getErrorLogs,
  exportTopMoviesCSV,
  exportErrorLogsCSV,
  getAdminBaseURL,
} from "../admin";
import type {
  AdminMetricsDto,
  TopMoviesDto,
  TopMoviesQuery,
  PaginatedErrorLogsDto,
  ErrorLogsQuery,
} from "@/types/view/admin.types";

// Mock the http module
vi.mock("@/lib/http", () => ({
  http: {
    defaults: {
      baseURL: "http://localhost:8000/api",
    },
    get: vi.fn(),
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock URL and document for CSV export tests
Object.defineProperty(window, "URL", {
  value: {
    createObjectURL: vi.fn(),
    revokeObjectURL: vi.fn(),
  },
});

Object.defineProperty(document, "createElement", {
  value: vi.fn(),
});

Object.defineProperty(document, "body", {
  value: {
    appendChild: vi.fn(),
    removeChild: vi.fn(),
  },
});

// Mock fetch for CSV export tests
global.fetch = vi.fn();

describe("Admin API Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();

    // Reset localStorage mock
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();

    // Reset URL mock
    (window.URL.createObjectURL as vi.Mock).mockClear();
    (window.URL.revokeObjectURL as vi.Mock).mockClear();

    // Reset document mock
    (document.createElement as vi.Mock).mockClear();
    (document.body.appendChild as vi.Mock).mockClear();
    (document.body.removeChild as vi.Mock).mockClear();

    // Reset fetch mock
    (global.fetch as vi.Mock).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getAdminMetrics", () => {
    const mockAdminMetrics: AdminMetricsDto = {
      total_users: 1000,
      active_users_30d: 750,
      total_watchlists: 2500,
      total_watched_movies: 5000,
      user_retention: {
        day_1: 0.85,
        day_7: 0.65,
        day_30: 0.45,
      },
      user_growth: [
        { date: "2024-01-01", count: 100 },
        { date: "2024-01-02", count: 120 },
      ],
    };

    it("should call GET /admin/analytics/api/metrics/ with correct baseURL", async () => {
      const mockResponse = { data: mockAdminMetrics };
      (http.get as vi.Mock).mockResolvedValueOnce(mockResponse);

      await getAdminMetrics();

      expect(http.get).toHaveBeenCalledWith("/admin/analytics/api/metrics/", {
        baseURL: "http://localhost:8000",
      });
    });

    it("should return AdminMetricsDto on success", async () => {
      const mockResponse = { data: mockAdminMetrics };
      (http.get as vi.Mock).mockResolvedValueOnce(mockResponse);

      const result = await getAdminMetrics();

      expect(result).toEqual(mockAdminMetrics);
    });

    it("should handle 403 Forbidden (not staff)", async () => {
      const error = {
        response: {
          status: 403,
          data: { detail: "Staff permissions required" },
        },
      };
      (http.get as vi.Mock).mockRejectedValueOnce(error);

      await expect(getAdminMetrics()).rejects.toThrow();
      expect(http.get).toHaveBeenCalledWith("/admin/analytics/api/metrics/", {
        baseURL: "http://localhost:8000",
      });
    });

    it("should handle network errors", async () => {
      const networkError = new Error("Network Error");
      (http.get as vi.Mock).mockRejectedValueOnce(networkError);

      await expect(getAdminMetrics()).rejects.toThrow("Network Error");
    });

    it("should use correct axios instance with interceptors", async () => {
      const mockResponse = { data: mockAdminMetrics };
      (http.get as vi.Mock).mockResolvedValueOnce(mockResponse);

      await getAdminMetrics();

      // Verify that the mocked http instance is used (interceptors would be applied)
      expect(http.get).toHaveBeenCalledTimes(1);
      expect(http.get).toHaveBeenCalledWith("/admin/analytics/api/metrics/", {
        baseURL: "http://localhost:8000",
      });
    });
  });

  describe("getAdminMetrics - Comprehensive Error Handling", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should handle network connection refused (ECONNREFUSED)", async () => {
      const networkError = new Error("Network Error");
      networkError.name = "ECONNREFUSED";
      (http.get as vi.Mock).mockRejectedValueOnce(networkError);

      await expect(getAdminMetrics()).rejects.toThrow();
    });

    it("should handle network timeout (408)", async () => {
      const timeoutError = new Error("Request timeout");
      (http.get as vi.Mock).mockRejectedValueOnce({
        response: {
          status: 408,
          data: { detail: "Request timeout" },
        },
      });

      await expect(getAdminMetrics()).rejects.toThrow();
    });

    it("should handle server unavailable (503)", async () => {
      (http.get as vi.Mock).mockRejectedValueOnce({
        response: {
          status: 503,
          data: { detail: "Service temporarily unavailable" },
        },
      });

      await expect(getAdminMetrics()).rejects.toThrow();
    });

    it("should handle gateway timeout (504)", async () => {
      (http.get as vi.Mock).mockRejectedValueOnce({
        response: {
          status: 504,
          data: { detail: "Gateway timeout" },
        },
      });

      await expect(getAdminMetrics()).rejects.toThrow();
    });

    it("should handle malformed JSON response (500)", async () => {
      (http.get as vi.Mock).mockRejectedValueOnce({
        response: {
          status: 500,
          data: "Internal server error - not JSON",
        },
      });

      await expect(getAdminMetrics()).rejects.toThrow();
    });

    it("should handle HTML error response instead of JSON (500)", async () => {
      (http.get as vi.Mock).mockRejectedValueOnce({
        response: {
          status: 500,
          data: "<html><body>Server Error</body></html>",
          headers: { "content-type": "text/html" },
        },
      });

      await expect(getAdminMetrics()).rejects.toThrow();
    });

    it("should handle too many requests (429)", async () => {
      (http.get as vi.Mock).mockRejectedValueOnce({
        response: {
          status: 429,
          data: { detail: "Too many admin requests. Try again later." },
        },
      });

      await expect(getAdminMetrics()).rejects.toThrow();
    });

    it("should handle conflict state (409)", async () => {
      (http.get as vi.Mock).mockRejectedValueOnce({
        response: {
          status: 409,
          data: { detail: "Admin metrics conflict" },
        },
      });

      await expect(getAdminMetrics()).rejects.toThrow();
    });

    it("should handle unprocessable entity (422)", async () => {
      (http.get as vi.Mock).mockRejectedValueOnce({
        response: {
          status: 422,
          data: { detail: "Invalid admin metrics request" },
        },
      });

      await expect(getAdminMetrics()).rejects.toThrow();
    });

    it("should handle bad gateway (502)", async () => {
      (http.get as vi.Mock).mockRejectedValueOnce({
        response: {
          status: 502,
          data: { detail: "Bad gateway" },
        },
      });

      await expect(getAdminMetrics()).rejects.toThrow();
    });
  });

  describe("getTopMovies", () => {
    const mockQuery: TopMoviesQuery = {
      type: "watchlist",
      range: "30d",
    };

    const mockTopMovies: TopMoviesDto = {
      movies: [
        {
          id: 1,
          title: "Movie 1",
          count: 150,
          poster_path: "/poster1.jpg",
        },
        {
          id: 2,
          title: "Movie 2",
          count: 120,
          poster_path: "/poster2.jpg",
        },
      ],
      total_count: 2,
    };

    it("should call GET /admin/analytics/api/top-movies/ with query params", async () => {
      const mockResponse = { data: mockTopMovies };
      (http.get as vi.Mock).mockResolvedValueOnce(mockResponse);

      await getTopMovies(mockQuery);

      expect(http.get).toHaveBeenCalledWith("/admin/analytics/api/top-movies/", {
        baseURL: "http://localhost:8000",
        params: {
          type: "watchlist",
          range: "30d",
        },
      });
    });

    it("should send type and range as query params", async () => {
      const mockResponse = { data: mockTopMovies };
      (http.get as vi.Mock).mockResolvedValueOnce(mockResponse);

      await getTopMovies(mockQuery);

      const callArgs = (http.get as vi.Mock).mock.calls[0][1];
      expect(callArgs.params.type).toBe("watchlist");
      expect(callArgs.params.range).toBe("30d");
    });

    it("should return TopMoviesDto on success", async () => {
      const mockResponse = { data: mockTopMovies };
      (http.get as vi.Mock).mockResolvedValueOnce(mockResponse);

      const result = await getTopMovies(mockQuery);

      expect(result).toEqual(mockTopMovies);
    });

    it("should handle 400 Bad Request (invalid params)", async () => {
      const error = {
        response: {
          status: 400,
          data: { detail: "Invalid parameters" },
        },
      };
      (http.get as vi.Mock).mockRejectedValueOnce(error);

      await expect(getTopMovies(mockQuery)).rejects.toThrow();
      expect(http.get).toHaveBeenCalledWith("/admin/analytics/api/top-movies/", {
        baseURL: "http://localhost:8000",
        params: {
          type: "watchlist",
          range: "30d",
        },
      });
    });

    it("should handle 403 Forbidden (not staff)", async () => {
      const error = {
        response: {
          status: 403,
          data: { detail: "Staff permissions required" },
        },
      };
      (http.get as vi.Mock).mockRejectedValueOnce(error);

      await expect(getTopMovies(mockQuery)).rejects.toThrow();
    });

    it("should handle network errors", async () => {
      const networkError = new Error("Network Error");
      (http.get as vi.Mock).mockRejectedValueOnce(networkError);

      await expect(getTopMovies(mockQuery)).rejects.toThrow("Network Error");
    });
  });

  describe("getTopMovies - Comprehensive Error Handling", () => {
    const mockQuery: TopMoviesQuery = {
      type: "watchlist",
      range: "30d",
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should handle network connection refused (ECONNREFUSED)", async () => {
      const networkError = new Error("Network Error");
      networkError.name = "ECONNREFUSED";
      (http.get as vi.Mock).mockRejectedValueOnce(networkError);

      await expect(getTopMovies(mockQuery)).rejects.toThrow();
    });

    it("should handle network timeout (408)", async () => {
      (http.get as vi.Mock).mockRejectedValueOnce({
        response: {
          status: 408,
          data: { detail: "Request timeout" },
        },
      });

      await expect(getTopMovies(mockQuery)).rejects.toThrow();
    });

    it("should handle server unavailable (503)", async () => {
      (http.get as vi.Mock).mockRejectedValueOnce({
        response: {
          status: 503,
          data: { detail: "Service temporarily unavailable" },
        },
      });

      await expect(getTopMovies(mockQuery)).rejects.toThrow();
    });

    it("should handle gateway timeout (504)", async () => {
      (http.get as vi.Mock).mockRejectedValueOnce({
        response: {
          status: 504,
          data: { detail: "Gateway timeout" },
        },
      });

      await expect(getTopMovies(mockQuery)).rejects.toThrow();
    });

    it("should handle malformed JSON response (500)", async () => {
      (http.get as vi.Mock).mockRejectedValueOnce({
        response: {
          status: 500,
          data: "Internal server error - not JSON",
        },
      });

      await expect(getTopMovies(mockQuery)).rejects.toThrow();
    });

    it("should handle HTML error response instead of JSON (500)", async () => {
      (http.get as vi.Mock).mockRejectedValueOnce({
        response: {
          status: 500,
          data: "<html><body>Server Error</body></html>",
          headers: { "content-type": "text/html" },
        },
      });

      await expect(getTopMovies(mockQuery)).rejects.toThrow();
    });

    it("should handle too many requests (429)", async () => {
      (http.get as vi.Mock).mockRejectedValueOnce({
        response: {
          status: 429,
          data: { detail: "Too many top movies requests. Try again later." },
        },
      });

      await expect(getTopMovies(mockQuery)).rejects.toThrow();
    });

    it("should handle conflict state (409)", async () => {
      (http.get as vi.Mock).mockRejectedValueOnce({
        response: {
          status: 409,
          data: { detail: "Top movies conflict" },
        },
      });

      await expect(getTopMovies(mockQuery)).rejects.toThrow();
    });

    it("should handle unprocessable entity (422)", async () => {
      (http.get as vi.Mock).mockRejectedValueOnce({
        response: {
          status: 422,
          data: { detail: "Invalid top movies query" },
        },
      });

      await expect(getTopMovies(mockQuery)).rejects.toThrow();
    });

    it("should handle bad gateway (502)", async () => {
      (http.get as vi.Mock).mockRejectedValueOnce({
        response: {
          status: 502,
          data: { detail: "Bad gateway" },
        },
      });

      await expect(getTopMovies(mockQuery)).rejects.toThrow();
    });
  });

  describe("getErrorLogs", () => {
    const mockQuery: ErrorLogsQuery = {
      api_type: ["tmdb", "watchmode"],
      date_from: "2024-01-01",
      date_to: "2024-01-31",
      user_id: "123",
      page: 1,
      page_size: 20,
      sort: "timestamp_desc",
    };

    const mockErrorLogs: PaginatedErrorLogsDto = {
      results: [
        {
          id: 1,
          timestamp: "2024-01-15T10:00:00Z",
          api_type: "tmdb",
          error_message: "API rate limit exceeded",
          user_id: "123",
          request_data: { movie_id: 123 },
          status_code: 429,
        },
      ],
      count: 1,
      next: null,
      previous: null,
    };

    it("should call GET /admin/analytics/api/error-logs/ with query params", async () => {
      const mockResponse = { data: mockErrorLogs };
      (http.get as vi.Mock).mockResolvedValueOnce(mockResponse);

      await getErrorLogs(mockQuery);

      expect(http.get).toHaveBeenCalledWith("/admin/analytics/api/error-logs/", {
        baseURL: "http://localhost:8000",
        params: {
          api_type: ["tmdb", "watchmode"],
          date_from: "2024-01-01",
          date_to: "2024-01-31",
          user_id: "123",
          page: 1,
          page_size: 20,
          sort: "timestamp_desc",
        },
      });
    });

    it("should send api_type as array query params", async () => {
      const mockResponse = { data: mockErrorLogs };
      (http.get as vi.Mock).mockResolvedValueOnce(mockResponse);

      await getErrorLogs(mockQuery);

      const callArgs = (http.get as vi.Mock).mock.calls[0][1];
      expect(callArgs.params.api_type).toEqual(["tmdb", "watchmode"]);
    });

    it("should send date_from, date_to, user_id, page, page_size, sort", async () => {
      const mockResponse = { data: mockErrorLogs };
      (http.get as vi.Mock).mockResolvedValueOnce(mockResponse);

      await getErrorLogs(mockQuery);

      const callArgs = (http.get as vi.Mock).mock.calls[0][1];
      expect(callArgs.params.date_from).toBe("2024-01-01");
      expect(callArgs.params.date_to).toBe("2024-01-31");
      expect(callArgs.params.user_id).toBe("123");
      expect(callArgs.params.page).toBe(1);
      expect(callArgs.params.page_size).toBe(20);
      expect(callArgs.params.sort).toBe("timestamp_desc");
    });

    it("should handle empty query (defaults)", async () => {
      const mockResponse = { data: mockErrorLogs };
      (http.get as vi.Mock).mockResolvedValueOnce(mockResponse);

      await getErrorLogs();

      expect(http.get).toHaveBeenCalledWith("/admin/analytics/api/error-logs/", {
        baseURL: "http://localhost:8000",
        params: {},
      });
    });

    it("should return PaginatedErrorLogsDto on success", async () => {
      const mockResponse = { data: mockErrorLogs };
      (http.get as vi.Mock).mockResolvedValueOnce(mockResponse);

      const result = await getErrorLogs(mockQuery);

      expect(result).toEqual(mockErrorLogs);
    });

    it("should handle 400 Bad Request (invalid params)", async () => {
      const error = {
        response: {
          status: 400,
          data: { detail: "Invalid date format" },
        },
      };
      (http.get as vi.Mock).mockRejectedValueOnce(error);

      await expect(getErrorLogs(mockQuery)).rejects.toThrow();
    });

    it("should handle 403 Forbidden (not staff)", async () => {
      const error = {
        response: {
          status: 403,
          data: { detail: "Staff permissions required" },
        },
      };
      (http.get as vi.Mock).mockRejectedValueOnce(error);

      await expect(getErrorLogs(mockQuery)).rejects.toThrow();
    });

    it("should handle network errors", async () => {
      const networkError = new Error("Network Error");
      (http.get as vi.Mock).mockRejectedValueOnce(networkError);

      await expect(getErrorLogs(mockQuery)).rejects.toThrow("Network Error");
    });
  });

  describe("getErrorLogs - Comprehensive Error Handling", () => {
    const mockQuery: ErrorLogsQuery = {
      api_type: ["tmdb"],
      date_from: "2024-01-01",
      user_id: "123",
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should handle network connection refused (ECONNREFUSED)", async () => {
      const networkError = new Error("Network Error");
      networkError.name = "ECONNREFUSED";
      (http.get as vi.Mock).mockRejectedValueOnce(networkError);

      await expect(getErrorLogs(mockQuery)).rejects.toThrow();
    });

    it("should handle network timeout (408)", async () => {
      (http.get as vi.Mock).mockRejectedValueOnce({
        response: {
          status: 408,
          data: { detail: "Request timeout" },
        },
      });

      await expect(getErrorLogs(mockQuery)).rejects.toThrow();
    });

    it("should handle server unavailable (503)", async () => {
      (http.get as vi.Mock).mockRejectedValueOnce({
        response: {
          status: 503,
          data: { detail: "Service temporarily unavailable" },
        },
      });

      await expect(getErrorLogs(mockQuery)).rejects.toThrow();
    });

    it("should handle gateway timeout (504)", async () => {
      (http.get as vi.Mock).mockRejectedValueOnce({
        response: {
          status: 504,
          data: { detail: "Gateway timeout" },
        },
      });

      await expect(getErrorLogs(mockQuery)).rejects.toThrow();
    });

    it("should handle malformed JSON response (500)", async () => {
      (http.get as vi.Mock).mockRejectedValueOnce({
        response: {
          status: 500,
          data: "Internal server error - not JSON",
        },
      });

      await expect(getErrorLogs(mockQuery)).rejects.toThrow();
    });

    it("should handle HTML error response instead of JSON (500)", async () => {
      (http.get as vi.Mock).mockRejectedValueOnce({
        response: {
          status: 500,
          data: "<html><body>Server Error</body></html>",
          headers: { "content-type": "text/html" },
        },
      });

      await expect(getErrorLogs(mockQuery)).rejects.toThrow();
    });

    it("should handle too many requests (429)", async () => {
      (http.get as vi.Mock).mockRejectedValueOnce({
        response: {
          status: 429,
          data: { detail: "Too many error logs requests. Try again later." },
        },
      });

      await expect(getErrorLogs(mockQuery)).rejects.toThrow();
    });

    it("should handle conflict state (409)", async () => {
      (http.get as vi.Mock).mockRejectedValueOnce({
        response: {
          status: 409,
          data: { detail: "Error logs conflict" },
        },
      });

      await expect(getErrorLogs(mockQuery)).rejects.toThrow();
    });

    it("should handle unprocessable entity (422)", async () => {
      (http.get as vi.Mock).mockRejectedValueOnce({
        response: {
          status: 422,
          data: { detail: "Invalid error logs query" },
        },
      });

      await expect(getErrorLogs(mockQuery)).rejects.toThrow();
    });

    it("should handle bad gateway (502)", async () => {
      (http.get as vi.Mock).mockRejectedValueOnce({
        response: {
          status: 502,
          data: { detail: "Bad gateway" },
        },
      });

      await expect(getErrorLogs(mockQuery)).rejects.toThrow();
    });
  });

  describe("exportTopMoviesCSV", () => {
    const mockQuery: TopMoviesQuery = {
      type: "watchlist",
      range: "30d",
    };

    const mockBlob = new Blob(["mock,csv,data"], { type: "text/csv" });
    const mockBlobUrl = "blob:http://localhost:8080/mock-blob-url";

    beforeEach(() => {
      // Mock document.createElement
      const mockLink = {
        href: "",
        style: {},
        download: "",
        click: vi.fn(),
      };
      (document.createElement as vi.Mock).mockReturnValue(mockLink);

      // Mock window.URL
      (window.URL.createObjectURL as vi.Mock).mockReturnValue(mockBlobUrl);
      (window.URL.revokeObjectURL as vi.Mock).mockImplementation(() => {});

      // Mock fetch
      (global.fetch as vi.Mock).mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });
    });

    it("should create download link with correct URL", async () => {
      localStorageMock.getItem.mockReturnValue("mock-token");

      await exportTopMoviesCSV(mockQuery);

      const mockLink = (document.createElement as vi.Mock).mock.results[0].value;
      expect(mockLink.href).toBe(mockBlobUrl);
      expect(mockLink.download).toBe("top-movies-watchlist-30d.csv");
    });

    it("should include Authorization header from localStorage", async () => {
      const mockToken = "mock-jwt-token";
      localStorageMock.getItem.mockReturnValue(mockToken);

      await exportTopMoviesCSV(mockQuery);

      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:8000/admin/analytics/api/top-movies/export.csv?type=watchlist&range=30d",
        {
          headers: {
            Authorization: `Bearer ${mockToken}`,
          },
        }
      );
    });

    it("should trigger browser download with correct filename", async () => {
      localStorageMock.getItem.mockReturnValue("mock-token");

      await exportTopMoviesCSV(mockQuery);

      const mockLink = (document.createElement as vi.Mock).mock.results[0].value;
      expect(mockLink.download).toBe("top-movies-watchlist-30d.csv");
      expect(mockLink.click).toHaveBeenCalled();
    });

    it("should handle download errors", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      localStorageMock.getItem.mockReturnValue("mock-token");

      (global.fetch as vi.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(exportTopMoviesCSV(mockQuery)).rejects.toThrow("HTTP error! status: 500");
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error exporting CSV:", expect.any(Error));
      consoleErrorSpy.mockRestore();
    });

    it("should clean up blob URL after download", async () => {
      localStorageMock.getItem.mockReturnValue("mock-token");

      await exportTopMoviesCSV(mockQuery);

      expect(window.URL.revokeObjectURL).toHaveBeenCalledWith(mockBlobUrl);
    });
  });

  describe("exportErrorLogsCSV", () => {
    const mockQuery: ErrorLogsQuery = {
      api_type: ["tmdb", "watchmode"],
      date_from: "2024-01-01",
      date_to: "2024-01-31",
      sort: "timestamp_desc",
    };

    const mockBlob = new Blob(["mock,csv,data"], { type: "text/csv" });
    const mockBlobUrl = "blob:http://localhost:8080/mock-blob-url";
    const RealDate = global.Date;

    beforeEach(() => {
      // Reset all mocks
      vi.clearAllMocks();

      // Mock document.createElement
      const mockLink = {
        href: "",
        style: {},
        download: "",
        click: vi.fn(),
      };
      (document.createElement as vi.Mock).mockReturnValue(mockLink);

      // Mock window.URL
      (window.URL.createObjectURL as vi.Mock).mockReturnValue(mockBlobUrl);
      (window.URL.revokeObjectURL as vi.Mock).mockImplementation(() => {});

      // Mock fetch
      (global.fetch as vi.Mock).mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      // Create fixed date before mocking
      const fixedDate = new RealDate("2024-01-15");

      // Mock Date constructor globally
      const MockDate = function(...args: any[]) {
        if (args.length === 0) {
          return fixedDate;
        }
        return new RealDate(...args);
      };
      MockDate.prototype = RealDate.prototype;
      MockDate.prototype.toISOString = () => "2024-01-15T12:00:00.000Z";
      global.Date = MockDate as any;
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
      // Restore Date constructor
      global.Date = RealDate;
    });

    it("should create download link with correct URL", async () => {
      localStorageMock.getItem.mockReturnValue("mock-token");

      await exportErrorLogsCSV(mockQuery);

      const mockLink = (document.createElement as vi.Mock).mock.results[0].value;
      expect(mockLink.href).toBe(mockBlobUrl);
      expect(mockLink.download).toBe("error-logs-2024-01-15.csv");
    });

    it("should include multiple api_type params if provided", async () => {
      localStorageMock.getItem.mockReturnValue("mock-token");

      await exportErrorLogsCSV(mockQuery);

      const expectedUrl = "http://localhost:8000/admin/analytics/api/error-logs/export.csv?api_type=tmdb&api_type=watchmode&date_from=2024-01-01&date_to=2024-01-31&sort=timestamp_desc";
      expect(global.fetch).toHaveBeenCalledWith(expectedUrl, {
        headers: {
          Authorization: "Bearer mock-token",
        },
      });
    });

    it("should include Authorization header from localStorage", async () => {
      const mockToken = "mock-jwt-token";
      localStorageMock.getItem.mockReturnValue(mockToken);

      await exportErrorLogsCSV(mockQuery);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("http://localhost:8000/admin/analytics/api/error-logs/export.csv"),
        {
          headers: {
            Authorization: `Bearer ${mockToken}`,
          },
        }
      );
    });

    it("should trigger browser download with correct filename (date-based)", async () => {
      localStorageMock.getItem.mockReturnValue("mock-token");

      await exportErrorLogsCSV(mockQuery);

      const mockLink = (document.createElement as vi.Mock).mock.results[0].value;
      expect(mockLink.download).toBe("error-logs-2024-01-15.csv");
      expect(mockLink.click).toHaveBeenCalled();
    });

    it("should handle download errors", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      localStorageMock.getItem.mockReturnValue("mock-token");

      (global.fetch as vi.Mock).mockResolvedValue({
        ok: false,
        status: 403,
      });

      await expect(exportErrorLogsCSV(mockQuery)).rejects.toThrow("HTTP error! status: 403");
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error exporting CSV:", expect.any(Error));
      consoleErrorSpy.mockRestore();
    });

    it("should clean up blob URL after download", async () => {
      localStorageMock.getItem.mockReturnValue("mock-token");

      await exportErrorLogsCSV(mockQuery);

      expect(window.URL.revokeObjectURL).toHaveBeenCalledWith(mockBlobUrl);
    });
  });

  describe("getAdminBaseURL", () => {
    it("should return empty string in development mode (baseURL = /api)", () => {
      http.defaults.baseURL = "/api";

      const result = getAdminBaseURL();

      expect(result).toBe("");
    });

    it("should return empty string when baseURL is undefined", () => {
      http.defaults.baseURL = undefined;

      const result = getAdminBaseURL();

      expect(result).toBe("");
    });

    it("should remove /api from full URL baseURL", () => {
      http.defaults.baseURL = "http://localhost:8000/api";

      const result = getAdminBaseURL();

      expect(result).toBe("http://localhost:8000");
    });

    it("should handle baseURL without /api suffix", () => {
      http.defaults.baseURL = "http://localhost:8000";

      const result = getAdminBaseURL();

      expect(result).toBe("http://localhost:8000");
    });
  });
});
