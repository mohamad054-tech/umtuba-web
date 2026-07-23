/**
 * UM Learning OS — Learner Delivery V1 safe content-block render helpers.
 * Pure utilities: URL scheme allowlist, HTML escaping, creatable-type guards.
 * Never use dangerouslySetInnerHTML with unsanitized author content.
 */

import {
  LEARNING_LESSON_CONTENT_BLOCK_CALLOUT_VARIANTS,
  LEARNING_LESSON_CONTENT_BLOCK_CREATABLE_TYPES,
  LEARNING_LESSON_CONTENT_BLOCK_DEFERRED_TYPES,
  LEARNING_LESSON_CONTENT_BLOCK_DIVIDER_STYLES,
  LEARNING_LESSON_CONTENT_BLOCK_HEADING_LEVELS,
  LEARNING_LESSON_CONTENT_BLOCK_RESERVED_TYPES,
  LEARNING_LESSON_CONTENT_BLOCK_RICH_TEXT_FORMATS,
  LEARNING_LESSON_CONTENT_BLOCK_VIDEO_PROVIDERS,
  type LearningLessonContentBlockCreatableType,
} from "./lessonContentBlocksFoundation";

const CREATABLE = new Set<string>(LEARNING_LESSON_CONTENT_BLOCK_CREATABLE_TYPES);
const RESERVED = new Set<string>(LEARNING_LESSON_CONTENT_BLOCK_RESERVED_TYPES);
const DEFERRED = new Set<string>(LEARNING_LESSON_CONTENT_BLOCK_DEFERRED_TYPES);
const HEADING_LEVELS = new Set<number>(LEARNING_LESSON_CONTENT_BLOCK_HEADING_LEVELS);
const CALLOUT_VARIANTS = new Set<string>(
  LEARNING_LESSON_CONTENT_BLOCK_CALLOUT_VARIANTS
);
const RICH_TEXT_FORMATS = new Set<string>(
  LEARNING_LESSON_CONTENT_BLOCK_RICH_TEXT_FORMATS
);
const DIVIDER_STYLES = new Set<string>(LEARNING_LESSON_CONTENT_BLOCK_DIVIDER_STYLES);
const VIDEO_PROVIDERS = new Set<string>(
  LEARNING_LESSON_CONTENT_BLOCK_VIDEO_PROVIDERS
);

/** http(s) only — rejects javascript:, data:, vbscript:, and relative schemes. */
export function isSafeHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2048) return false;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }
  return parsed.protocol === "http:" || parsed.protocol === "https:";
}

/** Escape text for safe React text nodes / attributes (no HTML injection). */
export function escapeHtmlText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function isCreatableContentBlockType(
  value: unknown
): value is LearningLessonContentBlockCreatableType {
  return typeof value === "string" && CREATABLE.has(value);
}

export function isReservedOrDeferredContentBlockType(value: unknown): boolean {
  return (
    typeof value === "string" && (RESERVED.has(value) || DEFERRED.has(value))
  );
}

export function asPlainString(value: unknown, maxChars?: number): string {
  if (typeof value !== "string") return "";
  const text = value;
  if (typeof maxChars === "number" && text.length > maxChars) {
    return text.slice(0, maxChars);
  }
  return text;
}

export function asHeadingLevel(value: unknown): 1 | 2 | 3 | 4 | 5 | 6 {
  const n = typeof value === "number" ? value : Number(value);
  if (HEADING_LEVELS.has(n)) return n as 1 | 2 | 3 | 4 | 5 | 6;
  return 2;
}

export function asCalloutVariant(value: unknown): string {
  return typeof value === "string" && CALLOUT_VARIANTS.has(value)
    ? value
    : "info";
}

export function asRichTextFormat(value: unknown): "plain" | "markdown" {
  return typeof value === "string" && RICH_TEXT_FORMATS.has(value)
    ? (value as "plain" | "markdown")
    : "plain";
}

export function asDividerStyle(value: unknown): string {
  return typeof value === "string" && DIVIDER_STYLES.has(value)
    ? value
    : "solid";
}

export function asVideoProvider(value: unknown): string | null {
  return typeof value === "string" && VIDEO_PROVIDERS.has(value) ? value : null;
}

/**
 * Markdown is displayed as escaped plain text in V1 (no HTML pass-through).
 * Authors may use markdown format; learners see the source safely escaped.
 */
export function renderSafeBlockText(value: unknown): string {
  return escapeHtmlText(asPlainString(value));
}
