/**
 * Normalize source strings for Translation Memory duplicate detection.
 */
export function normalizeSourceText(source: string): string {
  return source
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function sourceFingerprint(source: string): string {
  return normalizeSourceText(source);
}
