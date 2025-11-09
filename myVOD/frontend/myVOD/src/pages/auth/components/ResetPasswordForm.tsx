import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";
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
import { useResetPasswordMutation } from "@/hooks/useResetPasswordMutation";
import { resetPasswordSchema } from "@/schemas/password-reset.schema";
import { ErrorAlert } from "./ErrorAlert";
import { PasswordRules } from "./PasswordRules";

interface ResetPasswordFormProps {
  uid: string;
  token: string;
}

type ResetPasswordFormValues = {
  newPassword: string;
  confirmPassword: string;
};

/**
 * Reset password form component.
 * Handles new password input with strength validation and confirmation.
 */
export function ResetPasswordForm({ uid, token }: ResetPasswordFormProps) {
  const navigate = useNavigate();
  const { mutate: resetPasswordMutation, isPending } = useResetPasswordMutation();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
    mode: "onBlur",
  });

  const watchedPassword = form.watch("newPassword");

  const onSubmit = (values: ResetPasswordFormValues) => {
    setServerError(null);

    resetPasswordMutation(
      {
        uid,
        token,
        new_password: values.newPassword,
      },
      {
        onSuccess: () => {
          setIsSuccess(true);
        },
        onError: (error: unknown) => {
          if (error && typeof error === "object" && "data" in error) {
            const apiError = error.data as { detail?: string; new_password?: string[] };
            if (apiError.detail) {
              setServerError(apiError.detail);
            } else if (apiError.new_password) {
              setServerError(apiError.new_password[0]);
            } else {
              setServerError("Wystąpił błąd podczas ustawiania nowego hasła. Spróbuj ponownie.");
            }
          } else {
            setServerError("Wystąpił błąd podczas ustawiania nowego hasła. Spróbuj ponownie.");
          }
        },
      }
    );
  };

  if (isSuccess) {
    return (
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/20">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Hasło zostało zmienione!
          </h3>
          <p className="text-muted-foreground text-sm mb-6">
            Twoje hasło zostało pomyślnie zaktualizowane. Możesz teraz się zalogować.
          </p>
        </div>

        <Button
          onClick={() => navigate("/auth/login")}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
        >
          Przejdź do logowania
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Global Error Alert */}
        <ErrorAlert message={serverError ?? undefined} />

        {/* New Password Field */}
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground">Nowe hasło</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    aria-invalid={!!form.formState.errors.newPassword}
                    aria-describedby={
                      form.formState.errors.newPassword
                        ? "new-password-error"
                        : undefined
                    }
                    className="bg-background border-input text-foreground placeholder:text-muted-foreground focus:border-ring pr-10"
                    data-testid="reset-password-input"
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
              <FormMessage id="new-password-error" className="text-red-400" />

              {/* Password Rules */}
              {watchedPassword && (
                <PasswordRules password={watchedPassword} />
              )}
            </FormItem>
          )}
        />

        {/* Confirm Password Field */}
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground">Potwierdź hasło</FormLabel>
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
                    className="bg-background border-input text-foreground placeholder:text-muted-foreground focus:border-ring pr-10"
                    data-testid="reset-confirm-password-input"
                    {...field}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showConfirmPassword ? "Ukryj hasło" : "Pokaż hasło"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </FormControl>
              <FormMessage id="confirm-password-error" className="text-red-400" />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
          data-testid="reset-password-submit-button"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Ustawianie hasła...
            </>
          ) : (
            "Ustaw nowe hasło"
          )}
        </Button>
      </form>
    </Form>
  );
}
