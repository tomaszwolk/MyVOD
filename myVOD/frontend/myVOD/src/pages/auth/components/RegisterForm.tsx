import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Link } from "react-router-dom";
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
import { useRegister } from "@/hooks/useRegister";
import { registerSchema } from "@/schemas/register.schema";
import { mapRegisterError } from "@/utils/mapRegisterError";
import type { RegisterFormValues } from "@/types/form.types";
import type { RegisterUserCommand } from "@/types/api.types";
import { PasswordRules } from "./PasswordRules";
import { ErrorAlert } from "./ErrorAlert";

/**
 * Main registration form component.
 * Handles form validation, submission, and error display.
 */
export function RegisterForm() {
  const navigate = useNavigate();
  const { mutate: register, isPending } = useRegister();
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onChange",
    reValidateMode: "onChange",
  });

  const passwordValue = form.watch("password");

  const onSubmit = (values: RegisterFormValues) => {
    // Clear previous server errors
    setServerError(null);

    // Prepare payload (exclude confirmPassword)
    const payload: RegisterUserCommand = {
      email: values.email,
      password: values.password,
    };

    register(payload, {
      onSuccess: () => {
        // TODO: Add toast notification when toast component is available
        // Show success message and redirect to login with next parameter
        navigate("/auth/login?next=/onboarding", {
          state: { 
            message: "Konto utworzone. Zaloguj się, aby kontynuować." 
          },
        });
      },
      onError: (error: unknown) => {
        // Map API errors to UI
        const mappedError = mapRegisterError(error);

        // Set field-specific errors
        if (mappedError.email) {
          form.setError("email", {
            type: "manual",
            message: mappedError.email,
          });
        }

        if (mappedError.password) {
          form.setError("password", {
            type: "manual",
            message: mappedError.password,
          });
        }

        // Set global error
        if (mappedError.global) {
          setServerError(mappedError.global);
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
              <FormLabel className="text-slate-200">Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="twoj@email.com"
                  autoComplete="email"
                  aria-invalid={!!form.formState.errors.email}
                  aria-describedby={
                    form.formState.errors.email ? "email-error" : undefined
                  }
                  className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-slate-400"
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
              <FormLabel className="text-slate-200">Hasło</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    aria-invalid={!!form.formState.errors.password}
                    aria-describedby={
                      form.formState.errors.password
                        ? "password-error"
                        : "password-rules"
                    }
                    className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-slate-400 pr-10"
                    {...field}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
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
              <div id="password-rules">
                <PasswordRules password={passwordValue} />
              </div>
            </FormItem>
          )}
        />

        {/* Confirm Password Field */}
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-slate-200">Powtórz hasło</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    aria-invalid={!!form.formState.errors.confirmPassword}
                    aria-describedby={
                      form.formState.errors.confirmPassword
                        ? "confirm-password-error"
                        : undefined
                    }
                    className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-slate-400 pr-10"
                    {...field}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                    aria-label={
                      showConfirmPassword
                        ? "Ukryj potwierdzenie hasła"
                        : "Pokaż potwierdzenie hasła"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </FormControl>
              <FormMessage
                id="confirm-password-error"
                className="text-red-400"
              />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isPending || !form.formState.isValid}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Tworzenie konta...
            </>
          ) : (
            "Zarejestruj się"
          )}
        </Button>

        {/* Login Link */}
        <p className="text-center text-sm text-muted-foreground">
          Masz już konto?{" "}
          <Link
            to="/auth/login"
            className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
          >
            Zaloguj się
          </Link>
        </p>
      </form>
    </Form>
  );
}

