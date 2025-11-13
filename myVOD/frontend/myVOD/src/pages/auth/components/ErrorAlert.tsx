import { useEffect, useRef } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

type ErrorAlertProps = {
  message?: string;
};

/**
 * Global error alert component with accessibility features.
 * Automatically focuses on mount for screen reader announcements.
 */
export function ErrorAlert({ message }: ErrorAlertProps) {
  const alertRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Focus the alert when it appears for accessibility
    if (message && alertRef.current) {
      alertRef.current.focus();
    }
  }, [message]);

  if (!message) return null;

  return (
    <Alert
      ref={alertRef}
      variant="destructive"
      role="alert"
      aria-live="assertive"
      tabIndex={-1}
      className="mb-4"
      style={{
        color: "var(--error-alert-text)",
        borderColor: "var(--error-alert-border)",
      }}
    >
      <AlertCircle
        className="h-4 w-4"
        style={{ color: "var(--error-alert-icon)" }}
      />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
