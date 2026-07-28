/**
 * Creator Space Hero Completeness V1 (CREATOR_SPACE_EXPERIENCE_V1 §3 / §4).
 * Pure helpers — read-only chips + bio expand gate; no migrations or new columns.
 */

/** Soft cap for Hero specialty chips (Creator Space §4). */
export const PROFILE_HERO_SPECIALTY_CHIP_MAX = 3;

/**
 * Character threshold for showing more/less with line-clamp-3.
 * Short bios render fully without a toggle.
 */
export const PROFILE_HERO_BIO_EXPAND_MIN_CHARS = 140;

/** Normalize specialty chips: trim, drop empties, case-insensitive dedupe, max 3. */
export function normalizeSpecialtyChips(
  specialties: readonly string[] | null | undefined
): string[] {
  if (!specialties?.length) {
    return [];
  }

  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of specialties) {
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
    if (out.length >= PROFILE_HERO_SPECIALTY_CHIP_MAX) {
      break;
    }
  }

  return out;
}

/** Whether Hero bio should expose a more/less control. */
export function bioNeedsExpandToggle(bio: string | null | undefined): boolean {
  const text = bio?.trim() ?? "";
  if (!text) {
    return false;
  }
  return text.length >= PROFILE_HERO_BIO_EXPAND_MIN_CHARS;
}
