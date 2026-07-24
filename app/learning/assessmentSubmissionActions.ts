"use server";

import { redirect } from "next/navigation";
import { createClient, getServerUser } from "../../lib/supabase/server";
import {
  LEARNING_ASSESSMENT_ATTEMPT_ROUTES,
} from "../../lib/learning/assessmentAttemptFoundation";
import {
  assertAssessmentSubmitInputSafe,
  submitAssessmentAttempt,
} from "../../lib/learning/assessmentSubmissionFoundation";

export async function submitAssessmentAttemptAction(
  formData: FormData
): Promise<void> {
  const activityId = String(formData.get("activityId") ?? "").trim();
  const attemptId = String(formData.get("attemptId") ?? "").trim();
  const confirmed = String(formData.get("confirmSubmit") ?? "").trim();

  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        activityId && attemptId
          ? LEARNING_ASSESSMENT_ATTEMPT_ROUTES.attempt(activityId, attemptId)
          : "/learning"
      )}`
    );
  }

  if (!activityId || !attemptId) {
    redirect("/learning");
  }

  const attemptPath = LEARNING_ASSESSMENT_ATTEMPT_ROUTES.attempt(
    activityId,
    attemptId
  );

  if (confirmed !== "1") {
    redirect(
      `${attemptPath}?error=${encodeURIComponent(
        "Confirm that answers cannot be changed after submission."
      )}`
    );
  }

  const safe = assertAssessmentSubmitInputSafe({
    attempt_id: attemptId,
    activity_id: activityId,
  });
  if (!safe.ok) {
    redirect(`${attemptPath}?error=${encodeURIComponent(safe.message)}`);
  }

  const supabase = await createClient();
  const result = await submitAssessmentAttempt(supabase, safe.data.attempt_id);
  if (!result.ok) {
    redirect(`${attemptPath}?error=${encodeURIComponent(result.message)}`);
  }

  redirect(`${attemptPath}?submitted=1`);
}
