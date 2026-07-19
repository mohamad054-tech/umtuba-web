/**
 * Pure auth-gate decisions for middleware/proxy.
 * Separated so fail-closed behavior is unit-testable without Next runtime.
 */

import type { SupabasePublicEnvResult } from "./supabasePublic";

export const PROTECTED_PREFIXES = [
  "/messages",
  "/notifications",
  "/settings",
  "/create",
  "/saved",
  "/rewards",
  "/creator",
  "/seller",
  "/store/cart",
  "/store/wishlist",
  "/admin",
  // Advertise account surfaces (public landing `/advertise` stays open via isProtectedPath).
  "/advertise/apply",
  "/advertise/dashboard",
  "/advertise/campaigns",
  "/advertise/creatives",
  "/advertise/settings",
] as const;

export function isProtectedPath(pathname: string): boolean {
  // Keep the public advertise marketing page open; protect nested account routes.
  if (pathname === "/advertise") {
    return false;
  }
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/** Auth UX routes that should 503 when Supabase public config is missing. */
export function isAuthPath(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/auth/update-password" ||
    pathname === "/auth/callback" ||
    pathname.startsWith("/auth/callback/")
  );
}

/**
 * Routes where an already-authenticated user should be redirected away
 * (not including password update — recovery sessions must stay).
 */
export function isAuthEntryPath(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/register" ||
    pathname === "/forgot-password"
  );
}

export type AuthGateDecision =
  | { action: "continue_without_session" }
  | { action: "service_unavailable"; forPath: "protected" | "auth" | "public" }
  | { action: "check_session" };

/**
 * Decide how middleware should proceed before (or instead of) calling Supabase.
 *
 * Fail-closed rules:
 * - Invalid/missing config + protected path → service unavailable (never allow)
 * - Invalid/missing config + auth path → service unavailable (avoid broken login loops)
 * - Invalid/missing config + other public path → continue without session checks
 * - Valid config → proceed to session verification
 */
export function decideAuthGate(
  pathname: string,
  config: SupabasePublicEnvResult
): AuthGateDecision {
  if (config.ok) {
    return { action: "check_session" };
  }

  if (isProtectedPath(pathname)) {
    return { action: "service_unavailable", forPath: "protected" };
  }

  if (isAuthPath(pathname)) {
    return { action: "service_unavailable", forPath: "auth" };
  }

  return { action: "continue_without_session" };
}

export function serviceUnavailableTitle(forPath: "protected" | "auth" | "public"): string {
  if (forPath === "protected") {
    return "Service unavailable";
  }
  if (forPath === "auth") {
    return "Sign-in unavailable";
  }
  return "Service unavailable";
}

export function serviceUnavailableBody(forPath: "protected" | "auth" | "public"): string {
  if (forPath === "protected") {
    return "This area is temporarily unavailable because authentication is not configured. Please try again later.";
  }
  if (forPath === "auth") {
    return "Sign-in is temporarily unavailable because authentication is not configured. Please try again later.";
  }
  return "UMTUBA is temporarily unavailable. Please try again later.";
}
