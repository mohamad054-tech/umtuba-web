/**
 * Title card layout for Article Auto-Teaser Video V1 (pure helpers).
 * Used by create-article preview and FFmpeg drawtext planning.
 */

export const TEASER_CTA_AR = "اقرأ المقالة كاملة";
export const TEASER_CTA_EN = "Read full article";

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;

export function detectTeaserTextDirection(
  title: string
): "rtl" | "ltr" {
  return ARABIC_RE.test(title) ? "rtl" : "ltr";
}

export function teaserCtaForTitle(title: string): string {
  return detectTeaserTextDirection(title) === "rtl" ? TEASER_CTA_AR : TEASER_CTA_EN;
}

/**
 * Wrap title into lines and pick a font size so text stays inside the frame.
 * Frame: 1080×1920 with horizontal padding ~96px → ~888px text width.
 */
export function layoutTeaserTitle(
  title: string,
  options?: { maxCharsPerLine?: number; maxLines?: number }
): {
  lines: string[];
  fontSize: number;
  direction: "rtl" | "ltr";
} {
  const direction = detectTeaserTextDirection(title);
  const cleaned = title.replace(/\s+/g, " ").trim() || "Untitled";
  const maxLines = options?.maxLines ?? 4;
  const maxChars =
    options?.maxCharsPerLine ?? (direction === "rtl" ? 18 : 22);

  let fontSize = 72;
  if (cleaned.length > 40) fontSize = 60;
  if (cleaned.length > 70) fontSize = 52;
  if (cleaned.length > 100) fontSize = 44;
  if (cleaned.length > 140) fontSize = 38;

  const words = cleaned.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length >= maxLines - 1) break;
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  if (lines.length === maxLines) {
    const last = lines[maxLines - 1] ?? "";
    const remaining = words
      .join(" ")
      .slice(lines.slice(0, -1).join(" ").length)
      .trim();
    if (remaining.length > last.length + 1) {
      lines[maxLines - 1] =
        last.length > 3 ? `${last.slice(0, Math.max(3, maxChars - 1))}…` : `${last}…`;
    }
  }

  // Extra shrink if still dense
  const totalChars = lines.join("").length;
  if (totalChars > 80 && fontSize > 40) fontSize -= 8;

  return {
    lines: lines.length > 0 ? lines : [cleaned.slice(0, maxChars)],
    fontSize,
    direction,
  };
}

/** Escape text for FFmpeg drawtext (special chars). */
export function escapeDrawtext(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/%/g, "%%");
}
