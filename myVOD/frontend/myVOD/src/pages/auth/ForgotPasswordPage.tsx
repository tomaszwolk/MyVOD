import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { ForgotPasswordForm } from "@/pages/auth/components/ForgotPasswordForm";

/**
 * Forgot password page container.
 * Handles page layout, title, and redirects authenticated users.
 */
export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    document.title = "Resetowanie hasła - MyVOD";
  }, []);

  // Redirect authenticated users
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
            Resetowanie hasła
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Wprowadź swój adres email, aby otrzymać link do resetowania hasła
          </p>
        </div>

        {/* Forgot Password Form */}
        <div className="bg-card rounded-lg border shadow-xl p-6 sm:p-8">
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
