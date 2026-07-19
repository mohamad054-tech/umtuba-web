import { sanitizeUserFacingMessage } from "../../app/lib/product/userFacingMessage";
import { createClient } from "./client";
import { getErrorMessage, isValidEmail, validatePassword } from "./validation";

export const PASSWORD_RESET_UPDATE_PATH = "/auth/update-password";
export const PASSWORD_RESET_CALLBACK_PATH = "/auth/callback";
export const FORGOT_PASSWORD_PATH = "/forgot-password";

/** Generic success copy — avoids email enumeration. */
export const PASSWORD_RESET_REQUEST_SUCCESS =
  "If an account exists for that email, we sent a password reset link. Check your inbox and spam folder.";

export function buildPasswordResetRedirectTo(origin: string): string {
  const base = origin.replace(/\/$/, "");
  const next = encodeURIComponent(PASSWORD_RESET_UPDATE_PATH);
  return `${base}${PASSWORD_RESET_CALLBACK_PATH}?next=${next}`;
}

export function mapPasswordResetError(
  error: unknown,
  fallback = "Unable to reset your password. Please try again."
): string {
  const message = getErrorMessage(error, "").toLowerCase();

  if (
    message.includes("same password") ||
    message.includes("should be different") ||
    message.includes("different from the old password")
  ) {
    return "Choose a different password than your current one.";
  }

  if (
    message.includes("expired") ||
    message.includes("otp_expired") ||
    message.includes("flow_state") ||
    message.includes("invalid login") ||
    message.includes("session missing") ||
    message.includes("auth session missing") ||
    message.includes("not authenticated") ||
    message.includes("jwt")
  ) {
    return "This reset link is invalid or has expired. Request a new one.";
  }

  if (message.includes("rate limit") || message.includes("too many")) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  return sanitizeUserFacingMessage(
    getErrorMessage(error, fallback),
    fallback
  );
}

export function mapPasswordResetLinkError(
  errorCode: string | null | undefined,
  errorDescription: string | null | undefined
): string {
  const code = (errorCode || "").toLowerCase();
  const description = (errorDescription || "").toLowerCase();

  if (
    code.includes("otp_expired") ||
    description.includes("expired") ||
    code === "access_denied"
  ) {
    return "This reset link is invalid or has expired. Request a new one.";
  }

  if (code || description) {
    return "This reset link could not be verified. Request a new one.";
  }

  return "This reset link is invalid or has expired. Request a new one.";
}

/** Auth callback failures that are not password-reset recovery. */
export function mapSignInLinkError(
  errorCode: string | null | undefined,
  errorDescription: string | null | undefined
): string {
  const code = (errorCode || "").toLowerCase();
  const description = (errorDescription || "").toLowerCase();

  if (
    code.includes("otp_expired") ||
    description.includes("expired") ||
    code === "access_denied"
  ) {
    return "This sign-in link is invalid or has expired. Please try again.";
  }

  if (code || description) {
    return "This sign-in link could not be verified. Please try again.";
  }

  return "This sign-in link is invalid or has expired. Please try again.";
}

/**
 * Request a password-reset email. Always resolves with the same success message
 * when the request is accepted (or when Supabase hides existence).
 */
export async function requestPasswordReset(email: string): Promise<{
  ok: true;
  message: string;
}> {
  const trimmed = email.trim();
  if (!trimmed) {
    throw new Error("Email is required.");
  }
  if (!isValidEmail(trimmed)) {
    throw new Error("Enter a valid email address.");
  }

  if (typeof window === "undefined") {
    throw new Error("Password reset must be requested from the browser.");
  }

  const supabase = createClient();
  const redirectTo = buildPasswordResetRedirectTo(window.location.origin);

  const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
    redirectTo,
  });

  if (error) {
    throw new Error(mapPasswordResetError(error, "Unable to send reset email."));
  }

  return { ok: true, message: PASSWORD_RESET_REQUEST_SUCCESS };
}

export async function updatePasswordWithSession(password: string): Promise<void> {
  const passwordError = validatePassword(password);
  if (passwordError) {
    throw new Error(passwordError);
  }

  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error(
      "This reset link is invalid or has expired. Request a new one."
    );
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    throw new Error(mapPasswordResetError(error));
  }
}

/** End the recovery/session after a successful password change. */
export async function signOutAfterPasswordReset(): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(
      mapPasswordResetError(
        error,
        "Password updated, but we could not end the reset session. Please sign out, then sign in again."
      )
    );
  }
}
