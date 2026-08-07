/** Safe http(s) URL policy for Course Manifest V1 media/resources. */

const BLOCKED_SCHEMES = [
  "javascript:",
  "data:",
  "file:",
  "vbscript:",
  "umtuba-package:",
] as const;

export function isSafeHttpUrl(raw: unknown, maxLen = 2048): boolean {
  if (typeof raw !== "string") return false;
  const url = raw.trim();
  if (!url || url.length > maxLen) return false;
  const lower = url.toLowerCase();
  for (const scheme of BLOCKED_SCHEMES) {
    if (lower.startsWith(scheme)) return false;
  }
  if (!(lower.startsWith("https://") || lower.startsWith("http://"))) {
    return false;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    if (!parsed.hostname) return false;
    return true;
  } catch {
    return false;
  }
}
