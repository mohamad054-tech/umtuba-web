/**
 * Prevent open redirects: only same-origin relative paths are allowed.
 * Query/hash may contain `@` (e.g. creator handles); `@` is only rejected in the path.
 *
 * Auth `?next=` default (UAF-08 / user acceptance):
 * Fallback is `/profile` (personal profile resolver). Explicit `?next=`,
 * protected-route returns, and deep links (e.g. `/discover?post=`, `/messages`)
 * are preserved when present and safe. Open-redirect rejects still use this
 * fallback. Must stay aligned with AUTH_DEFAULT_NEXT_PATH / AUTH_SAFE_REDIRECT_DEFAULT_PATH.
 */
export function getSafeRedirectPath(
  candidate: string | null | undefined,
  fallback = "/profile"
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
