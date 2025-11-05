import { Toaster } from "@/components/ui/sonner";

/**
 * Toast viewport component using Sonner for notifications.
 * Provides global toast notifications throughout the watchlist page.
 */
export function ToastViewport() {
  return <Toaster position="top-right" richColors data-testid="toast-notification" />;
}
