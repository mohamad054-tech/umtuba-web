/**
 * UM Learning OS — Learner Personal Lesson Notes Foundation V1.
 *
 * Private per-learner notes attached to a lesson. Plain text only.
 * DB-authoritative RPCs in
 * `supabase/migrations/20260901_learning_lesson_notes_foundation_v1.sql`.
 *
 * No sharing, collaboration, AI processing, or instructor read path.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

type AnyClient = SupabaseClient;

export const LEARNING_LESSON_NOTES_RPCS = {
  list: "list_my_learning_lesson_notes",
  create: "create_my_learning_lesson_note",
  update: "update_my_learning_lesson_note",
  delete: "delete_my_learning_lesson_note",
} as const;

export const LEARNING_LESSON_NOTE_BODY_MAX = 20000;

export type LessonNotesResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

export type LearningLessonNote = {
  id: string;
  lesson_id: string;
  body: string;
  lesson_position_seconds: number | null;
  created_at: string;
  updated_at: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isLessonNotesUuid(value: string): boolean {
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

function asNullableInt(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isInteger(value)) return value;
  return null;
}

export function sanitizeLessonNotesError(
  message: string | undefined
): string {
  const raw = (message ?? "").trim();
  if (!raw) return "Notes could not be processed.";
  const lower = raw.toLowerCase();
  if (
    lower.includes("authentication required") ||
    lower.includes("not entitled") ||
    lower.includes("not allowed")
  ) {
    return "You are not allowed to access notes for this lesson.";
  }
  if (lower.includes("note not found") || lower.includes("lesson not found")) {
    return "Note or lesson was not found.";
  }
  if (lower.includes("body must be")) {
    return "Note text must be between 1 and 20000 characters.";
  }
  if (lower.includes("lesson_position_seconds")) {
    return "Lesson position must be zero or a positive number of seconds.";
  }
  if (lower.includes("unsafe html") || lower.includes("script content")) {
    return "Note text contains unsupported content.";
  }
  if (raw.length > 180) return "Notes could not be processed.";
  return raw;
}

async function callRpc(
  supabase: AnyClient,
  rpc: string,
  args?: Record<string, unknown>
): Promise<LessonNotesResult<unknown>> {
  const { data, error } = args
    ? await supabase.rpc(rpc, args)
    : await supabase.rpc(rpc);
  if (error) {
    return { ok: false, message: sanitizeLessonNotesError(error.message) };
  }
  return { ok: true, data };
}

function requireUuid(
  value: string,
  label: string
): { ok: false; message: string } | null {
  if (!isLessonNotesUuid(value)) {
    return { ok: false, message: `${label} must be a valid UUID` };
  }
  return null;
}

export function validateLessonNoteBody(
  body: string
): LessonNotesResult<string> {
  const trimmed = body.trim();
  if (!trimmed || trimmed.length > LEARNING_LESSON_NOTE_BODY_MAX) {
    return {
      ok: false,
      message: "Note text must be between 1 and 20000 characters.",
    };
  }
  return { ok: true, data: trimmed };
}

export function validateLessonPositionSeconds(
  value: number | null | undefined
): LessonNotesResult<number | null> {
  if (value === null || value === undefined) {
    return { ok: true, data: null };
  }
  if (!Number.isInteger(value) || value < 0) {
    return {
      ok: false,
      message: "Lesson position must be zero or a positive number of seconds.",
    };
  }
  return { ok: true, data: value };
}

function parseNote(value: unknown): LearningLessonNote | null {
  const row = asRecord(value);
  if (!row) return null;
  const id = asString(row.id);
  const lesson_id = asString(row.lesson_id);
  const body = typeof row.body === "string" ? row.body : null;
  const created_at = asString(row.created_at);
  const updated_at = asString(row.updated_at);
  if (!id || !lesson_id || body === null || !created_at || !updated_at) {
    return null;
  }
  if (row.lesson_position_seconds !== null && row.lesson_position_seconds !== undefined) {
    if (
      typeof row.lesson_position_seconds !== "number" ||
      !Number.isInteger(row.lesson_position_seconds)
    ) {
      return null;
    }
  }
  return {
    id,
    lesson_id,
    body,
    lesson_position_seconds: asNullableInt(row.lesson_position_seconds),
    created_at,
    updated_at,
  };
}

export async function listMyLessonNotes(
  supabase: AnyClient,
  lessonId: string
): Promise<LessonNotesResult<LearningLessonNote[]>> {
  const bad = requireUuid(lessonId, "lessonId");
  if (bad) return bad;

  const result = await callRpc(supabase, LEARNING_LESSON_NOTES_RPCS.list, {
    p_lesson_id: lessonId,
  });
  if (!result.ok) return result;

  const root = asRecord(result.data);
  if (!root) {
    return { ok: false, message: "Notes response was invalid." };
  }

  const notes: LearningLessonNote[] = [];
  for (const item of asArray(root.notes)) {
    const note = parseNote(item);
    if (!note) {
      return { ok: false, message: "Notes response was invalid." };
    }
    notes.push(note);
  }
  return { ok: true, data: notes };
}

export async function createMyLessonNote(
  supabase: AnyClient,
  input: {
    lessonId: string;
    body: string;
    lessonPositionSeconds?: number | null;
  }
): Promise<LessonNotesResult<LearningLessonNote>> {
  const bad = requireUuid(input.lessonId, "lessonId");
  if (bad) return bad;

  const body = validateLessonNoteBody(input.body);
  if (!body.ok) return body;

  const position = validateLessonPositionSeconds(input.lessonPositionSeconds);
  if (!position.ok) return position;

  const result = await callRpc(supabase, LEARNING_LESSON_NOTES_RPCS.create, {
    p_lesson_id: input.lessonId,
    p_body: body.data,
    p_lesson_position_seconds: position.data,
  });
  if (!result.ok) return result;

  const root = asRecord(result.data);
  const note = parseNote(root?.note);
  if (!note) {
    return { ok: false, message: "Notes response was invalid." };
  }
  return { ok: true, data: note };
}

export async function updateMyLessonNote(
  supabase: AnyClient,
  input: {
    noteId: string;
    body: string;
    lessonPositionSeconds?: number | null;
  }
): Promise<LessonNotesResult<LearningLessonNote>> {
  const bad = requireUuid(input.noteId, "noteId");
  if (bad) return bad;

  const body = validateLessonNoteBody(input.body);
  if (!body.ok) return body;

  const position = validateLessonPositionSeconds(input.lessonPositionSeconds);
  if (!position.ok) return position;

  const result = await callRpc(supabase, LEARNING_LESSON_NOTES_RPCS.update, {
    p_note_id: input.noteId,
    p_body: body.data,
    p_lesson_position_seconds: position.data,
  });
  if (!result.ok) return result;

  const root = asRecord(result.data);
  const note = parseNote(root?.note);
  if (!note) {
    return { ok: false, message: "Notes response was invalid." };
  }
  return { ok: true, data: note };
}

export async function deleteMyLessonNote(
  supabase: AnyClient,
  noteId: string
): Promise<LessonNotesResult<{ deleted: true; id: string }>> {
  const bad = requireUuid(noteId, "noteId");
  if (bad) return bad;

  const result = await callRpc(supabase, LEARNING_LESSON_NOTES_RPCS.delete, {
    p_note_id: noteId,
  });
  if (!result.ok) return result;

  const root = asRecord(result.data);
  if (!root || root.deleted !== true || asString(root.id) !== noteId) {
    return { ok: false, message: "Notes response was invalid." };
  }
  return { ok: true, data: { deleted: true, id: noteId } };
}
