// Theme will be managed by useTheme hook
// Dark mode can be toggled via ThemeToggle component

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryCache, QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { http } from '@/lib/http'
import { setupAxiosInterceptors } from '@/lib/axios-interceptors'
import { Toaster } from '@/components/ui/sonner'
import './index.css'
import { router } from './router'

// Initialize theme before rendering
function initializeTheme() {
  if (typeof window === 'undefined') return;
  
  const getInitialTheme = (): 'light' | 'dark' => {
    // Sprawdź localStorage
    const stored = localStorage.getItem('theme') as 'light' | 'dark';
    if (stored === 'dark' || stored === 'light') {
      return stored;
    }
    
    // Jeśli nie ma zapisanego motywu, użyj preferencji systemowych
    // Jeśli preferencje systemowe też nie są ustawione, domyślnie dark
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'dark'; // Domyślnie dark mode
  };
  
  const theme = getInitialTheme();
  const root = document.documentElement;
  
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  
  // Zapisz do localStorage jeśli nie było zapisane
  if (!localStorage.getItem('theme')) {
    localStorage.setItem('theme', theme);
  }
}

// Initialize theme immediately
initializeTheme();

interface QueryMeta {
  integration?: 'gemini' | 'watchmode';
  operation?: string;
}

// Global error handler for integration logging
const handleQueryError = (error: Error, query: { meta?: QueryMeta, queryKey?: unknown }) => {
  const meta = query.meta;

  // Log integration errors
  if (meta?.integration) {
    import('@/utils/error-logger').then(({ logGeminiError, logWatchmodeError }) => {
      if (meta.integration === 'gemini') {
        logGeminiError(meta.operation || 'unknown', error, {
          queryKey: query.queryKey,
        });
      } else if (meta.integration === 'watchmode') {
        logWatchmodeError(meta.operation || 'unknown', error, {
          queryKey: query.queryKey,
        });
      }
    });
  }
};

// Global error handler for mutations
const handleMutationError = (error: Error, variables: unknown, context: unknown, mutation: { meta?: QueryMeta }) => {
  const meta = mutation.meta;

  // Log integration errors
  if (meta?.integration) {
    import('@/utils/error-logger').then(({ logGeminiError, logWatchmodeError }) => {
      if (meta.integration === 'gemini') {
        logGeminiError(meta.operation || 'unknown', error, {
          variables,
          context,
        });
      } else if (meta.integration === 'watchmode') {
        logWatchmodeError(meta.operation || 'unknown', error, {
          variables,
          context,
        });
      }
    });
  }
};

// Create a client for TanStack Query
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handleQueryError,
  }),
  mutationCache: new MutationCache({
    onError: handleMutationError,
  }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

// Setup Axios interceptors for automatic token refresh
// The logout callback will be handled by AuthProvider
setupAxiosInterceptors(
  http,
  () => {
    // Clear tokens from localStorage
    localStorage.removeItem("myVOD_access_token");
    localStorage.removeItem("myVOD_refresh_token");
    // Redirect to login
    window.location.href = "/auth/login";
  },
  () => {
    // Clear tokens from localStorage and redirect to unauthorized page
    localStorage.removeItem("myVOD_access_token");
    localStorage.removeItem("myVOD_refresh_token");
    // Redirect to unauthorized error page
    window.location.href = "/error/unauthorized";
  }
);


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
