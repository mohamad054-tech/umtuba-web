/**
 * Private QA gate for the full business sandbox.
 * Same policy as the tightened Store demo-preview access:
 *   - signed-in platform admin, or
 *   - a non-guessable SANDBOX_BUSINESS_PREVIEW_TOKEN (query then httpOnly cookie)
 *
 * Anonymous visitors are denied even if they know the path.
 * STORE_DEMO_PREVIEW=1 alone does not grant access.
 * NODE_ENV !== production is not a grant.
 */

import { createHash, timingSafeEqual } from "node:crypto";
import {
  SANDBOX_ENTER_PATH,
  SANDBOX_MIN_TOKEN_LENGTH,
  SANDBOX_PATH,
  SANDBOX_SESSION_MAX_AGE_SECONDS,
} from "../paths";

export type SandboxAccessReason = "admin" | "token" | "unauthorized";

export type SandboxAccessResult = {
  ok: boolean;
  reason: SandboxAccessReason;
  viaCookie: boolean;
};

export type SandboxAccessInput = {
  token?: string | null;
  cookieToken?: string | null;
  isPlatformAdmin?: boolean;
};

export function configuredSandboxToken(): string | null {
  const expected = process.env.SANDBOX_BUSINESS_PREVIEW_TOKEN;
  if (!expected || expected.length < SANDBOX_MIN_TOKEN_LENGTH) {
    return null;
  }
  return expected;
}

export function sandboxSessionCookieValue(): string | null {
  const expected = configuredSandboxToken();
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

export function sandboxTokenMatches(token: string | null | undefined): boolean {
  const expected = configuredSandboxToken();
  if (!expected || !token) return false;
  const left = createHash("sha256").update(expected, "utf8").digest("hex");
  const right = createHash("sha256").update(token, "utf8").digest("hex");
  return hashesEqual(left, right);
}

export function sandboxCookieMatches(cookie: string | null | undefined): boolean {
  const expected = sandboxSessionCookieValue();
  if (!expected || !cookie) return false;
  return hashesEqual(expected, cookie);
}

export function evaluateSandboxAccess(
  input: SandboxAccessInput = {}
): SandboxAccessResult {
  if (input.isPlatformAdmin) {
    return { ok: true, reason: "admin", viaCookie: false };
  }
  if (sandboxTokenMatches(input.token)) {
    return { ok: true, reason: "token", viaCookie: false };
  }
  if (sandboxCookieMatches(input.cookieToken)) {
    return { ok: true, reason: "token", viaCookie: true };
  }
  return { ok: false, reason: "unauthorized", viaCookie: false };
}

export function canAccessBusinessSandbox(
  input: SandboxAccessInput = {}
): boolean {
  return evaluateSandboxAccess(input).ok;
}

export function safeSandboxNext(candidate: string | null | undefined): string {
  const fallback = SANDBOX_PATH;
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
    pathOnly === SANDBOX_ENTER_PATH ||
    pathOnly.startsWith(`${SANDBOX_ENTER_PATH}/`)
  ) {
    return fallback;
  }

  if (pathOnly !== SANDBOX_PATH && !pathOnly.startsWith(`${SANDBOX_PATH}/`)) {
    return fallback;
  }

  const [path, rest = ""] = value.split("?", 2);
  const query = rest.split("#", 1)[0] ?? "";
  const params = new URLSearchParams(query);
  params.delete("sandbox_token");
  params.delete("demo_token");
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

export function sandboxCookieOptions(): {
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
    path: SANDBOX_PATH,
    maxAge: SANDBOX_SESSION_MAX_AGE_SECONDS,
  };
}
