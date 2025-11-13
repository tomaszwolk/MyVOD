import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LoginForm } from "@/pages/auth/components/LoginForm";
import { ThemeToggle } from "@/components/ui/theme-toggle";

/**
 * Login page container.
 * Handles page layout, title, and displays success message from registration.
 */
export function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const successMessage = location.state?.message;

  useEffect(() => {
    document.title = "Logowanie - MyVOD";
  }, []);

  // Redirect authenticated users via root gate
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8 relative overflow-visible">
      {/* Theme Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
            Logowanie
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Zaloguj się do swojego konta MyVOD
          </p>
        </div>

        {/* Success Message from Registration */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg dark:bg-green-950/20 dark:border-green-800">
            <p className="text-green-800 text-sm text-center dark:text-green-200">
              {successMessage}
            </p>
          </div>
        )}

        {/* Login Form */}
        <div className="bg-card rounded-lg border shadow-xl p-6 sm:p-8">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
