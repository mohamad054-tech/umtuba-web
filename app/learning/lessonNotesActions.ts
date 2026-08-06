"use server";

import { createClient, getServerUser } from "../../lib/supabase/server";
import {
  createMyLessonNote,
  deleteMyLessonNote,
  listMyLessonNotes,
  updateMyLessonNote,
  type LearningLessonNote,
  type LessonNotesResult,
} from "../../lib/learning/lessonNotesFoundation";

export type LessonNotesActionResult<T> = LessonNotesResult<T>;

function parseOptionalPosition(
  value: unknown
): number | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : Number.NaN;
  }
  return Number.NaN;
}

export async function listLessonNotesAction(
  lessonId: string
): Promise<LessonNotesActionResult<LearningLessonNote[]>> {
  const user = await getServerUser();
  if (!user) {
    return {
      ok: false,
      message: "You are not allowed to access notes for this lesson.",
    };
  }
  const supabase = await createClient();
  return listMyLessonNotes(supabase, lessonId);
}

export async function createLessonNoteAction(input: {
  lessonId: string;
  body: string;
  lessonPositionSeconds?: number | null | string;
}): Promise<LessonNotesActionResult<LearningLessonNote>> {
  const user = await getServerUser();
  if (!user) {
    return {
      ok: false,
      message: "You are not allowed to access notes for this lesson.",
    };
  }
  const position = parseOptionalPosition(input.lessonPositionSeconds);
  if (typeof position === "number" && Number.isNaN(position)) {
    return {
      ok: false,
      message: "Lesson position must be zero or a positive number of seconds.",
    };
  }
  const supabase = await createClient();
  return createMyLessonNote(supabase, {
    lessonId: input.lessonId,
    body: input.body,
    lessonPositionSeconds: position ?? null,
  });
}

export async function updateLessonNoteAction(input: {
  noteId: string;
  body: string;
  lessonPositionSeconds?: number | null | string;
}): Promise<LessonNotesActionResult<LearningLessonNote>> {
  const user = await getServerUser();
  if (!user) {
    return {
      ok: false,
      message: "You are not allowed to access notes for this lesson.",
    };
  }
  const position = parseOptionalPosition(input.lessonPositionSeconds);
  if (typeof position === "number" && Number.isNaN(position)) {
    return {
      ok: false,
      message: "Lesson position must be zero or a positive number of seconds.",
    };
  }
  const supabase = await createClient();
  return updateMyLessonNote(supabase, {
    noteId: input.noteId,
    body: input.body,
    lessonPositionSeconds: position ?? null,
  });
}

export async function deleteLessonNoteAction(
  noteId: string
): Promise<LessonNotesActionResult<{ deleted: true; id: string }>> {
  const user = await getServerUser();
  if (!user) {
    return {
      ok: false,
      message: "You are not allowed to access notes for this lesson.",
    };
  }
  const supabase = await createClient();
  return deleteMyLessonNote(supabase, noteId);
}
