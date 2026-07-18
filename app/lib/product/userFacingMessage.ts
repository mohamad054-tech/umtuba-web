/**
 * Sanitize user-facing error/empty copy. Never surface SQL, stacks, env, or paths.
 */

const TECHNICAL_PATTERN =
  /\b(sql|supabase|postgres|stack|traceback|exception|enoent|econnrefused|typescript|\.ts\b|\.tsx\b|\.js\b|node_modules|process\.env|secret|jwt|authorization|rls|api[_-]?key|service[_-]?role)\b|_KEY\b|SUPABASE_/i;

const DEFAULT_ERROR_MESSAGE =
  "Something went wrong. Please try again.";

export function sanitizeUserFacingMessage(
  message: string | null | undefined,
  fallback: string = DEFAULT_ERROR_MESSAGE
): string {
  const trimmed = (message ?? "").trim();
  if (!trimmed) {
    return fallback;
  }
  if (TECHNICAL_PATTERN.test(trimmed)) {
    return fallback;
  }
  if (trimmed.length > 180) {
    return fallback;
  }
  return trimmed;
}

export const FRIENDLY_LOAD_ERROR =
  "Couldn't load this right now. Please try again.";
