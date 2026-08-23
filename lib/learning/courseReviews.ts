/**
 * Course reviews — enrolled learners only. No fake ratings.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

type AnyClient = SupabaseClient;

export const LEARNING_COURSE_REVIEW_RPCS = {
  upsert: "upsert_learning_course_review",
  listPublic: "list_public_learning_course_reviews",
  listMineTeaching: "list_my_teaching_course_reviews",
} as const;

export type LearningCourseReview = {
  id: string;
  course_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
};

export type LearningReviewResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

export function validateCourseReviewInput(input: {
  course_id: string;
  rating: number;
  comment?: string | null;
}): LearningReviewResult<{
  course_id: string;
  rating: number;
  comment: string | null;
}> {
  const courseId = (input.course_id ?? "").trim();
  const rating = Math.trunc(Number(input.rating));
  if (!courseId) {
    return { ok: false, message: "learning.review.error.course" };
  }
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return { ok: false, message: "learning.review.error.rating" };
  }
  const comment = (input.comment ?? "").trim();
  if (comment.length > 2000) {
    return { ok: false, message: "learning.review.error.comment" };
  }
  return {
    ok: true,
    data: {
      course_id: courseId,
      rating,
      comment: comment || null,
    },
  };
}

export async function submitCourseReview(
  supabase: AnyClient,
  raw: { course_id: string; rating: number; comment?: string | null }
): Promise<LearningReviewResult<LearningCourseReview>> {
  const validated = validateCourseReviewInput(raw);
  if (!validated.ok) return validated;
  const { data, error } = await supabase.rpc(LEARNING_COURSE_REVIEW_RPCS.upsert, {
    p_course_id: validated.data.course_id,
    p_rating: validated.data.rating,
    p_comment: validated.data.comment,
  });
  if (error) {
    return { ok: false, message: "learning.review.error.generic" };
  }
  return { ok: true, data: data as LearningCourseReview };
}

export async function loadPublicCourseReviews(
  supabase: AnyClient,
  courseId: string
): Promise<LearningReviewResult<LearningCourseReview[]>> {
  const { data, error } = await supabase.rpc(
    LEARNING_COURSE_REVIEW_RPCS.listPublic,
    { p_course_id: courseId }
  );
  if (error) {
    return { ok: false, message: "learning.review.error.generic" };
  }
  const rows = Array.isArray(data) ? data : [];
  return { ok: true, data: rows as LearningCourseReview[] };
}
