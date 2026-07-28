import type { AiErrorCode } from "./types";

export class AiPlatformError extends Error {
  readonly code: AiErrorCode;
  constructor(code: AiErrorCode, message: string) {
    super(message);
    this.name = "AiPlatformError";
    this.code = code;
  }
}

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
    lower.includes("sk-")
  ) {
    return "AI provider authentication failed.";
  }
  if (lower.includes("timeout") || lower.includes("etimedout")) {
    return "AI provider timed out.";
  }
  if (lower.includes("rate") && lower.includes("limit")) {
    return "AI rate limit reached. Try again shortly.";
  }
  if (raw.length > 240) return `${raw.slice(0, 237)}...`;
  return raw;
}

export function failResult<T = never>(
  code: AiErrorCode,
  message: string
): { ok: false; code: AiErrorCode; message: string } {
  return { ok: false, code, message: sanitizeAiErrorMessage(message) };
}
