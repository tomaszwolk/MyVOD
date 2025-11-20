import { useState, useCallback, useEffect } from "react";
import type { ViewMode, SortOption, FiltersState } from "@/types/view/watchlist.types";

// Session storage keys
const WATCHLIST_VIEW_MODE_KEY = "watchlist:viewMode";
const WATCHLIST_SORT_KEY = "watchlist:sort";
const WATCHLIST_ONLY_AVAILABLE_KEY = "watchlist:onlyAvailable";
const WATCHLIST_HIDE_UNAVAILABLE_KEY = "watchlist:hideUnavailable";
const MEDIA_LIBRARY_VIEW_MODE_KEY = "mediaLibrary:viewMode";

// Default values
const DEFAULT_VIEW_MODE: ViewMode = "grid";
const DEFAULT_SORT: SortOption = "added_desc";
const DEFAULT_FILTERS: FiltersState = {
  showOnlyAvailable: false,
  onlyAvailable: false,
  hideUnavailable: false,
};

type SessionPreferences = {
  viewMode: ViewMode;
  sort: SortOption;
  filters: FiltersState;
};

/**
 * Custom hook for managing watchlist preferences in sessionStorage.
 * Provides read/write access to user preferences with default values.
 *
 * @returns Object with current preferences and setter functions
 */
export function useSessionPreferences() {
  // Initialize state from sessionStorage or defaults
  const [preferences, setPreferences] = useState<SessionPreferences>(() => {
    const readViewMode = (): ViewMode => {
      const parse = (raw: string | null): ViewMode | null =>
        raw === "grid" || raw === "list" ? (raw as ViewMode) : null;

      try {
        const sessionValue = typeof window !== "undefined"
          ? parse(window.sessionStorage.getItem(MEDIA_LIBRARY_VIEW_MODE_KEY))
          : null;
        if (sessionValue) {
          return sessionValue;
        }

        const localValue = typeof window !== "undefined" && window.localStorage
          ? parse(window.localStorage.getItem(MEDIA_LIBRARY_VIEW_MODE_KEY))
          : null;
        if (localValue) {
          return localValue;
        }
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[useSessionPreferences] Unable to read shared view mode", error);
        }
      }

      try {
        const legacy = typeof window !== "undefined"
          ? parse(window.sessionStorage.getItem(WATCHLIST_VIEW_MODE_KEY))
          : null;
        if (legacy) {
          return legacy;
        }
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[useSessionPreferences] Unable to read legacy watchlist view mode", error);
        }
      }

      return DEFAULT_VIEW_MODE;
    };

    const readSort = (): SortOption => {
      try {
        const value = typeof window !== "undefined"
          ? (window.sessionStorage.getItem(WATCHLIST_SORT_KEY) as SortOption | null)
          : null;
        return value ?? DEFAULT_SORT;
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[useSessionPreferences] Unable to read sort option", error);
        }
        return DEFAULT_SORT;
      }
    };

    const readFilters = (): FiltersState => {
      try {
        if (typeof window === "undefined") {
          return DEFAULT_FILTERS;
        }
        const onlyAvailable = window.sessionStorage.getItem(WATCHLIST_ONLY_AVAILABLE_KEY) === "true" || DEFAULT_FILTERS.onlyAvailable;
        
        return {
          onlyAvailable,
          hideUnavailable:
            window.sessionStorage.getItem(WATCHLIST_HIDE_UNAVAILABLE_KEY) === "true" || DEFAULT_FILTERS.hideUnavailable,
          showOnlyAvailable: onlyAvailable || DEFAULT_FILTERS.showOnlyAvailable,
        };
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[useSessionPreferences] Unable to read filters", error);
        }
        return DEFAULT_FILTERS;
      }
    };

    return {
      viewMode: readViewMode(),
      sort: readSort(),
      filters: readFilters(),
    };
  });

  // Update sessionStorage when preferences change
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(WATCHLIST_VIEW_MODE_KEY, preferences.viewMode);
        window.sessionStorage.setItem(WATCHLIST_SORT_KEY, preferences.sort);
        window.sessionStorage.setItem(WATCHLIST_ONLY_AVAILABLE_KEY, String(preferences.filters.onlyAvailable));
        window.sessionStorage.setItem(WATCHLIST_HIDE_UNAVAILABLE_KEY, String(preferences.filters.hideUnavailable));
        window.sessionStorage.setItem(MEDIA_LIBRARY_VIEW_MODE_KEY, preferences.viewMode);
      }
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[useSessionPreferences] Unable to persist session preferences", error);
      }
    }

    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(MEDIA_LIBRARY_VIEW_MODE_KEY, preferences.viewMode);
      }
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[useSessionPreferences] Unable to persist shared view mode in localStorage", error);
      }
    }
  }, [preferences]);

  // Setter functions
  const setViewMode = useCallback((viewMode: ViewMode) => {
    setPreferences(prev => ({ ...prev, viewMode }));
  }, []);

  const setSort = useCallback((sort: SortOption) => {
    setPreferences(prev => ({ ...prev, sort }));
  }, []);

  const setFilters = useCallback((filters: FiltersState) => {
    setPreferences(prev => ({ ...prev, filters }));
  }, []);

  const updateFilters = useCallback((updates: Partial<FiltersState>) => {
    setPreferences(prev => ({
      ...prev,
      filters: { ...prev.filters, ...updates }
    }));
  }, []);

  return {
    viewMode: preferences.viewMode,
    sort: preferences.sort,
    filters: preferences.filters,
    setViewMode,
    setSort,
    setFilters,
    updateFilters,
  };
}
