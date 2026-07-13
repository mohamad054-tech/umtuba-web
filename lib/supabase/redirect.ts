/**
 * Prevent open redirects: only same-origin relative paths are allowed.
 */
export function getSafeRedirectPath(
  candidate: string | null | undefined,
  fallback = "/discover"
): string {
  if (!candidate) {
    return fallback;
  }

  const value = candidate.trim();

  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    value.includes("://")
  ) {
    return fallback;
  }

  return value;
}
