"use server";

import { redirect } from "next/navigation";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import { LEARNING_ENROLLMENT_RPCS } from "../../../lib/learning/enrollmentsFoundation";
import {
  LEARNING_LEARNER_ROUTES,
  isLearningLessonDeliveryUuid,
} from "../../../lib/learning/learnerDelivery";
import { LEARNING_PUBLIC_ROUTES } from "../../../lib/learning/publicCatalog";
import {
  mapEnrollRpcError,
  resolvePostEnrollHref,
} from "../../../lib/learning/publicCatalogSelfEnroll";

/**
 * Self-enroll via JWT client + enroll_in_learning_course RPC.
 * No service role. Returns to the requested lesson when present.
 */
export async function enrollInPublicCourseAction(
  formData: FormData
): Promise<void> {
  const courseId = String(formData.get("courseId") ?? "").trim();
  const courseSlug = String(formData.get("courseSlug") ?? "").trim();
  const nextLessonId = String(formData.get("nextLessonId") ?? "").trim();
  const safeLessonId = isLearningLessonDeliveryUuid(nextLessonId)
    ? nextLessonId
    : "";

  const landingPath = courseSlug
    ? LEARNING_PUBLIC_ROUTES.course(courseSlug)
    : LEARNING_PUBLIC_ROUTES.catalog;
  const landingWithLesson = safeLessonId
    ? `${landingPath}?lesson=${encodeURIComponent(safeLessonId)}`
    : landingPath;

  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        safeLessonId
          ? LEARNING_LEARNER_ROUTES.lesson(safeLessonId)
          : courseId
            ? LEARNING_LEARNER_ROUTES.course(courseId)
            : landingPath
      )}`
    );
  }

  if (!courseId) {
    const sep = landingWithLesson.includes("?") ? "&" : "?";
    redirect(`${landingWithLesson}${sep}error=course_required`);
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc(LEARNING_ENROLLMENT_RPCS.enrollCourse, {
    p_course_id: courseId,
    p_metadata: {},
  });

  if (error) {
    const code = mapEnrollRpcError(error.message);
    if (code === "already_enrolled") {
      redirect(resolvePostEnrollHref(courseId, safeLessonId || null));
    }
    const sep = landingWithLesson.includes("?") ? "&" : "?";
    redirect(`${landingWithLesson}${sep}error=${encodeURIComponent(code)}`);
  }

  redirect(resolvePostEnrollHref(courseId, safeLessonId || null));
}
