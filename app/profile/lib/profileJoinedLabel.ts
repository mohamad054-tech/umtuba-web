/**
 * Creator Hero Joined Label V1 (CREATOR_SPACE_EXPERIENCE_V1 §3 / §9).
 * Prevents “Joined Joined …” when about.joinedLabel already includes “Joined”.
 * No migrations — formats existing joinedLabel strings only.
 */

/** Strip a leading “Joined” word (case-insensitive) from a label. */
export function stripJoinedPrefix(raw: string | null | undefined): string {
  const value = raw?.trim() ?? "";
  if (!value) {
    return "";
  }
  return value.replace(/^joined\s+/i, "").trim();
}

/**
 * Hero line: single “Joined …” sentence.
 * Accepts either “March 2024” or “Joined March 2024”.
 */
export function formatHeroJoinedLine(
  joinedLabel: string | null | undefined
): string | null {
  const datePart = stripJoinedPrefix(joinedLabel);
  if (!datePart) {
    return null;
  }
  return `Joined ${datePart}`;
}

/**
 * About body under a “Joined” section heading — date/phrase only (no duplicate prefix).
 */
export function formatAboutJoinedBody(
  joinedLabel: string | null | undefined
): string | null {
  const datePart = stripJoinedPrefix(joinedLabel);
  return datePart || null;
}
