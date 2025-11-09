import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ResetPasswordForm } from "@/pages/auth/components/ResetPasswordForm";
import { useValidateResetTokenQuery } from "@/hooks/useValidateResetTokenQuery";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Reset password page container.
 * Handles token validation and password reset form display.
 */
export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();

  const uid = searchParams.get("uid");
  const token = searchParams.get("token");

  const [tokenValidated, setTokenValidated] = useState(false);

  // Validate token on mount
  const { data, isLoading, error } = useValidateResetTokenQuery(
    uid && token ? { uid, token } : null,
    !!uid && !!token
  );

  useEffect(() => {
    document.title = "Ustaw nowe hasło - MyVOD";
  }, []);

  // Redirect authenticated users
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Mark token as validated when successful
  useEffect(() => {
    if (data) {
      setTokenValidated(true);
    }
  }, [data]);

  // Check if we have required parameters
  if (!uid || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
        <div className="w-full max-w-md mx-auto">
          <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-800 dark:text-red-200">
              Nieprawidłowy link resetowania hasła. Sprawdź czy link jest kompletny.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Show loading while validating token
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
        <div className="w-full max-w-md mx-auto text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-muted-foreground">Weryfikacja linku resetowania...</p>
        </div>
      </div>
    );
  }

  // Show error if token validation failed
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
        <div className="w-full max-w-md mx-auto">
          <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-800 dark:text-red-200">
              Link resetowania hasła jest nieprawidłowy lub wygasł. Spróbuj ponownie
              wysłać prośbę o resetowanie hasła.
            </AlertDescription>
          </Alert>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate("/auth/forgot-password")}
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Wyślij nowy link resetujący
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show reset form if token is valid
  if (tokenValidated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
        <div className="w-full max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
              Ustaw nowe hasło
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Wprowadź nowe hasło dla swojego konta
            </p>
          </div>

          {/* Reset Password Form */}
          <div className="bg-card rounded-lg border shadow-xl p-6 sm:p-8">
            <ResetPasswordForm uid={uid} token={token} />
          </div>
        </div>
      </div>
    );
  }

  // This shouldn't happen, but fallback
  return null;
}
