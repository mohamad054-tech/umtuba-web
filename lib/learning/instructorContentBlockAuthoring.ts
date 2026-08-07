/**
 * UM Learning — Instructor Content-Block Authoring Expansion V1.
 *
 * Pure FormData → canonical content JSON shaping for instructor-creatable types.
 * Mirrors SQL validators + ContentBlockRenderer field names. No uploads.
 */

import {
  LEARNING_LESSON_CONTENT_BLOCK_CALLOUT_VARIANTS,
  LEARNING_LESSON_CONTENT_BLOCK_CODE_LANGUAGE_PATTERN,
  LEARNING_LESSON_CONTENT_BLOCK_DEFERRED_TYPES,
  LEARNING_LESSON_CONTENT_BLOCK_DIVIDER_STYLES,
  LEARNING_LESSON_CONTENT_BLOCK_LIMITS,
  LEARNING_LESSON_CONTENT_BLOCK_RESERVED_TYPES,
  LEARNING_LESSON_CONTENT_BLOCK_VIDEO_PROVIDERS,
  type LearningLessonContentBlockCreatableType,
} from "./lessonContentBlocksFoundation";
import { isSafeHttpUrl } from "./contentBlockRender";

/** Instructor UI creatable set for this expansion (excludes transcript/pdf/file). */
export const INSTRUCTOR_CONTENT_BLOCK_AUTHORING_TYPES = [
  "rich_text",
  "heading",
  "callout",
  "image",
  "video",
  "audio",
  "quote",
  "divider",
  "external_link",
  "code_block",
] as const;

export type InstructorContentBlockAuthoringType =
  (typeof INSTRUCTOR_CONTENT_BLOCK_AUTHORING_TYPES)[number];

export type InstructorContentBlockShapeResult =
  | { ok: true; blockType: InstructorContentBlockAuthoringType; content: Record<string, unknown> }
  | { ok: false; message: string };

const AUTHORING = new Set<string>(INSTRUCTOR_CONTENT_BLOCK_AUTHORING_TYPES);
const RESERVED = new Set<string>(LEARNING_LESSON_CONTENT_BLOCK_RESERVED_TYPES);
const DEFERRED = new Set<string>(LEARNING_LESSON_CONTENT_BLOCK_DEFERRED_TYPES);
const VIDEO_PROVIDERS = new Set<string>(
  LEARNING_LESSON_CONTENT_BLOCK_VIDEO_PROVIDERS
);
const DIVIDER_STYLES = new Set<string>(LEARNING_LESSON_CONTENT_BLOCK_DIVIDER_STYLES);
const CALLOUT_VARIANTS = new Set<string>(
  LEARNING_LESSON_CONTENT_BLOCK_CALLOUT_VARIANTS
);

const L = LEARNING_LESSON_CONTENT_BLOCK_LIMITS;

function trimOptional(value: string | undefined | null): string | undefined {
  if (value === undefined || value === null) return undefined;
  const t = value.trim();
  return t.length > 0 ? t : undefined;
}

function requireSafeUrl(
  raw: string | undefined,
  label: string
): { ok: true; url: string } | { ok: false; message: string } {
  const url = trimOptional(raw);
  if (!url) {
    return { ok: false, message: `${label} is required.` };
  }
  if (!isSafeHttpUrl(url)) {
    return {
      ok: false,
      message: `${label} must be a valid http(s) URL.`,
    };
  }
  if (url.length > L.urlMaxChars) {
    return {
      ok: false,
      message: `${label} exceeds maximum length.`,
    };
  }
  return { ok: true, url };
}

function optionalBounded(
  raw: string | undefined,
  max: number,
  label: string
): { ok: true; value?: string } | { ok: false; message: string } {
  const value = trimOptional(raw);
  if (value === undefined) return { ok: true };
  if (value.length > max) {
    return { ok: false, message: `${label} exceeds maximum length.` };
  }
  return { ok: true, value };
}

export function isInstructorContentBlockAuthoringType(
  value: unknown
): value is InstructorContentBlockAuthoringType {
  return typeof value === "string" && AUTHORING.has(value);
}

/**
 * Fail closed for reserved / deferred / unknown / future creatable types
 * (transcript|pdf|downloadable_file) not in this UI slice.
 */
export function rejectUnsupportedInstructorBlockType(
  blockType: string
): string | null {
  const t = blockType.trim();
  if (!t) return "Content block type is required.";
  if (RESERVED.has(t)) {
    return `Content block type ${t} is reserved and cannot be authored.`;
  }
  if (DEFERRED.has(t)) {
    return `Content block type ${t} is not available.`;
  }
  if (
    t === "transcript" ||
    t === "pdf" ||
    t === "downloadable_file"
  ) {
    return `Content block type ${t} is not available in this authoring slice.`;
  }
  if (!AUTHORING.has(t)) {
    return "Invalid content block type.";
  }
  return null;
}

export type InstructorContentBlockFormFields = {
  blockType: string;
  text?: string;
  url?: string;
  alt?: string;
  caption?: string;
  provider?: string;
  attribution?: string;
  style?: string;
  label?: string;
  description?: string;
  code?: string;
  language?: string;
  variant?: string;
  format?: string;
};

export function shapeInstructorContentBlock(
  input: InstructorContentBlockFormFields
): InstructorContentBlockShapeResult {
  const rejected = rejectUnsupportedInstructorBlockType(input.blockType);
  if (rejected) return { ok: false, message: rejected };

  const blockType = input.blockType.trim() as InstructorContentBlockAuthoringType;

  switch (blockType) {
    case "rich_text": {
      const text = input.text ?? "";
      if (text.length > L.richTextMaxChars) {
        return { ok: false, message: "Text exceeds maximum length." };
      }
      const content: Record<string, unknown> = { text };
      const format = trimOptional(input.format);
      if (format === "plain" || format === "markdown") {
        content.format = format;
      } else if (format) {
        return { ok: false, message: "Format must be plain or markdown." };
      }
      return { ok: true, blockType, content };
    }
    case "heading": {
      const text = (input.text ?? "").trim();
      if (text.length < 1 || text.length > L.headingMaxChars) {
        return {
          ok: false,
          message: `Heading must be between 1 and ${L.headingMaxChars} characters.`,
        };
      }
      return { ok: true, blockType, content: { text, level: 2 } };
    }
    case "callout": {
      const text = (input.text ?? "").trim();
      if (text.length < 1 || text.length > L.calloutMaxChars) {
        return {
          ok: false,
          message: `Callout text must be between 1 and ${L.calloutMaxChars} characters.`,
        };
      }
      const variantRaw = trimOptional(input.variant) ?? "info";
      if (!CALLOUT_VARIANTS.has(variantRaw)) {
        return { ok: false, message: "Invalid callout variant." };
      }
      return {
        ok: true,
        blockType,
        content: { text, variant: variantRaw },
      };
    }
    case "image": {
      const urlRes = requireSafeUrl(input.url, "Image URL");
      if (!urlRes.ok) return urlRes;
      const alt = optionalBounded(input.alt, L.imageAltMaxChars, "Alt text");
      if (!alt.ok) return alt;
      const caption = optionalBounded(
        input.caption,
        L.captionMaxChars,
        "Caption"
      );
      if (!caption.ok) return caption;
      const content: Record<string, unknown> = { url: urlRes.url };
      if (alt.value !== undefined) content.alt = alt.value;
      if (caption.value !== undefined) content.caption = caption.value;
      return { ok: true, blockType, content };
    }
    case "video": {
      const urlRes = requireSafeUrl(input.url, "Video URL");
      if (!urlRes.ok) return urlRes;
      const provider = trimOptional(input.provider);
      if (provider !== undefined && !VIDEO_PROVIDERS.has(provider)) {
        return {
          ok: false,
          message: "Video provider must be file, url, youtube, or vimeo.",
        };
      }
      const caption = optionalBounded(
        input.caption,
        L.captionMaxChars,
        "Caption"
      );
      if (!caption.ok) return caption;
      const content: Record<string, unknown> = { url: urlRes.url };
      if (provider !== undefined) content.provider = provider;
      if (caption.value !== undefined) content.caption = caption.value;
      return { ok: true, blockType, content };
    }
    case "audio": {
      const urlRes = requireSafeUrl(input.url, "Audio URL");
      if (!urlRes.ok) return urlRes;
      const caption = optionalBounded(
        input.caption,
        L.captionMaxChars,
        "Caption"
      );
      if (!caption.ok) return caption;
      const content: Record<string, unknown> = { url: urlRes.url };
      if (caption.value !== undefined) content.caption = caption.value;
      return { ok: true, blockType, content };
    }
    case "quote": {
      const text = (input.text ?? "").trim();
      if (text.length < 1 || text.length > L.quoteMaxChars) {
        return {
          ok: false,
          message: `Quote must be between 1 and ${L.quoteMaxChars} characters.`,
        };
      }
      const attribution = optionalBounded(
        input.attribution,
        L.quoteAttributionMaxChars,
        "Attribution"
      );
      if (!attribution.ok) return attribution;
      const content: Record<string, unknown> = { text };
      if (attribution.value !== undefined) {
        content.attribution = attribution.value;
      }
      return { ok: true, blockType, content };
    }
    case "divider": {
      const style = trimOptional(input.style);
      if (style !== undefined && !DIVIDER_STYLES.has(style)) {
        return {
          ok: false,
          message: "Divider style must be solid, dashed, or dotted.",
        };
      }
      if (style === undefined || style === "solid") {
        return { ok: true, blockType, content: {} };
      }
      return { ok: true, blockType, content: { style } };
    }
    case "external_link": {
      const urlRes = requireSafeUrl(input.url, "Link URL");
      if (!urlRes.ok) return urlRes;
      const label = optionalBounded(
        input.label,
        L.externalLinkLabelMaxChars,
        "Label"
      );
      if (!label.ok) return label;
      const description = optionalBounded(
        input.description,
        L.externalLinkDescriptionMaxChars,
        "Description"
      );
      if (!description.ok) return description;
      const content: Record<string, unknown> = { url: urlRes.url };
      if (label.value !== undefined) content.label = label.value;
      if (description.value !== undefined) {
        content.description = description.value;
      }
      return { ok: true, blockType, content };
    }
    case "code_block": {
      const code = input.code ?? "";
      if (!code.trim()) {
        return { ok: false, message: "Code is required." };
      }
      if (code.length > L.codeMaxChars) {
        return { ok: false, message: "Code exceeds maximum length." };
      }
      const language = trimOptional(input.language);
      if (
        language !== undefined &&
        !LEARNING_LESSON_CONTENT_BLOCK_CODE_LANGUAGE_PATTERN.test(language)
      ) {
        return {
          ok: false,
          message: "Language must be a short identifier (a-z, 0-9, +#.-).",
        };
      }
      const content: Record<string, unknown> = { code };
      if (language !== undefined) content.language = language;
      return { ok: true, blockType, content };
    }
    default:
      return { ok: false, message: "Invalid content block type." };
  }
}

export function fieldsFromFormData(
  formData: FormData
): InstructorContentBlockFormFields {
  const get = (name: string) => {
    const v = formData.get(name);
    return typeof v === "string" ? v : undefined;
  };
  return {
    blockType: get("blockType") || "",
    text: get("text"),
    url: get("url"),
    alt: get("alt"),
    caption: get("caption"),
    provider: get("provider"),
    attribution: get("attribution"),
    style: get("style"),
    label: get("label"),
    description: get("description"),
    code: get("code"),
    language: get("language"),
    variant: get("variant"),
    format: get("format"),
  };
}

/** Type-aware list summary for instructor block cards. */
export function summarizeInstructorContentBlock(block: {
  block_type: string;
  content?: Record<string, unknown> | null;
}): string {
  const c = block.content ?? {};
  const asStr = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  switch (block.block_type) {
    case "rich_text":
    case "heading":
    case "callout":
    case "quote":
      return asStr(c.text) || "(empty)";
    case "image":
      return asStr(c.alt) || asStr(c.caption) || asStr(c.url) || "Image";
    case "video":
    case "audio":
      return asStr(c.caption) || asStr(c.url) || block.block_type;
    case "divider": {
      const style = asStr(c.style) || "solid";
      return `Divider · ${style}`;
    }
    case "external_link":
      return asStr(c.label) || asStr(c.url) || "Link";
    case "code_block": {
      const lang = asStr(c.language);
      const code = asStr(c.code);
      const preview =
        code.length > 80 ? `${code.slice(0, 80).trimEnd()}…` : code;
      return lang ? `${lang}: ${preview || "(empty)"}` : preview || "Code";
    }
    default:
      return block.block_type;
  }
}

/** Re-export for UI/tests: creatable types used by this slice. */
export type { LearningLessonContentBlockCreatableType };
