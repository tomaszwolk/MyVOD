import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { Loader2, Mail } from "lucide-react";
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
import { useForgotPasswordMutation } from "@/hooks/useForgotPasswordMutation";
import { forgotPasswordSchema } from "@/schemas/password-reset.schema";
import type { ForgotPasswordCommand } from "@/types/api.types";
import { ErrorAlert } from "./ErrorAlert";

type ForgotPasswordFormValues = ForgotPasswordCommand;

/**
 * Forgot password form component.
 * Handles email input and submission to initiate password reset process.
 */
export function ForgotPasswordForm() {
  const { mutate: forgotPasswordMutation, isPending } = useForgotPasswordMutation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
    mode: "onBlur",
  });

  const onSubmit = (values: ForgotPasswordFormValues) => {
    setServerError(null);
    setIsSuccess(false);

    forgotPasswordMutation(values, {
      onSuccess: () => {
        setIsSuccess(true);
        form.reset();
      },
      onError: (error: unknown) => {
        if (error && typeof error === "object" && "data" in error) {
          const apiError = error.data as { detail?: string; email?: string[] };
          if (apiError.detail) {
            setServerError(apiError.detail);
          } else if (apiError.email) {
            setServerError(apiError.email[0]);
          } else {
            setServerError("Wystąpił błąd podczas wysyłania emaila. Spróbuj ponownie.");
          }
        } else {
          setServerError("Wystąpił błąd podczas wysyłania emaila. Spróbuj ponownie.");
        }
      },
    });
  };

  if (isSuccess) {
    return (
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/20">
            <Mail className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Email wysłany!
          </h3>
          <p className="text-muted-foreground text-sm mb-6">
            Jeśli podany adres email jest powiązany z kontem, otrzymasz wiadomość
            z linkiem do resetowania hasła.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => {
              setIsSuccess(false);
              setServerError(null);
            }}
            variant="outline"
            className="w-full"
          >
            Wyślij ponownie
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            <Link
              to="/auth/login"
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Wróć do logowania
            </Link>
          </p>
        </div>
      </div>
    );
  }

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
              <FormLabel className="text-foreground">Adres email</FormLabel>
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
                  data-testid="forgot-password-email-input"
                  {...field}
                />
              </FormControl>
              <FormMessage id="email-error" className="text-red-400" />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
          data-testid="forgot-password-submit-button"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Wysyłanie...
            </>
          ) : (
            "Wyślij link resetujący"
          )}
        </Button>

        {/* Back to Login Link */}
        <p className="text-center text-sm text-muted-foreground">
          <Link
            to="/auth/login"
            className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
          >
            Wróć do logowania
          </Link>
        </p>
      </form>
    </Form>
  );
}
