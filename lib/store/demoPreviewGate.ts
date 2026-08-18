/**
 * Safe QA gate for the in-memory DEMO catalog.
 * Default OFF. Never merges demo rows into the public live catalog.
 *
 * Enable:
 *   STORE_DEMO_PREVIEW=1
 * Then one of:
 *   - platform admin session
 *   - ?demo_token= matching STORE_DEMO_PREVIEW_TOKEN
 *   - non-production NODE_ENV (local/dev only)
 */

export type DemoPreviewAccessInput = {
  token?: string | null;
  isPlatformAdmin?: boolean;
  /** Test override only. Production callers omit this. */
  nodeEnv?: string;
};

export function isStoreDemoPreviewConfigured(): boolean {
  return process.env.STORE_DEMO_PREVIEW === "1";
}

export function demoPreviewTokenMatches(
  token: string | null | undefined
): boolean {
  const expected = process.env.STORE_DEMO_PREVIEW_TOKEN;
  if (!expected || !token) return false;
  return token === expected;
}

export function evaluateStoreDemoPreviewAccess(
  input: DemoPreviewAccessInput = {}
): { ok: boolean; reason: "admin" | "token" | "non-production" | "disabled" | "unauthorized" } {
  if (!isStoreDemoPreviewConfigured()) {
    return { ok: false, reason: "disabled" };
  }
  if (input.isPlatformAdmin) {
    return { ok: true, reason: "admin" };
  }
  if (demoPreviewTokenMatches(input.token)) {
    return { ok: true, reason: "token" };
  }
  const nodeEnv = input.nodeEnv ?? process.env.NODE_ENV;
  if (nodeEnv !== "production") {
    return { ok: true, reason: "non-production" };
  }
  return { ok: false, reason: "unauthorized" };
}

export function canAccessStoreDemoPreview(
  input: DemoPreviewAccessInput = {}
): boolean {
  return evaluateStoreDemoPreviewAccess(input).ok;
}
