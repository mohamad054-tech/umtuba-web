"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getServerUser } from "../../lib/supabase/server";
import {
  LEARNING_ASSESSMENT_MANUAL_REVIEW_ROUTES,
  assertManualReviewInputSafe,
  reviewManualAssessmentAnswer,
} from "../../lib/learning/assessmentManualReview";

export async function reviewAssessmentAnswerAction(
  formData: FormData
): Promise<void> {
  const courseId = String(formData.get("courseId") ?? "").trim();
  const attemptId = String(formData.get("attemptId") ?? "").trim();
  const questionId = String(formData.get("questionId") ?? "").trim();
  const pointsRaw = String(formData.get("pointsEarned") ?? "").trim();
  const feedbackRaw = String(formData.get("feedback") ?? "");

  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        courseId && attemptId
          ? LEARNING_ASSESSMENT_MANUAL_REVIEW_ROUTES.attempt(courseId, attemptId)
          : "/learning/instructor"
      )}`
    );
  }

  if (!courseId || !attemptId || !questionId) {
    redirect("/learning/instructor");
  }

  const attemptPath = LEARNING_ASSESSMENT_MANUAL_REVIEW_ROUTES.attempt(
    courseId,
    attemptId
  );

  const points = Number(pointsRaw);
  const safe = assertManualReviewInputSafe({
    attempt_id: attemptId,
    question_id: questionId,
    points_earned: points,
    feedback: feedbackRaw.trim() === "" ? null : feedbackRaw,
    course_id: courseId,
  });
  if (!safe.ok) {
    redirect(`${attemptPath}?error=${encodeURIComponent(safe.message)}`);
  }

  const supabase = await createClient();
  const result = await reviewManualAssessmentAnswer(
    supabase,
    safe.data.attempt_id,
    safe.data.question_id,
    safe.data.points_earned,
    safe.data.feedback
  );
  if (!result.ok) {
    redirect(`${attemptPath}?error=${encodeURIComponent(result.message)}`);
  }

  revalidatePath(attemptPath);
  revalidatePath(LEARNING_ASSESSMENT_MANUAL_REVIEW_ROUTES.queue(courseId));
  redirect(`${attemptPath}?reviewed=1`);
}
