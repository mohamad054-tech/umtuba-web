import type { AiErrorCode } from "./types";

export class AiPlatformError extends Error {
  readonly code: AiErrorCode;
  constructor(code: AiErrorCode, message: string) {
    super(message);
    this.name = "AiPlatformError";
    this.code = code;
  }
}

const SECRET_LIKE =
  /\b(?:sk-[A-Za-z0-9_-]{8,}|AIza[0-9A-Za-z_-]{10,}|AQ\.[0-9A-Za-z_-]{10,})\b/g;

export function sanitizeAiErrorMessage(
  message: string | undefined,
  fallback = "AI request could not be completed."
): string {
  const raw = (message ?? "").trim();
  if (!raw) return fallback;
  const lower = raw.toLowerCase();
  if (
    lower.includes("api key") ||
    lower.includes("authorization") ||
    lower.includes("bearer ") ||
    lower.includes("x-goog-api-key") ||
    lower.includes("sk-") ||
    lower.includes("aiza") ||
    /\baq\./i.test(raw)
  ) {
    return "AI provider authentication failed.";
  }
  if (lower.includes("timeout") || lower.includes("etimedout")) {
    return "AI provider timed out.";
  }
  if (lower.includes("rate") && lower.includes("limit")) {
    return "AI rate limit reached. Try again shortly.";
  }
  const redacted = raw.replace(SECRET_LIKE, "[redacted]");
  if (redacted.length > 240) return `${redacted.slice(0, 237)}...`;
  return redacted;
}

export function failResult<T = never>(
  code: AiErrorCode,
  message: string
): { ok: false; code: AiErrorCode; message: string } {
  return { ok: false, code, message: sanitizeAiErrorMessage(message) };
}
