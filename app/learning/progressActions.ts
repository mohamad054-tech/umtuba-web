"use server";

import { redirect } from "next/navigation";
import { createClient, getServerUser } from "../../lib/supabase/server";
import {
  LEARNING_LEARNER_ROUTES,
  completeMyLearningLesson,
} from "../../lib/learning/learnerDelivery";

export async function completeLearningLessonAction(
  formData: FormData
): Promise<void> {
  const lessonId = String(formData.get("lessonId") ?? "").trim();

  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        lessonId
          ? LEARNING_LEARNER_ROUTES.lesson(lessonId)
          : LEARNING_LEARNER_ROUTES.hub
      )}`
    );
  }

  if (!lessonId) {
    redirect(LEARNING_LEARNER_ROUTES.hub);
  }

  const path = LEARNING_LEARNER_ROUTES.lesson(lessonId);
  const supabase = await createClient();
  const result = await completeMyLearningLesson(supabase, lessonId);
  if (!result.ok) {
    redirect(`${path}?error=${encodeURIComponent(result.message)}`);
  }

  redirect(`${path}?completed=1`);
}
