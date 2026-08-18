/**
 * Private QA gate for the in-memory DEMO catalog.
 * Never merges demo rows into the public live catalog.
 *
 * Authorized only when:
 *   - signed-in platform admin (`platform_admins` / `is_platform_admin`), or
 *   - a non-guessable STORE_DEMO_PREVIEW_TOKEN (query on first visit, then
 *     httpOnly cookie set by /store/demo-preview/enter)
 *
 * Anonymous visitors are denied even if they know /store/demo-preview.
 * STORE_DEMO_PREVIEW=1 alone does not grant access.
 * NODE_ENV !== production is not a grant.
 */

import { createHash, timingSafeEqual } from "node:crypto";

export const DEMO_PREVIEW_PATH = "/store/demo-preview";
export const DEMO_PREVIEW_ENTER_PATH = "/store/demo-preview/enter";
export const DEMO_PREVIEW_SESSION_COOKIE = "umtuba_store_demo_preview";
export const DEMO_PREVIEW_MIN_TOKEN_LENGTH = 16;
export const DEMO_PREVIEW_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

export type DemoPreviewAccessReason =
  | "admin"
  | "token"
  | "unauthorized";

export type DemoPreviewAccessResult = {
  ok: boolean;
  reason: DemoPreviewAccessReason;
  viaCookie: boolean;
};

export type DemoPreviewAccessInput = {
  token?: string | null;
  cookieToken?: string | null;
  isPlatformAdmin?: boolean;
};

export function configuredDemoPreviewToken(): string | null {
  const expected = process.env.STORE_DEMO_PREVIEW_TOKEN;
  if (!expected || expected.length < DEMO_PREVIEW_MIN_TOKEN_LENGTH) {
    return null;
  }
  return expected;
}

export function demoPreviewSessionCookieValue(): string | null {
  const expected = configuredDemoPreviewToken();
  if (!expected) return null;
  return createHash("sha256").update(expected, "utf8").digest("hex");
}

function hashesEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");
  if (a.length !== b.length) {
    timingSafeEqual(a, a);
    return false;
  }
  return timingSafeEqual(a, b);
}

export function demoPreviewTokenMatches(
  token: string | null | undefined
): boolean {
  const expected = configuredDemoPreviewToken();
  if (!expected || !token) return false;
  const left = createHash("sha256").update(expected, "utf8").digest("hex");
  const right = createHash("sha256").update(token, "utf8").digest("hex");
  return hashesEqual(left, right);
}

export function demoPreviewCookieMatches(
  cookie: string | null | undefined
): boolean {
  const expected = demoPreviewSessionCookieValue();
  if (!expected || !cookie) return false;
  return hashesEqual(expected, cookie);
}

export function evaluateStoreDemoPreviewAccess(
  input: DemoPreviewAccessInput = {}
): DemoPreviewAccessResult {
  if (input.isPlatformAdmin) {
    return { ok: true, reason: "admin", viaCookie: false };
  }
  if (demoPreviewTokenMatches(input.token)) {
    return { ok: true, reason: "token", viaCookie: false };
  }
  if (demoPreviewCookieMatches(input.cookieToken)) {
    return { ok: true, reason: "token", viaCookie: true };
  }
  return { ok: false, reason: "unauthorized", viaCookie: false };
}

export function canAccessStoreDemoPreview(
  input: DemoPreviewAccessInput = {}
): boolean {
  return evaluateStoreDemoPreviewAccess(input).ok;
}

export function demoPreviewTokenQuery(
  access: DemoPreviewAccessResult,
  queryToken?: string | null
): string {
  if (!access.ok || access.reason !== "token" || access.viaCookie) return "";
  if (!queryToken) return "";
  return `demo_token=${encodeURIComponent(queryToken)}`;
}

export function safeDemoPreviewNext(
  candidate: string | null | undefined
): string {
  const fallback = DEMO_PREVIEW_PATH;
  if (!candidate) return fallback;

  let value = candidate.trim();
  if (!value) return fallback;

  try {
    value = decodeURIComponent(value);
  } catch {
    return fallback;
  }
  value = value.trim();

  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    value.includes("://")
  ) {
    return fallback;
  }

  const pathOnly = value.split(/[?#]/, 1)[0] ?? value;
  if (
    pathOnly.includes("@") ||
    /[\u0000-\u001F\u007F\s]/.test(value) ||
    pathOnly === DEMO_PREVIEW_ENTER_PATH ||
    pathOnly.startsWith(`${DEMO_PREVIEW_ENTER_PATH}/`)
  ) {
    return fallback;
  }

  if (
    pathOnly !== DEMO_PREVIEW_PATH &&
    !pathOnly.startsWith(`${DEMO_PREVIEW_PATH}/`)
  ) {
    return fallback;
  }

  const [path, rest = ""] = value.split("?", 2);
  const query = rest.split("#", 1)[0] ?? "";
  const params = new URLSearchParams(query);
  params.delete("demo_token");
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

export function demoPreviewCookieOptions(): {
  httpOnly: true;
  secure: boolean;
  sameSite: "strict";
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: DEMO_PREVIEW_PATH,
    maxAge: DEMO_PREVIEW_SESSION_MAX_AGE_SECONDS,
  };
}
