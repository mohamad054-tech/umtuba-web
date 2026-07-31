/**
 * Safe metadata only — strip prompts, outputs, secrets from usage payloads.
 */

const FORBIDDEN_KEYS = new Set([
  "prompt",
  "rawprompt",
  "output",
  "rawoutput",
  "completion",
  "message",
  "messages",
  "apikey",
  "api_key",
  "authorization",
  "secret",
  "token",
  "password",
  "service_role",
  "servicerole",
]);

const SECRET_LIKE =
  /\b(?:sk-[A-Za-z0-9_-]{8,}|AIza[0-9A-Za-z_-]{10,}|AQ\.[0-9A-Za-z_-]{10,})\b/g;

const MAX_META_KEYS = 24;
const MAX_META_VALUE_LEN = 120;

export function redactUsageMetadata(
  input: Record<string, unknown> | null | undefined
): Record<string, string | number | boolean | null> {
  if (!input || typeof input !== "object") return {};
  const out: Record<string, string | number | boolean | null> = {};
  let count = 0;
  for (const [rawKey, value] of Object.entries(input)) {
    if (count >= MAX_META_KEYS) break;
    const key = rawKey.trim();
    const normalized = key.toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!key || FORBIDDEN_KEYS.has(normalized)) continue;
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      if (typeof value === "string") {
        const cleaned = value.replace(SECRET_LIKE, "[redacted]").slice(0, MAX_META_VALUE_LEN);
        out[key] = cleaned;
      } else {
        out[key] = value;
      }
      count += 1;
    }
  }
  return out;
}

export function assertNoPromptOrSecretFields(
  metadata: Record<string, unknown>
): string[] {
  const hits: string[] = [];
  for (const key of Object.keys(metadata)) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (FORBIDDEN_KEYS.has(normalized)) hits.push(key);
  }
  return hits;
}
