/**
 * UM Learning OS — Learner Lesson Bookmarks / Saved Lessons V1.
 *
 * Private per-learner lesson bookmarks. DB-authoritative RPCs in
 * `supabase/migrations/20260916_learning_lesson_bookmarks_v1.sql`.
 *
 * Distinct from Resume/Continue Learning and Personal Notes.
 * No sharing, folders, tags, social saves, Store favorites, or instructor browse.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

type AnyClient = SupabaseClient;

export const LEARNING_LESSON_BOOKMARKS_RPCS = {
  save: "save_my_learning_lesson_bookmark",
  delete: "delete_my_learning_lesson_bookmark",
  state: "get_my_learning_lesson_bookmark_state",
  list: "list_my_learning_lesson_bookmarks",
} as const;

/** Hub list default / clamp (mirrors SQL). */
export const LEARNING_BOOKMARKS_HUB_DEFAULT_LIMIT = 50;
export const LEARNING_BOOKMARKS_HUB_MAX_LIMIT = 100;

export type LessonBookmarksResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

export type LearningLessonBookmarkState = {
  lesson_id: string;
  saved: boolean;
  created_at?: string;
};

export type SavedLessonBookmark = {
  lesson_id: string;
  lesson_name: string;
  course_id: string;
  course_name: string;
  created_at: string;
};

export type SavedLessonsHub = {
  bookmarks: SavedLessonBookmark[];
  limit: number;
  has_more: boolean;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isLessonBookmarkUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function sanitizeLessonBookmarksError(
  message: string | undefined
): string {
  const raw = (message ?? "").trim();
  if (!raw) return "Saved lessons could not be processed.";
  const lower = raw.toLowerCase();
  if (
    lower.includes("authentication required") ||
    lower.includes("not entitled") ||
    lower.includes("not allowed")
  ) {
    return "You are not allowed to save or view this lesson.";
  }
  if (lower.includes("lesson not found")) {
    return "Lesson was not found.";
  }
  if (lower.includes("bookmark could not be saved")) {
    return "Saved lessons could not be processed.";
  }
  if (raw.length > 180) return "Saved lessons could not be processed.";
  return raw;
}

async function callRpc(
  supabase: AnyClient,
  rpc: string,
  args?: Record<string, unknown>
): Promise<LessonBookmarksResult<unknown>> {
  const { data, error } = args
    ? await supabase.rpc(rpc, args)
    : await supabase.rpc(rpc);
  if (error) {
    return { ok: false, message: sanitizeLessonBookmarksError(error.message) };
  }
  return { ok: true, data };
}

function requireUuid(
  value: string,
  label: string
): { ok: false; message: string } | null {
  if (!isLessonBookmarkUuid(value)) {
    return { ok: false, message: `${label} must be a valid UUID` };
  }
  return null;
}

export function clampLearningBookmarksHubLimit(
  limit: number | null | undefined
): number {
  if (limit === null || limit === undefined || !Number.isFinite(limit)) {
    return LEARNING_BOOKMARKS_HUB_DEFAULT_LIMIT;
  }
  const n = Math.trunc(limit);
  if (n < 1) return 1;
  if (n > LEARNING_BOOKMARKS_HUB_MAX_LIMIT) return LEARNING_BOOKMARKS_HUB_MAX_LIMIT;
  return n;
}

function parseState(value: unknown): LearningLessonBookmarkState | null {
  const row = asRecord(value);
  if (!row) return null;
  const lesson_id = asString(row.lesson_id);
  if (!lesson_id) return null;
  if (typeof row.saved !== "boolean") return null;
  const created_at = asString(row.created_at) ?? undefined;
  return {
    lesson_id,
    saved: row.saved,
    ...(created_at ? { created_at } : {}),
  };
}

function parseHubBookmark(value: unknown): SavedLessonBookmark | null {
  const row = asRecord(value);
  if (!row) return null;
  const lesson_id = asString(row.lesson_id);
  const lesson_name =
    typeof row.lesson_name === "string" ? row.lesson_name : null;
  const course_id = asString(row.course_id);
  const course_name =
    typeof row.course_name === "string" ? row.course_name : null;
  const created_at = asString(row.created_at);
  if (
    !lesson_id ||
    lesson_name === null ||
    !course_id ||
    course_name === null ||
    !created_at
  ) {
    return null;
  }
  return {
    lesson_id,
    lesson_name,
    course_id,
    course_name,
    created_at,
  };
}

export async function saveMyLearningLessonBookmark(
  supabase: AnyClient,
  lessonId: string
): Promise<LessonBookmarksResult<LearningLessonBookmarkState>> {
  const bad = requireUuid(lessonId, "lessonId");
  if (bad) return bad;

  const result = await callRpc(supabase, LEARNING_LESSON_BOOKMARKS_RPCS.save, {
    p_lesson_id: lessonId,
  });
  if (!result.ok) return result;

  const state = parseState(result.data);
  if (!state || state.saved !== true || !state.created_at) {
    return { ok: false, message: "Saved lessons response was invalid." };
  }
  return { ok: true, data: state };
}

export async function deleteMyLearningLessonBookmark(
  supabase: AnyClient,
  lessonId: string
): Promise<LessonBookmarksResult<LearningLessonBookmarkState>> {
  const bad = requireUuid(lessonId, "lessonId");
  if (bad) return bad;

  const result = await callRpc(
    supabase,
    LEARNING_LESSON_BOOKMARKS_RPCS.delete,
    { p_lesson_id: lessonId }
  );
  if (!result.ok) return result;

  const state = parseState(result.data);
  if (!state || state.saved !== false) {
    return { ok: false, message: "Saved lessons response was invalid." };
  }
  return { ok: true, data: state };
}

export async function getMyLearningLessonBookmarkState(
  supabase: AnyClient,
  lessonId: string
): Promise<LessonBookmarksResult<LearningLessonBookmarkState>> {
  const bad = requireUuid(lessonId, "lessonId");
  if (bad) return bad;

  const result = await callRpc(supabase, LEARNING_LESSON_BOOKMARKS_RPCS.state, {
    p_lesson_id: lessonId,
  });
  if (!result.ok) return result;

  const state = parseState(result.data);
  if (!state) {
    return { ok: false, message: "Saved lessons response was invalid." };
  }
  return { ok: true, data: state };
}

/**
 * Cross-lesson Saved Lessons hub for the signed-in learner.
 * Owner-only; optional course filter; live access filtered.
 */
export async function listMyLearningLessonBookmarks(
  supabase: AnyClient,
  input?: {
    courseId?: string | null;
    limit?: number | null;
  }
): Promise<LessonBookmarksResult<SavedLessonsHub>> {
  const courseId = input?.courseId ?? null;
  if (courseId) {
    const bad = requireUuid(courseId, "courseId");
    if (bad) return bad;
  }

  const limit = clampLearningBookmarksHubLimit(input?.limit);
  const result = await callRpc(supabase, LEARNING_LESSON_BOOKMARKS_RPCS.list, {
    p_course_id: courseId,
    p_limit: limit,
  });
  if (!result.ok) return result;

  const root = asRecord(result.data);
  if (!root) {
    return { ok: false, message: "Saved lessons response was invalid." };
  }

  const bookmarks: SavedLessonBookmark[] = [];
  for (const item of asArray(root.bookmarks)) {
    const row = parseHubBookmark(item);
    if (!row) {
      return { ok: false, message: "Saved lessons response was invalid." };
    }
    bookmarks.push(row);
  }

  const returnedLimit =
    typeof root.limit === "number" && Number.isInteger(root.limit)
      ? clampLearningBookmarksHubLimit(root.limit)
      : limit;
  const hasMore = root.has_more === true;

  return {
    ok: true,
    data: {
      bookmarks,
      limit: returnedLimit,
      has_more: hasMore,
    },
  };
}
