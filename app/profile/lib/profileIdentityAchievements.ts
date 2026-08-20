/**
 * Creator Identity Achievements V1 (CREATOR_SPACE_EXPERIENCE_V1 §4).
 * Optional small medals under identity / under Hero, above tabs.
 * Full list remains on About. No migrations / invented columns.
 */

/** Soft cap for medal chips shown in the identity zone. */
export const PROFILE_IDENTITY_ACHIEVEMENT_MEDAL_MAX = 3;

export type NormalizedAchievementMedals = {
  visible: string[];
  /** Count of additional achievements beyond visible medals. */
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
 * Up to three achievement medals + overflow count for "+N".
 * Empty / whitespace-only omit entirely.
 */
export function normalizeAchievementMedals(
  achievements: readonly string[] | null | undefined
): NormalizedAchievementMedals {
  const visible = normalizeLabels(
    achievements,
    PROFILE_IDENTITY_ACHIEVEMENT_MEDAL_MAX
  );
  const total = countUniqueLabels(achievements);
  return {
    visible,
    overflowCount: Math.max(0, total - visible.length),
  };
}

/** Medals strip renders only when at least one achievement label exists. */
export function shouldShowIdentityAchievements(
  achievements: readonly string[] | null | undefined
): boolean {
  return normalizeAchievementMedals(achievements).visible.length > 0;
}
