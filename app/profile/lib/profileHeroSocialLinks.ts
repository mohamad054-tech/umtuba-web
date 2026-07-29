/**
 * Creator Hero Social Links V1 (CREATOR_SPACE_EXPERIENCE_V1 §3).
 * Website + optional social/external link row in Hero.
 * Uses existing about.website / about.links only — no migrations.
 */

import type { ProfileAboutLink } from "../types";

/** Soft cap for Hero social/external link chips (About remains canonical). */
export const PROFILE_HERO_SOCIAL_LINK_MAX = 4;

export type NormalizedHeroLink = {
  label: string;
  href: string;
};

/**
 * Build a safe external href. Adds https:// when scheme is missing.
 * Returns null for empty / whitespace-only input.
 */
export function toExternalHref(raw: string | null | undefined): string | null {
  const value = raw?.trim() ?? "";
  if (!value) {
    return null;
  }
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  // Block dangerous schemes; treat bare hosts/paths as https.
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    return null;
  }
  return `https://${value}`;
}

/** Display host/path without scheme for Hero website text. */
export function formatWebsiteLabel(raw: string | null | undefined): string | null {
  const href = toExternalHref(raw);
  if (!href) {
    return null;
  }
  return href.replace(/^https?:\/\//i, "");
}

/**
 * Normalize About links for Hero: trim, require label+href, dedupe by href,
 * soft-cap count. Empty list → hide row.
 */
export function normalizeHeroSocialLinks(
  links: readonly ProfileAboutLink[] | null | undefined
): NormalizedHeroLink[] {
  if (!links?.length) {
    return [];
  }

  const seen = new Set<string>();
  const out: NormalizedHeroLink[] = [];

  for (const link of links) {
    const label = link.label?.trim() ?? "";
    const href = toExternalHref(link.href);
    if (!label || !href) {
      continue;
    }
    const key = href.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push({ label, href });
    if (out.length >= PROFILE_HERO_SOCIAL_LINK_MAX) {
      break;
    }
  }

  return out;
}

export function shouldShowHeroWebsite(
  website: string | null | undefined
): boolean {
  return toExternalHref(website) != null;
}

export function shouldShowHeroSocialLinks(
  links: readonly ProfileAboutLink[] | null | undefined
): boolean {
  return normalizeHeroSocialLinks(links).length > 0;
}
