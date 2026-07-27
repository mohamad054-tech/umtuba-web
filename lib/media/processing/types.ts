/**
 * Media Processing Foundation V1 — shared types.
 * Domain-agnostic. Processors provide article/course/product specifics.
 */

export const MEDIA_PROCESSOR_KINDS = [
  "article_teaser",
  "course_teaser",
  "product_teaser",
  "thumbnail_generator",
  "image_optimizer",
  "audio_waveform",
  "subtitle_generator",
  "ai_processor",
] as const;

export type MediaProcessorKind = (typeof MEDIA_PROCESSOR_KINDS)[number];

export const MEDIA_PROGRESS_STATES = [
  "pending",
  "claimed",
  "processing",
  "uploading",
  "finalizing",
  "ready",
  "failed",
] as const;

export type MediaProgressState = (typeof MEDIA_PROGRESS_STATES)[number];

export type MediaJobRef = {
  jobId: string;
  processorKind: MediaProcessorKind;
  attemptCount: number;
  /** Opaque domain payload — runtime never interprets it. */
  payload: Record<string, unknown>;
};

export type MediaFailureKind = "retryable" | "permanent";

export type MediaProcessError = {
  code: string;
  kind: MediaFailureKind;
  message?: string;
};

export type MediaProcessResult =
  | { ok: true; state: "ready" | "not_required" }
  | { ok: false; error: MediaProcessError };

export function isMediaProcessorKind(
  value: string
): value is MediaProcessorKind {
  return (MEDIA_PROCESSOR_KINDS as readonly string[]).includes(value);
}

export function sanitizeMediaErrorCode(
  code: string | null | undefined,
  allowlist: ReadonlySet<string>
): string {
  const raw = (code ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 64);
  if (allowlist.has(raw)) return raw;
  return "processing_failed";
}
