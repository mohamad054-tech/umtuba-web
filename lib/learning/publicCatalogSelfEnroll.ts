import type { SupabaseClient } from "@supabase/supabase-js";
import { LEARNING_ENROLLMENT_HELPERS } from "./enrollmentsFoundation";
import {
  LEARNING_LEARNER_ROUTES,
  isLearningLessonDeliveryUuid,
} from "./learnerDelivery";
import { isPublicCatalogEligible } from "./publicCatalog";

type AnyClient = SupabaseClient;

export const LEARNING_PUBLIC_FREE_SELF_ENROLL_MIGRATION =
  "20260930_learning_public_catalog_self_enroll_v1.sql";

export const LEARNING_ENROLL_ERROR_CODES = [
  "not_eligible",
  "already_enrolled",
  "course_required",
  "failed",
] as const;

export type LearningEnrollErrorCode =
  (typeof LEARNING_ENROLL_ERROR_CODES)[number];

/** Published + public + not marketplace_ready → public free self-enroll. */
export function isPublicFreeSelfEnrollEligible(input: {
  status?: string | null;
  visibility?: string | null;
  marketplace_ready?: boolean | null;
}): boolean {
  return (
    isPublicCatalogEligible(input) && input.marketplace_ready !== true
  );
}

export function mapEnrollRpcError(
  message: string | null | undefined
): LearningEnrollErrorCode {
  const lower = (message ?? "").trim().toLowerCase();
  if (!lower) return "failed";
  if (lower.includes("course is required") || lower.includes("course_id is required")) {
    return "course_required";
  }
  if (lower.includes("already exists")) return "already_enrolled";
  if (lower.includes("not eligible")) return "not_eligible";
  return "failed";
}

export function enrollErrorKey(
  code: string | null | undefined
):
  | "learning.enroll.notEligible"
  | "learning.enroll.alreadyEnrolled"
  | "learning.enroll.courseRequired"
  | "learning.enroll.failed" {
  switch (code) {
    case "not_eligible":
      return "learning.enroll.notEligible";
    case "already_enrolled":
      return "learning.enroll.alreadyEnrolled";
    case "course_required":
      return "learning.enroll.courseRequired";
    default:
      return "learning.enroll.failed";
  }
}

export function resolvePostEnrollHref(
  courseId: string,
  nextLessonId?: string | null
): string {
  if (nextLessonId && isLearningLessonDeliveryUuid(nextLessonId)) {
    return LEARNING_LEARNER_ROUTES.lesson(nextLessonId);
  }
  return LEARNING_LEARNER_ROUTES.course(courseId);
}

export async function canUserSelfEnrollInCourse(
  supabase: AnyClient,
  courseId: string
): Promise<boolean> {
  const id = courseId.trim();
  if (!id) return false;
  const { data, error } = await supabase.rpc(
    LEARNING_ENROLLMENT_HELPERS.canEnrollCourse,
    { p_course_id: id }
  );
  if (error) return false;
  return data === true;
}
