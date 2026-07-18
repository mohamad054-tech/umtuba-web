import { sanitizeUserFacingMessage } from "../../app/lib/product/userFacingMessage";
import { getErrorMessage } from "./validation";

const AUTH_FALLBACK = "Something went wrong. Please try again.";

/**
 * Map auth/session errors to safe UI copy.
 * Prefer known product phrasing; never leak JWT/SQL/config details.
 */
export function toAuthUserFacingMessage(
  error: unknown,
  fallback: string = AUTH_FALLBACK
): string {
  const raw = getErrorMessage(error, "").trim();
  if (!raw) {
    return fallback;
  }

  const lower = raw.toLowerCase();

  if (
    lower.includes("invalid login") ||
    lower.includes("invalid credentials") ||
    lower.includes("email not confirmed") ||
    lower.includes("invalid email or password")
  ) {
    if (lower.includes("email not confirmed")) {
      return "Confirm your email before signing in. Check your inbox for the link.";
    }
    return "Invalid email or password. Try again.";
  }

  if (lower.includes("user already registered") || lower.includes("already been registered")) {
    return "An account with that email already exists. Sign in instead.";
  }

  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  if (
    lower.includes("network") ||
    lower.includes("fetch failed") ||
    lower.includes("failed to fetch")
  ) {
    return "Network issue. Check your connection and try again.";
  }

  return sanitizeUserFacingMessage(raw, fallback);
}
