"use server";

import { createClient, getServerUser } from "../../lib/supabase/server";
import {
  deleteMyLearningLessonBookmark,
  getMyLearningLessonBookmarkState,
  listMyLearningLessonBookmarks,
  saveMyLearningLessonBookmark,
  type LearningLessonBookmarkState,
  type LessonBookmarksResult,
  type SavedLessonsHub,
} from "../../lib/learning/lessonBookmarksFoundation";

export type LessonBookmarkActionResult<T> = LessonBookmarksResult<T>;

export async function getLessonBookmarkStateAction(
  lessonId: string
): Promise<LessonBookmarkActionResult<LearningLessonBookmarkState>> {
  const user = await getServerUser();
  if (!user) {
    return {
      ok: false,
      message: "You are not allowed to save or view this lesson.",
    };
  }
  const supabase = await createClient();
  return getMyLearningLessonBookmarkState(supabase, lessonId);
}

export async function saveLessonBookmarkAction(
  lessonId: string
): Promise<LessonBookmarkActionResult<LearningLessonBookmarkState>> {
  const user = await getServerUser();
  if (!user) {
    return {
      ok: false,
      message: "You are not allowed to save or view this lesson.",
    };
  }
  const supabase = await createClient();
  return saveMyLearningLessonBookmark(supabase, lessonId);
}

export async function removeLessonBookmarkAction(
  lessonId: string
): Promise<LessonBookmarkActionResult<LearningLessonBookmarkState>> {
  const user = await getServerUser();
  if (!user) {
    return {
      ok: false,
      message: "You are not allowed to save or view this lesson.",
    };
  }
  const supabase = await createClient();
  return deleteMyLearningLessonBookmark(supabase, lessonId);
}

/** Cross-lesson Saved Lessons hub (read-only). */
export async function listSavedLessonsAction(input?: {
  courseId?: string | null;
  limit?: number | null;
}): Promise<LessonBookmarkActionResult<SavedLessonsHub>> {
  const user = await getServerUser();
  if (!user) {
    return {
      ok: false,
      message: "You are not allowed to save or view this lesson.",
    };
  }
  const supabase = await createClient();
  return listMyLearningLessonBookmarks(supabase, {
    courseId: input?.courseId ?? null,
    limit: input?.limit ?? null,
  });
}
