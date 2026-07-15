import "server-only";
import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import {
  REFERRAL_ATTRIBUTION_TTL_SECONDS,
  REFERRAL_COOKIE_NAME,
  REFERRAL_VISITOR_COOKIE,
  normalizeReferralCode,
} from "./config";

/**
 * Cookie / state policy (Growth Mode referral attribution):
 *
 * | Cookie        | httpOnly | sameSite | secure (prod) | maxAge        | Purpose                          |
 * |---------------|----------|----------|---------------|---------------|----------------------------------|
 * | umtuba_ref    | yes      | lax      | yes           | 30 days       | First-touch invite code          |
 * | umtuba_vid    | yes      | lax      | yes           | 365 days      | Anonymous visitor id for binding |
 *
 * - First-touch: never overwrite a valid umtuba_ref.
 * - Survives email-confirm delays within the 30-day attribution TTL (same browser).
 * - Cleared only after authoritative claim success or a final invalid result
 *   (see claimPolicy.ts). Visitor id is retained for risk signals.
 * - Not readable from client JS (httpOnly) — claim runs on the server.
 */

export function hashReferralSignal(
  value: string | null | undefined
): string | null {
  if (!value || !value.trim()) return null;
  return createHash("sha256").update(value.trim()).digest("hex").slice(0, 32);
}

export function referralCookieOptions(
  maxAge = REFERRAL_ATTRIBUTION_TTL_SECONDS
) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export async function readReferralAttributionCookie(): Promise<string | null> {
  const jar = await cookies();
  return normalizeReferralCode(jar.get(REFERRAL_COOKIE_NAME)?.value);
}

/** Existing visitor id only — never invents an id without persisting it. */
export async function readVisitorId(): Promise<string | null> {
  const jar = await cookies();
  const existing = jar.get(REFERRAL_VISITOR_COOKIE)?.value?.trim();
  if (existing && existing.length >= 8) {
    return existing;
  }
  return null;
}

/**
 * Read visitor id or create + persist one (365-day cookie).
 * Prefer this when recording attribution so the id survives confirm/login.
 */
export async function ensureVisitorId(): Promise<string> {
  const existing = await readVisitorId();
  if (existing) return existing;

  const jar = await cookies();
  const id = randomBytes(16).toString("hex");
  jar.set(
    REFERRAL_VISITOR_COOKIE,
    id,
    referralCookieOptions(365 * 24 * 60 * 60)
  );
  return id;
}

/** @deprecated Use ensureVisitorId — kept for call-site compatibility. */
export async function readOrCreateVisitorId(): Promise<string> {
  return ensureVisitorId();
}

/** True when a server claim attempt is warranted (code cookie present). */
export async function hasReferralCodeCookie(): Promise<boolean> {
  return Boolean(await readReferralAttributionCookie());
}

/**
 * Clear first-touch invite code after success / final invalid claim.
 * Does not clear umtuba_vid.
 */
export async function clearReferralAttributionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(REFERRAL_COOKIE_NAME, "", {
    ...referralCookieOptions(0),
    maxAge: 0,
  });
}

export async function setReferralAttributionCookie(code: string): Promise<boolean> {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return false;
  const jar = await cookies();
  const existing = normalizeReferralCode(jar.get(REFERRAL_COOKIE_NAME)?.value);
  if (existing) return false;
  jar.set(
    REFERRAL_COOKIE_NAME,
    normalized,
    referralCookieOptions(REFERRAL_ATTRIBUTION_TTL_SECONDS)
  );
  return true;
}
