import axios from "axios";

/**
 * Base Axios instance for API calls.
 * Configured with base URL and default headers.
 */
export const http = axios.create({
  baseURL: "__VITE_API_URL__", /** "http://localhost:8000/api", */
  headers: {
    "Content-Type": "application/json"
  },
  withCredentials: false,
});

/**
 * Add response interceptor for consistent error handling.
 */
http.interceptors.response.use(
  (response) => response,
  (error) => {
    // Ensure error structure is consistent
    if (error.response) {
      // Server responded with error status
      return Promise.reject(error.response);
    } else if (error.request) {
      // Request made but no response received
      return Promise.reject({
        data: { error: "Nie udało się połączyć z serwerem" },
        status: 0,
      });
    } else {
      // Something else happened
      return Promise.reject({
        data: { error: "Wystąpił nieoczekiwany błąd" },
        status: 0,
      });
    }
  }
);

