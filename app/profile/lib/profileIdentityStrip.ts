/**
 * Creator Identity Strip V1 (CREATOR_SPACE_EXPERIENCE_V1 §4).
 * Under Hero, above tabs — role chips + optional interest teasers.
 * Specialties remain Hero Completeness (Header). No migrations / invented columns.
 */

/** Primary role chips shown on the strip (multi-role: up to two + overflow). */
export const PROFILE_IDENTITY_ROLE_CHIP_MAX = 2;

/** Optional interest teasers on the strip; full list stays on About. */
export const PROFILE_IDENTITY_INTEREST_TEASER_MAX = 2;

export type NormalizedRoleChips = {
  visible: string[];
  /** Count of additional roles beyond the visible primary chips. */
  overflowCount: number;
};

function normalizeLabels(
  values: readonly string[] | null | undefined,
  max: number
): string[] {
  if (!values?.length || max <= 0) {
    return [];
  }

  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of values) {
    const label = raw.trim();
    if (!label) {
      continue;
    }
    const key = label.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(label);
    if (out.length >= max) {
      break;
    }
  }

  return out;
}

/** Count unique non-empty labels (case-insensitive), uncapped. */
function countUniqueLabels(
  values: readonly string[] | null | undefined
): number {
  if (!values?.length) {
    return 0;
  }
  const seen = new Set<string>();
  for (const raw of values) {
    const label = raw.trim();
    if (!label) {
      continue;
    }
    seen.add(label.toLowerCase());
  }
  return seen.size;
}

/**
 * Up to two primary role chips + overflow count for "+N".
 * Empty / whitespace-only roles omit entirely.
 */
export function normalizeRoleChips(
  roles: readonly string[] | null | undefined
): NormalizedRoleChips {
  const visible = normalizeLabels(roles, PROFILE_IDENTITY_ROLE_CHIP_MAX);
  const total = countUniqueLabels(roles);
  return {
    visible,
    overflowCount: Math.max(0, total - visible.length),
  };
}

/** 0–2 interest teaser chips for the strip (About remains canonical). */
export function normalizeInterestTeasers(
  interests: readonly string[] | null | undefined
): string[] {
  return normalizeLabels(interests, PROFILE_IDENTITY_INTEREST_TEASER_MAX);
}

/** Strip renders only when at least one role or interest teaser exists. */
export function shouldShowIdentityStrip(input: {
  roles?: readonly string[] | null;
  interests?: readonly string[] | null;
}): boolean {
  const roles = normalizeRoleChips(input.roles);
  if (roles.visible.length > 0) {
    return true;
  }
  return normalizeInterestTeasers(input.interests).length > 0;
}
