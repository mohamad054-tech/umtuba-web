import { createHash } from "crypto";

export function contentFingerprint(text: string): string {
  return createHash("sha256")
    .update(text.trim().replace(/\s+/g, " ").toLowerCase())
    .digest("hex");
}

export function findDuplicateFingerprints(
  fingerprints: string[]
): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const fp of fingerprints) {
    if (seen.has(fp)) dupes.add(fp);
    else seen.add(fp);
  }
  return [...dupes];
}
