"use server";

import { revalidatePath } from "next/cache";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import type { InstructorAuthoringResult } from "../../../lib/learning/instructorAuthoring";
import {
  LEARNING_ENROLLMENT_ASSIGNABLE_SOURCES,
  LEARNING_ENROLLMENT_MANAGE_ROUTES,
  activateLearningEnrollment,
  cancelLearningEnrollment,
  createLearningEnrollment,
  isLearningEnrollmentUuid,
  reinstateLearningEnrollment,
  suspendLearningEnrollment,
  type LearningEnrollmentLifecycleAction,
} from "../../../lib/learning/enrollmentsFoundation";

function formString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

async function requireUser(): Promise<InstructorAuthoringResult | null> {
  const user = await getServerUser();
  if (!user) {
    return { ok: false, message: "Sign in required." };
  }
  return null;
}

function revalidateLearners(courseId: string) {
  if (isLearningEnrollmentUuid(courseId)) {
    revalidatePath(LEARNING_ENROLLMENT_MANAGE_ROUTES.learners(courseId));
  }
}

/**
 * Manager-assign a learner to a course (assignable sources only).
 * Default: active + admin_assignment.
 */
export async function createCourseEnrollmentAction(
  formData: FormData
): Promise<InstructorAuthoringResult> {
  const authErr = await requireUser();
  if (authErr) return authErr;

  const courseId = formString(formData, "courseId");
  const learnerUserId = formString(formData, "learnerUserId");
  const sourceRaw = formString(formData, "source") || "admin_assignment";
  const statusRaw = formString(formData, "status") || "active";

  if (!isLearningEnrollmentUuid(courseId)) {
    return { ok: false, message: "Course id must be a valid UUID." };
  }
  if (!isLearningEnrollmentUuid(learnerUserId)) {
    return { ok: false, message: "Learner user id must be a valid UUID." };
  }
  if (
    !(LEARNING_ENROLLMENT_ASSIGNABLE_SOURCES as readonly string[]).includes(
      sourceRaw
    )
  ) {
    return { ok: false, message: "Unsupported enrollment source." };
  }
  if (statusRaw !== "pending" && statusRaw !== "active") {
    return { ok: false, message: "Status must be pending or active." };
  }

  const supabase = await createClient();
  const result = await createLearningEnrollment(supabase, {
    targetType: "course",
    targetId: courseId,
    userId: learnerUserId,
    source: sourceRaw as (typeof LEARNING_ENROLLMENT_ASSIGNABLE_SOURCES)[number],
    status: statusRaw,
  });
  if (!result.ok) {
    return { ok: false, message: result.message };
  }
  revalidateLearners(courseId);
  return { ok: true, data: result.data };
}

export async function enrollmentLifecycleAction(
  formData: FormData
): Promise<InstructorAuthoringResult> {
  const authErr = await requireUser();
  if (authErr) return authErr;

  const courseId = formString(formData, "courseId");
  const enrollmentId = formString(formData, "enrollmentId");
  const action = formString(formData, "action") as LearningEnrollmentLifecycleAction;

  if (!isLearningEnrollmentUuid(courseId)) {
    return { ok: false, message: "Course id must be a valid UUID." };
  }
  if (!isLearningEnrollmentUuid(enrollmentId)) {
    return { ok: false, message: "Enrollment id must be a valid UUID." };
  }

  const supabase = await createClient();
  let result;
  switch (action) {
    case "activate":
      result = await activateLearningEnrollment(supabase, enrollmentId);
      break;
    case "suspend":
      result = await suspendLearningEnrollment(supabase, enrollmentId);
      break;
    case "reinstate":
      result = await reinstateLearningEnrollment(supabase, enrollmentId);
      break;
    case "cancel":
      result = await cancelLearningEnrollment(supabase, enrollmentId);
      break;
    default:
      return { ok: false, message: "Unsupported enrollment action." };
  }

  if (!result.ok) {
    return { ok: false, message: result.message };
  }
  revalidateLearners(courseId);
  return { ok: true, data: result.data };
}
