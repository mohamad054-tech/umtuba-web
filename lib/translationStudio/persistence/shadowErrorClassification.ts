/**
 * Classify shadow dual-write failures without leaking secrets.
 */

import type { StudioShadowErrorCategory } from "./shadowObserver";

export function classifyStudioShadowError(
  err: unknown
): { category: Exclude<StudioShadowErrorCategory, "success">; message: string } {
  const message =
    err instanceof Error
      ? sanitizeShadowErrorMessage(err.message)
      : "Unknown shadow write error";
  const lower = message.toLowerCase();

  if (
    (err instanceof Error && (err as { code?: string }).code === "TIMEOUT") ||
    lower.includes("timed out") ||
    lower.includes("timeout")
  ) {
    return { category: "timeout", message };
  }

  if (
    lower.includes("authentication required") ||
    lower.includes("not allowed") ||
    lower.includes("platform admin") ||
    lower.includes("unauthorized") ||
    lower.includes("forbidden") ||
    /\b401\b/.test(lower) ||
    /\b403\b/.test(lower)
  ) {
    return { category: "auth", message };
  }

  if (
    lower.includes("invalid rpc response") ||
    lower.includes("ok must be true") ||
    lower.includes("schema_version") ||
    lower.includes("object required")
  ) {
    return { category: "invalid_response", message };
  }

  if (
    lower.includes("translation_studio_upsert_snapshot failed") ||
    lower.includes("studio db save failed (response)") ||
    lower.includes("rpc")
  ) {
    return { category: "rpc", message };
  }

  if (
    lower.includes("studio db save failed (transport)") ||
    lower.includes("network") ||
    lower.includes("fetch failed") ||
    lower.includes("econnreset") ||
    lower.includes("etimedout")
  ) {
    return { category: "transport", message };
  }

  return { category: "transport", message };
}

export function isRetryableStudioShadowCategory(
  category: Exclude<StudioShadowErrorCategory, "success">
): boolean {
  return category === "transport" || category === "timeout";
}

function sanitizeShadowErrorMessage(raw: string): string {
  return raw
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, "Bearer [redacted]")
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[redacted-jwt]")
    .replace(/service_role/gi, "[redacted-role]")
    .slice(0, 400);
}
