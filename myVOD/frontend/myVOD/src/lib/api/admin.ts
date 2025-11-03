import { http } from "@/lib/http";
import type {
  AdminMetricsDto,
  TopMoviesDto,
  TopMoviesQuery,
  PaginatedErrorLogsDto,
  ErrorLogsQuery,
} from "@/types/view/admin.types";

/**
 * API client for admin dashboard endpoints.
 * All endpoints require staff permissions and are under /admin/analytics/api/
 * Note: Admin endpoints are under /admin/ (not /api/), so we override baseURL
 */

// Get base URL without /api prefix for admin endpoints
const getAdminBaseURL = () => {
  const baseURL = http.defaults.baseURL || "http://localhost:8000/api";
  return baseURL.replace("/api", "");
};

/**
 * Get admin metrics including user counts, retention, and timeseries data.
 * Corresponds to GET /admin/analytics/api/metrics/
 * @returns Promise<AdminMetricsDto>
 * @throws API error with status 403 if user is not staff
 */
export async function getAdminMetrics(): Promise<AdminMetricsDto> {
  const response = await http.get<AdminMetricsDto>("/admin/analytics/api/metrics/", {
    // Override baseURL for admin endpoints (they're under /admin/, not /api/)
    baseURL: getAdminBaseURL(),
  });
  return response.data;
}

/**
 * Get top movies by watchlist or watched count.
 * Corresponds to GET /admin/analytics/api/top-movies/?type=<type>&range=<range>
 * @param query - Query parameters (type and range)
 * @returns Promise<TopMoviesDto>
 * @throws API error with status 400 for invalid parameters, 403 if user is not staff
 */
export async function getTopMovies(query: TopMoviesQuery): Promise<TopMoviesDto> {
  const response = await http.get<TopMoviesDto>("/admin/analytics/api/top-movies/", {
    baseURL: getAdminBaseURL(),
    params: {
      type: query.type,
      range: query.range,
    },
  });
  return response.data;
}

/**
 * Get paginated error logs with optional filters.
 * Corresponds to GET /admin/analytics/api/error-logs/ with query params
 * @param query - Query parameters (filters, pagination, sorting)
 * @returns Promise<PaginatedErrorLogsDto>
 * @throws API error with status 400 for invalid parameters, 403 if user is not staff
 */
export async function getErrorLogs(query: ErrorLogsQuery = {}): Promise<PaginatedErrorLogsDto> {
  const params: Record<string, string | number | string[]> = {};
  
  // Handle multiple api_type values - axios will serialize array as multiple query params
  if (query.api_type && query.api_type.length > 0) {
    params.api_type = query.api_type;
  }
  
  if (query.date_from) {
    params.date_from = query.date_from;
  }
  
  if (query.date_to) {
    params.date_to = query.date_to;
  }
  
  if (query.user_id) {
    params.user_id = query.user_id;
  }
  
  if (query.page !== undefined) {
    params.page = query.page;
  }
  
  if (query.page_size !== undefined) {
    params.page_size = query.page_size;
  }
  
  if (query.sort) {
    params.sort = query.sort;
  }

  const response = await http.get<PaginatedErrorLogsDto>("/admin/analytics/api/error-logs/", {
    baseURL: getAdminBaseURL(),
    params,
  });
  return response.data;
}

/**
 * Export top movies as CSV.
 * Corresponds to GET /admin/analytics/api/top-movies/export.csv
 * @param query - Query parameters (type and range)
 * @returns Promise<void> - triggers browser download
 */
export function exportTopMoviesCSV(query: TopMoviesQuery): void {
  const params = new URLSearchParams({
    type: query.type,
    range: query.range,
  });
  
  const url = `${getAdminBaseURL()}/admin/analytics/api/top-movies/export.csv?${params.toString()}`;
  const token = localStorage.getItem("myVOD_access_token");
  
  // Create a temporary link and trigger download
  const link = document.createElement("a");
  link.href = url;
  link.style.display = "none";
  
  // Add Authorization header via fetch (CSV download)
  fetch(url, {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.blob();
    })
    .then((blob) => {
      const blobUrl = window.URL.createObjectURL(blob);
      link.href = blobUrl;
      link.download = `top-movies-${query.type}-${query.range}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    })
    .catch((error) => {
      console.error("Error exporting CSV:", error);
      throw error;
    });
}

/**
 * Export error logs as CSV.
 * Corresponds to GET /admin/analytics/api/error-logs/export.csv
 * @param query - Query parameters (filters)
 * @returns Promise<void> - triggers browser download
 */
export function exportErrorLogsCSV(query: ErrorLogsQuery = {}): void {
  const params = new URLSearchParams();
  
  if (query.api_type && query.api_type.length > 0) {
    query.api_type.forEach((type) => {
      params.append("api_type", type);
    });
  }
  
  if (query.date_from) {
    params.append("date_from", query.date_from);
  }
  
  if (query.date_to) {
    params.append("date_to", query.date_to);
  }
  
  if (query.user_id) {
    params.append("user_id", query.user_id);
  }
  
  if (query.sort) {
    params.append("sort", query.sort);
  }
  
  const url = `${getAdminBaseURL()}/admin/analytics/api/error-logs/export.csv?${params.toString()}`;
  const token = localStorage.getItem("myVOD_access_token");
  
  // Create a temporary link and trigger download
  const link = document.createElement("a");
  link.href = url;
  link.style.display = "none";
  
  // Add Authorization header via fetch (CSV download)
  fetch(url, {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.blob();
    })
    .then((blob) => {
      const blobUrl = window.URL.createObjectURL(blob);
      link.href = blobUrl;
      const dateStr = new Date().toISOString().split("T")[0];
      link.download = `error-logs-${dateStr}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    })
    .catch((error) => {
      console.error("Error exporting CSV:", error);
      throw error;
    });
}

