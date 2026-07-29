/**
 * Best-effort in-memory dedupe for personalization wiring (no DB).
 */

const seen = new Map<string, number>();
const MAX_KEYS = 5_000;

export function resetVideoSignalWiringDedupe(): void {
  seen.clear();
}

/**
 * Returns true if this key is new (should ingest).
 * Returns false if duplicate within ttlMs.
 */
export function claimVideoSignalDedupeKey(
  key: string,
  ttlMs = 6 * 60 * 60 * 1000
): boolean {
  const now = Date.now();
  const existing = seen.get(key);
  if (existing != null && existing > now) {
    return false;
  }
  seen.set(key, now + ttlMs);
  if (seen.size > MAX_KEYS) {
    for (const [k, exp] of seen) {
      if (exp <= now) seen.delete(k);
      if (seen.size <= MAX_KEYS * 0.8) break;
    }
    // Hard trim oldest if still oversized
    if (seen.size > MAX_KEYS) {
      const drop = seen.size - Math.floor(MAX_KEYS * 0.8);
      let i = 0;
      for (const k of seen.keys()) {
        seen.delete(k);
        i += 1;
        if (i >= drop) break;
      }
    }
  }
  return true;
}
