/**
 * UM Learning OS — Lesson Engine Foundation (First Course Readiness V1).
 * DB-authoritative via RPCs in
 * `supabase/migrations/20260863_learning_first_course_readiness_v1.sql`.
 *
 * Aggregated learner lesson payload: objectives, prerequisites, unlock state,
 * content blocks, media position, and related activities.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

type AnyClient = SupabaseClient;

export const LEARNING_LESSON_ENGINE_RPCS = {
  getEngine: "get_my_learning_lesson_engine",
  setObjectives: "set_learning_lesson_objectives",
  setPrerequisites: "set_learning_lesson_prerequisites",
  upsertMediaPosition: "upsert_my_learning_lesson_media_position",
  getCourseProgressBundle: "get_my_learning_course_progress_bundle",
} as const;

export const LEARNING_LESSON_ENGINE_ROUTES = {
  lesson: (lessonId: string) => `/learning/lessons/${lessonId}`,
  courseProgress: (courseId: string) =>
    `/learning/courses/${courseId}/progress`,
} as const;

export type LearningLessonEngineObjective = {
  id: string;
  position: number;
  objective_text: string;
};

export type LearningLessonEnginePrerequisite = {
  prerequisite_lesson_id: string;
  name: string;
  satisfied: boolean;
};

export type LearningLessonEngineBlock = {
  id: string;
  block_type: string;
  position: number;
  status: string;
  content: Record<string, unknown>;
};

export type LearningLessonEngineMediaPosition = {
  last_media_position_seconds: number | null;
  last_content_block_id: string | null;
  status: string;
};

export type LearningLessonEngineActivity = {
  id: string;
  type: string;
  name: string;
  status: string;
};

export type LearningLessonEngineUnlock = {
  lesson_id: string;
  locked: boolean;
  cost: number | null;
  balance: number;
  unlocked: boolean;
};

export type LearningLessonEnginePayload = {
  lesson_id: string;
  lesson: {
    name: string;
    difficulty: string | null;
    estimated_duration_minutes: number | null;
    description: string | null;
    status: string;
  };
  objectives: LearningLessonEngineObjective[];
  prerequisites: LearningLessonEnginePrerequisite[];
  unlock: LearningLessonEngineUnlock | Record<string, unknown>;
  unlock_required: boolean;
  blocks: LearningLessonEngineBlock[];
  media_position: LearningLessonEngineMediaPosition | null;
  activities: LearningLessonEngineActivity[];
  ai_tutor_enabled: boolean;
};

export type LessonEngineResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isLessonEngineUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function sanitizeLessonEngineError(
  message: string | undefined
): string {
  const raw = (message ?? "").trim();
  if (!raw) return "Lesson engine could not be loaded.";
  const lower = raw.toLowerCase();
  if (
    lower.includes("authentication required") ||
    lower.includes("not entitled") ||
    lower.includes("not allowed")
  ) {
    return "You are not allowed to access this lesson.";
  }
  if (lower.includes("not found") || lower.includes("invalid")) {
    return "Lesson data is unavailable or invalid.";
  }
  if (raw.length > 180) return "Lesson engine could not be loaded.";
  return raw;
}

export function parseLearningLessonEnginePayload(
  raw: unknown
): LearningLessonEnginePayload | null {
  const row = asRecord(raw);
  if (!row) return null;
  const lesson_id = asString(row.lesson_id);
  const lesson = asRecord(row.lesson);
  if (!lesson_id || !lesson || !asString(lesson.name)) return null;
  if (!Array.isArray(row.objectives) || !Array.isArray(row.prerequisites)) {
    return null;
  }
  if (!Array.isArray(row.blocks) || !Array.isArray(row.activities)) {
    return null;
  }
  return {
    lesson_id,
    lesson: {
      name: asString(lesson.name)!,
      difficulty:
        typeof lesson.difficulty === "string" ? lesson.difficulty : null,
      estimated_duration_minutes:
        typeof lesson.estimated_duration_minutes === "number"
          ? lesson.estimated_duration_minutes
          : null,
      description:
        typeof lesson.description === "string" ? lesson.description : null,
      status: asString(lesson.status) ?? "draft",
    },
    objectives: row.objectives as LearningLessonEngineObjective[],
    prerequisites: row.prerequisites as LearningLessonEnginePrerequisite[],
    unlock: (asRecord(row.unlock) ?? {}) as LearningLessonEngineUnlock,
    unlock_required: row.unlock_required === true,
    blocks: row.blocks as LearningLessonEngineBlock[],
    media_position: asRecord(row.media_position) as
      | LearningLessonEngineMediaPosition
      | null,
    activities: row.activities as LearningLessonEngineActivity[],
    ai_tutor_enabled: row.ai_tutor_enabled !== false,
  };
}

async function callRpc(
  supabase: AnyClient,
  rpc: string,
  args?: Record<string, unknown>
): Promise<LessonEngineResult<unknown>> {
  const { data, error } = args
    ? await supabase.rpc(rpc, args)
    : await supabase.rpc(rpc);
  if (error) {
    return { ok: false, message: sanitizeLessonEngineError(error.message) };
  }
  return { ok: true, data };
}

export async function loadMyLearningLessonEngine(
  supabase: AnyClient,
  lessonId: string
): Promise<LessonEngineResult<LearningLessonEnginePayload>> {
  if (!isLessonEngineUuid(lessonId)) {
    return { ok: false, message: "lesson_id must be a valid UUID" };
  }
  const result = await callRpc(
    supabase,
    LEARNING_LESSON_ENGINE_RPCS.getEngine,
    { p_lesson_id: lessonId }
  );
  if (!result.ok) return result;
  const parsed = parseLearningLessonEnginePayload(result.data);
  if (!parsed || parsed.lesson_id !== lessonId) {
    return { ok: false, message: "Lesson engine payload is malformed." };
  }
  return { ok: true, data: parsed };
}

export async function upsertMyLearningLessonMediaPosition(
  supabase: AnyClient,
  input: {
    lessonId: string;
    positionSeconds: number;
    contentBlockId?: string | null;
  }
): Promise<LessonEngineResult<Record<string, unknown>>> {
  if (!isLessonEngineUuid(input.lessonId)) {
    return { ok: false, message: "lesson_id must be a valid UUID" };
  }
  if (
    typeof input.positionSeconds !== "number" ||
    !Number.isFinite(input.positionSeconds) ||
    input.positionSeconds < 0
  ) {
    return { ok: false, message: "position_seconds must be >= 0" };
  }
  const result = await callRpc(
    supabase,
    LEARNING_LESSON_ENGINE_RPCS.upsertMediaPosition,
    {
      p_lesson_id: input.lessonId,
      p_position_seconds: Math.floor(input.positionSeconds),
      p_content_block_id: input.contentBlockId ?? null,
    }
  );
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function loadMyLearningCourseProgressBundle(
  supabase: AnyClient,
  courseId: string
): Promise<LessonEngineResult<Record<string, unknown>>> {
  if (!isLessonEngineUuid(courseId)) {
    return { ok: false, message: "course_id must be a valid UUID" };
  }
  const result = await callRpc(
    supabase,
    LEARNING_LESSON_ENGINE_RPCS.getCourseProgressBundle,
    { p_course_id: courseId }
  );
  if (!result.ok) return result;
  const row = asRecord(result.data);
  if (!row || asString(row.course_id) !== courseId) {
    return { ok: false, message: "Course progress bundle is malformed." };
  }
  return { ok: true, data: row };
}
