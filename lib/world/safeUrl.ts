const ALLOWED_SCHEMES = /^(https:\/\/|tel:|mailto:)/i;

/**
 * Allowlist for place outbound profile links.
 * Rejects javascript:, data:, http://, and protocol-relative URLs.
 */
export function sanitizeWorldOutboundUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const url = value.trim();
  if (!url || url.length < 4 || url.length > 1000) return null;
  if (/[\u0000-\u001f\u007f]/.test(url)) return null;
  if (!ALLOWED_SCHEMES.test(url)) return null;
  if (/^https:\/\//i.test(url)) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:") return null;
      return parsed.toString();
    } catch {
      return null;
    }
  }
  return url;
}
