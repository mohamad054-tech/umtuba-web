"use server";

import { redirect } from "next/navigation";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import { LEARNING_ENROLLMENT_RPCS } from "../../../lib/learning/enrollmentsFoundation";
import { LEARNING_LEARNER_ROUTES } from "../../../lib/learning/learnerDelivery";
import { LEARNING_PUBLIC_ROUTES } from "../../../lib/learning/publicCatalog";

/**
 * Self-enroll via JWT client + enroll_in_learning_course RPC.
 * No service role. Redirects to course outline on success.
 */
export async function enrollInPublicCourseAction(
  formData: FormData
): Promise<void> {
  const courseId = String(formData.get("courseId") ?? "").trim();
  const courseSlug = String(formData.get("courseSlug") ?? "").trim();

  const landingPath = courseSlug
    ? LEARNING_PUBLIC_ROUTES.course(courseSlug)
    : LEARNING_PUBLIC_ROUTES.catalog;

  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        courseId
          ? LEARNING_LEARNER_ROUTES.course(courseId)
          : landingPath
      )}`
    );
  }

  if (!courseId) {
    redirect(
      `${landingPath}?error=${encodeURIComponent("Course is required")}`
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc(LEARNING_ENROLLMENT_RPCS.enrollCourse, {
    p_course_id: courseId,
    p_metadata: {},
  });

  if (error) {
    redirect(
      `${landingPath}?error=${encodeURIComponent(
        error.message || "Unable to enroll in this course"
      )}`
    );
  }

  redirect(LEARNING_LEARNER_ROUTES.course(courseId));
}
