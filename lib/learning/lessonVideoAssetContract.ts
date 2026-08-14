/**
 * Learning lesson video asset contract (production + ingestion).
 * Playback on the learner surface still uses the existing content-block
 * `video` shape (`url` | `provider` | `caption`) validated by SQL.
 * Richer production metadata lives in the production manifest — not invented
 * into the lesson body.
 */

export const LEARNING_LESSON_VIDEO_ASSET_STATUSES = [
  "planned",
  "rendering",
  "ready",
  "published",
  "failed",
] as const;

export type LearningLessonVideoAssetStatus =
  (typeof LEARNING_LESSON_VIDEO_ASSET_STATUSES)[number];

export type LearningLessonVideoAssetContract = {
  /** Learning lesson UUID (DB). */
  lesson_id: string | null;
  /** Package lesson code e.g. JA-01:M01-L01 */
  source_lesson_code: string;
  course_code: string;
  module_code: string;
  lesson_code: string;
  /** Opaque provider / storage object id when known. */
  asset_provider_id: string | null;
  /** HTTPS playback URL or null until ready. */
  playback_url: string | null;
  /** Optional provider hint for the content block (youtube|vimeo|upload|…). */
  provider: string | null;
  poster_url: string | null;
  duration_seconds: number | null;
  captions_url: string | null;
  locale: string;
  status: LearningLessonVideoAssetStatus;
  /** Content hash of SCRIPT.md when inventoried. */
  script_sha256: string | null;
  visual_plan_sha256: string | null;
  provenance: string | null;
};

export type LearningLessonVideoProductionManifestEntry = {
  course_code: string;
  course_title: string;
  module_code: string;
  module_title: string;
  lesson_code: string;
  lesson_title: string;
  source_lesson_code: string;
  lesson_id: string | null;
  script_relpath: string | null;
  visual_plan_relpath: string | null;
  script_chars: number;
  visual_plan_chars: number;
  estimated_narration_minutes: number | null;
  estimated_video_duration_minutes: number | null;
  expected_visual_scenes: string[];
  diagrams_screenshots_demos: string[];
  production_complexity: "low" | "medium" | "high";
  asset: LearningLessonVideoAssetContract;
};

export type LearningLessonVideoProductionManifest = {
  manifest_version: "umtuba.learning.jinn_video_production.v1";
  generated_at: string;
  program_external_id: string;
  entry_count: number;
  entries: LearningLessonVideoProductionManifestEntry[];
};

export function isLearningLessonVideoAssetStatus(
  value: unknown
): value is LearningLessonVideoAssetStatus {
  return (
    typeof value === "string" &&
    (LEARNING_LESSON_VIDEO_ASSET_STATUSES as readonly string[]).includes(value)
  );
}

/** Estimate speaking minutes from SCRIPT.md character length (rough). */
export function estimateNarrationMinutesFromScriptChars(chars: number): number {
  if (!Number.isFinite(chars) || chars <= 0) return 0;
  // ~900–1100 characters per spoken English minute for instructional tone.
  return Math.max(1, Math.round(chars / 1000));
}

export function classifyVideoProductionComplexity(input: {
  estimated_narration_minutes: number | null;
  scene_count: number;
  has_screen_recording_hints: boolean;
}): "low" | "medium" | "high" {
  const minutes = input.estimated_narration_minutes ?? 0;
  if (minutes >= 18 || input.scene_count >= 12 || input.has_screen_recording_hints) {
    return "high";
  }
  if (minutes >= 10 || input.scene_count >= 6) return "medium";
  return "low";
}
