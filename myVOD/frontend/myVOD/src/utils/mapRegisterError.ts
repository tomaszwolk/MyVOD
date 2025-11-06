import type { RegisterApiError, RegisterErrorUI } from "@/types/form.types";

type ErrorPayload = RegisterApiError & {
  detail?: unknown;
  message?: unknown;
};

const pickFirstMessage = (value: unknown): string | undefined => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  if (Array.isArray(value)) {
    const firstString = value.find(
      (item): item is string => typeof item === "string" && item.trim().length > 0
    );
    if (firstString) {
      return firstString;
    }
  }

  return undefined;
};

const extractPayload = (error: unknown): ErrorPayload | null => {
  if (!error) {
    return null;
  }

  if (typeof error === "string") {
    return { error };
  }

  if (typeof error !== "object") {
    return null;
  }

  const raw = error as Record<string, unknown> & {
    response?: { data?: unknown };
    data?: unknown;
    message?: unknown;
  };

  const responseData = raw.response && typeof raw.response === "object"
    ? (raw.response as { data?: unknown }).data
    : undefined;

  const directData = raw.data;

  const candidate = responseData ?? directData ?? raw;

  if (!candidate || typeof candidate !== "object") {
    const message = typeof raw.message === "string" ? raw.message : undefined;
    return message ? { error: message } : null;
  }

  return candidate as ErrorPayload;
};

const getMessageForField = (payload: ErrorPayload | null, field: string): string | undefined => {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }
  const record = payload as Record<string, unknown>;
  return pickFirstMessage(record[field]);
};

/**
 * Maps API error response to UI-friendly error structure.
 * Handles nested Axios-like shapes and string fallbacks safely.
 */
export function mapRegisterError(error: unknown): RegisterErrorUI {
  const result: RegisterErrorUI = {};
  const payload = extractPayload(error);

  if (!payload) {
    result.global = "Wystąpił nieoczekiwany błąd";
    return result;
  }

  // Try to extract field-specific errors
  const emailMessage = getMessageForField(payload, "email");
  const passwordMessage = getMessageForField(payload, "password");
  const globalMessage =
    getMessageForField(payload, "error") ||
    pickFirstMessage((payload as { detail?: unknown }).detail) ||
    pickFirstMessage(payload.message);

  if (emailMessage) {
    result.email = emailMessage;
  }

  if (passwordMessage) {
    result.password = passwordMessage;
  }

  if (globalMessage) {
    result.global = globalMessage;
  }

  if (!result.email && !result.password && !result.global) {
    const fallback =
      typeof error === "object" && error !== null
        ? pickFirstMessage((error as { message?: unknown }).message)
        : undefined;
    result.global = fallback ?? "Nie udało się utworzyć konta. Spróbuj ponownie później.";
  }

  return result;
}

