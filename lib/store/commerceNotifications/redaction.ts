import type { CommerceSafeMetadata } from "./types";

const BLOCKED_KEY_PARTS = [
  "secret",
  "password",
  "token",
  "authorization",
  "stripe",
  "sk_live",
  "sk_test",
  "pk_live",
  "pk_test",
  "whsec",
  "card",
  "cvv",
  "pan",
  "client_secret",
  "service_role",
];

export function redactCommerceMetadata(
  input: Record<string, unknown> | null | undefined
): CommerceSafeMetadata {
  const out: CommerceSafeMetadata = {};
  if (!input) return out;
  for (const [key, value] of Object.entries(input)) {
    const lower = key.toLowerCase();
    if (BLOCKED_KEY_PARTS.some((p) => lower.includes(p))) continue;
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      if (typeof value === "string" && value.length > 200) {
        out[key] = `${value.slice(0, 200)}…`;
      } else {
        out[key] = value;
      }
    }
  }
  return out;
}

export function assertNoSensitiveMetadata(meta: CommerceSafeMetadata): void {
  const blob = JSON.stringify(meta).toLowerCase();
  for (const part of ["sk_live_", "sk_test_", "whsec_", "service_role"]) {
    if (blob.includes(part)) {
      throw new Error("Sensitive payment metadata is not allowed.");
    }
  }
}
