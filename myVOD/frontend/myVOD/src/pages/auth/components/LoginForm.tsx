import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useLogin } from "@/hooks/useLogin";
import { useAuth } from "@/contexts/AuthContext";
import { loginSchema } from "@/schemas/login.schema";
import type { LoginUserCommand } from "@/types/api.types";
import { ErrorAlert } from "./ErrorAlert";

type LoginFormValues = LoginUserCommand;

/**
 * Main login form component.
 * Handles form validation, submission, and JWT token management.
 */
export function LoginForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const { mutate: loginMutation, isPending } = useLogin();

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onBlur",
  });

  const onSubmit = (values: LoginFormValues) => {
    // Clear previous server errors
    setServerError(null);

    loginMutation(values, {
      onSuccess: (tokens) => {
        // Save tokens to localStorage via AuthContext
        login(tokens);

        // After login, route via root so AppRoot can decide onboarding vs watchlist
        const next = searchParams.get("next") || "/";
        navigate(next);
      },
      onError: (error: unknown) => {
        // Handle authentication errors
        if (error && typeof error === "object" && "data" in error) {
          const apiError = error.data as { detail?: string };
          if (apiError.detail) {
            setServerError(apiError.detail);
          } else {
            setServerError("Nieprawidłowy email lub hasło");
          }
        } else {
          setServerError("Wystąpił błąd podczas logowania. Spróbuj ponownie.");
        }
      },
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Global Error Alert */}
        <ErrorAlert message={serverError ?? undefined} />

        {/* Email Field */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground">Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="twoj@email.com"
                  autoComplete="email"
                  aria-invalid={!!form.formState.errors.email}
                  aria-describedby={
                    form.formState.errors.email ? "email-error" : undefined
                  }
                  className="bg-background border-input text-foreground placeholder:text-muted-foreground focus:border-ring"
                  data-testid="login-email-input"
                  {...field}
                />
              </FormControl>
              <FormMessage id="email-error" className="text-red-400" />
            </FormItem>
          )}
        />

        {/* Password Field */}
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground">Hasło</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    aria-invalid={!!form.formState.errors.password}
                    aria-describedby={
                      form.formState.errors.password
                        ? "password-error"
                        : undefined
                    }
                    className="bg-background border-input text-foreground placeholder:text-muted-foreground focus:border-ring pr-10"
                    data-testid="login-password-input"
                    {...field}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Ukryj hasło" : "Pokaż hasło"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </FormControl>
              <FormMessage id="password-error" className="text-red-400" />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
          data-testid="login-submit-button"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Logowanie...
            </>
          ) : (
            "Zaloguj się"
          )}
        </Button>

        {/* Links */}
        <div className="space-y-2">
          <p className="text-center text-sm text-muted-foreground">
            Nie masz konta?{" "}
            <Link
              to="/auth/register"
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Zarejestruj się
            </Link>
          </p>
          <p className="text-center text-sm text-muted-foreground">
            <Link
              to="/auth/forgot-password"
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Zapomniałeś hasła?
            </Link>
          </p>
        </div>
      </form>
    </Form>
  );
}

