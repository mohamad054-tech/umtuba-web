/**
 * Prevent open redirects: only same-origin relative paths are allowed.
 * Query/hash may contain `@` (e.g. creator handles); `@` is only rejected in the path.
 */
export function getSafeRedirectPath(
  candidate: string | null | undefined,
  fallback = "/discover"
): string {
  if (!candidate) {
    return fallback;
  }

  let value = candidate.trim();
  if (!value) {
    return fallback;
  }

  // Decode once so encoded `//` / scheme tricks cannot bypass checks.
  try {
    value = decodeURIComponent(value);
  } catch {
    return fallback;
  }

  value = value.trim();

  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    value.includes("://")
  ) {
    return fallback;
  }

  const pathOnly = value.split(/[?#]/, 1)[0] ?? value;
  if (pathOnly.includes("@")) {
    return fallback;
  }

  // Reject control characters and accidental whitespace in paths.
  if (/[\u0000-\u001F\u007F\s]/.test(value)) {
    return fallback;
  }

  return value;
}
