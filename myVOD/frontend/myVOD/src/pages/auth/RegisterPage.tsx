import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { RegisterForm } from "@/pages/auth/components/RegisterForm";
import { ThemeToggle } from "@/components/ui/theme-toggle";

/**
 * Registration page container.
 * Handles page layout, title, and redirects if user is already logged in.
 */
export function RegisterPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Set page title
    document.title = "Rejestracja - MyVOD";
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
            Utwórz konto
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Dołącz do MyVOD i zarządzaj swoją listą filmów
          </p>
        </div>

        {/* Registration Form */}
        <div className="bg-card rounded-lg border shadow-xl p-6 sm:p-8">
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
