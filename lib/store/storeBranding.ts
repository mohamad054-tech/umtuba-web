/**
 * Store branding helpers for public shop profiles.
 * logo_path / cover_path may be http(s) URLs (ops/seed) or opaque storage keys.
 * Only safe http(s) URLs are rendered as images; storage keys fall back to
 * gradient/initials until a dedicated branding media signer ships.
 */

export function isSafeStoreBrandingUrl(value: string | null | undefined): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2048) return false;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }
  return parsed.protocol === "http:" || parsed.protocol === "https:";
}
