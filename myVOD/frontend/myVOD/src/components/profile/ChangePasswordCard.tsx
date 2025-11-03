import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

/**
 * Props for ChangePasswordCard component.
 */
type ChangePasswordCardProps = {
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  isChanging: boolean;
};

/**
 * Card component for changing user password.
 * Contains form with current password, new password, and confirm password fields.
 */
export function ChangePasswordCard({
  onChangePassword,
  isChanging,
}: ChangePasswordCardProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: typeof errors = {};
    
    if (!currentPassword.trim()) {
      newErrors.currentPassword = "Obecne hasło jest wymagane";
    }
    
    if (!newPassword.trim()) {
      newErrors.newPassword = "Nowe hasło jest wymagane";
    } else if (newPassword.length < 8) {
      newErrors.newPassword = "Hasło musi mieć co najmniej 8 znaków";
    } else if (!/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      newErrors.newPassword = "Hasło musi zawierać litery i cyfry";
    }
    
    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = "Potwierdzenie hasła jest wymagane";
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Hasła nie są identyczne";
    }

    // Set errors (will clear previous errors if none)
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    try {
      await onChangePassword(currentPassword, newPassword);
      // Reset form on success
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setErrors({});
    } catch (error) {
      // Error handling is done by parent component
    }
  };

  const handleReset = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setErrors({});
  };

  return (
    <div className="bg-card border rounded-lg shadow-sm" data-testid="change-password-card">
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Zmień hasło</h2>
          <p className="text-sm text-muted-foreground">
            Aby zmienić hasło, podaj obecne hasło oraz nowe hasło spełniające wymagania bezpieczeństwa.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="current-password">Obecne hasło</Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  // Clear error when user starts typing
                  if (errors.currentPassword) {
                    setErrors((prev) => ({ ...prev, currentPassword: undefined }));
                  }
                }}
                disabled={isChanging}
                className={errors.currentPassword ? "border-destructive" : ""}
                aria-invalid={!!errors.currentPassword}
                aria-describedby={errors.currentPassword ? "current-password-error" : undefined}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.currentPassword && (
              <p id="current-password-error" className="text-sm text-destructive">
                {errors.currentPassword}
              </p>
            )}
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="new-password">Nowe hasło</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  // Clear error when user starts typing
                  if (errors.newPassword) {
                    setErrors((prev) => ({ ...prev, newPassword: undefined }));
                  }
                }}
                disabled={isChanging}
                className={errors.newPassword ? "border-destructive" : ""}
                aria-invalid={!!errors.newPassword}
                aria-describedby={errors.newPassword ? "new-password-error" : undefined}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.newPassword && (
              <p id="new-password-error" className="text-sm text-destructive">
                {errors.newPassword}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Hasło musi mieć co najmniej 8 znaków i zawierać litery oraz cyfry
            </p>
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Potwierdź nowe hasło</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  // Clear error when user starts typing
                  if (errors.confirmPassword) {
                    setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }
                }}
                disabled={isChanging}
                className={errors.confirmPassword ? "border-destructive" : ""}
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p id="confirm-password-error" className="text-sm text-destructive">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={isChanging}
            >
              Anuluj
            </Button>
            <Button
              type="submit"
              disabled={isChanging}
              data-testid="change-password-submit"
            >
              {isChanging ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Zmienianie...
                </>
              ) : (
                "Zmień hasło"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

