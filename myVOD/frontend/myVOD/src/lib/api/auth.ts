import { http } from "@/lib/http";
import type {
  RegisterUserCommand,
  RegisteredUserDto,
  LoginUserCommand,
  AuthTokensDto,
  UserProfileDto,
  ForgotPasswordCommand,
  ValidateResetTokenCommand,
  ResetPasswordConfirmCommand
} from "@/types/api.types";

/**
 * Register a new user.
 * @param payload - User registration data (email and password)
 * @returns Registered user data (email only)
 * @throws API error with status and data
 */
export async function registerUser(
  payload: RegisterUserCommand
): Promise<RegisteredUserDto> {
  const { data } = await http.post<RegisteredUserDto>("/register/", payload);
  return data;
}

/**
 * Authenticate user and obtain JWT tokens.
 * @param payload - Login credentials (email and password)
 * @returns JWT access and refresh tokens
 * @throws API error with status and data (401 for invalid credentials)
 */
export async function loginUser(
  payload: LoginUserCommand
): Promise<AuthTokensDto> {
  const { data } = await http.post<AuthTokensDto>("/token/", payload);
  return data;
}

/**
 * Refresh the access token using a refresh token.
 * @param refreshToken - The refresh token
 * @returns New access token
 * @throws API error if refresh token is invalid or expired
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<{ access: string }> {
  const { data } = await http.post<{ access: string }>("/token/refresh/", {
    refresh: refreshToken,
  });
  return data;
}

/**
 * Get the current user's profile.
 * @returns User profile data including selected platforms
 * @throws API error with status and data
 */
export async function getUserProfile(): Promise<UserProfileDto> {
  const { data } = await http.get<UserProfileDto>("/me/");
  return data;
}

/**
 * Delete the current user's account (RODO-compliant permanent deletion).
 * @returns Promise that resolves when account is deleted
 * @throws API error with status and data
 */
export async function deleteAccount(): Promise<void> {
  await http.delete("/me/");
}

/**
 * Change password request payload.
 */
export type ChangePasswordCommand = {
  current_password: string;
  new_password: string;
};

/**
 * Change password response.
 */
export type ChangePasswordResponse = {
  message: string;
};

/**
 * Change the current user's password.
 * Requires current password for verification and new password meeting security requirements.
 * @param payload - Password change data (current_password, new_password)
 * @returns Success message
 * @throws API error with status and data
 */
export async function changePassword(
  payload: ChangePasswordCommand
): Promise<ChangePasswordResponse> {
  const { data } = await http.post<ChangePasswordResponse>("/me/change-password/", payload);
  return data;
}

// Password reset types
export type ForgotPasswordResponse = {
  message: string;
};

export type ValidateResetTokenResponse = {
  message: string;
};

export type ResetPasswordConfirmResponse = {
  message: string;
};

/**
 * Initiate password reset process by sending reset email.
 * @param payload - Email address for password reset
 * @returns Success message
 * @throws API error with status and data
 */
export async function forgotPassword(
  payload: ForgotPasswordCommand
): Promise<ForgotPasswordResponse> {
  const { data } = await http.post<ForgotPasswordResponse>("/password-reset/", payload);
  return data;
}

/**
 * Validate password reset token.
 * @param payload - UID and token from reset email
 * @returns Success message if token is valid
 * @throws API error with status and data (400 if invalid)
 */
export async function validateResetToken(
  payload: ValidateResetTokenCommand
): Promise<ValidateResetTokenResponse> {
  const { data } = await http.post<ValidateResetTokenResponse>("/password-reset/validate_token/", payload);
  return data;
}

/**
 * Confirm password reset with new password.
 * @param payload - UID, token, and new password
 * @returns Success message
 * @throws API error with status and data
 */
export async function resetPasswordConfirm(
  payload: ResetPasswordConfirmCommand
): Promise<ResetPasswordConfirmResponse> {
  const { data } = await http.post<ResetPasswordConfirmResponse>("/password-reset/confirm/", payload);
  return data;
}