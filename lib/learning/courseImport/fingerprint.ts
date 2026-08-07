import { createHash } from "node:crypto";
import type { LearningCourseManifestV1 } from "./manifestTypes";

/** Stable fingerprint for idempotency / audit (no secrets). */
export function fingerprintCourseManifest(
  manifest: LearningCourseManifestV1
): string {
  return createHash("sha256").update(canonicalize(manifest)).digest("hex");
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`)
    .join(",")}}`;
}
