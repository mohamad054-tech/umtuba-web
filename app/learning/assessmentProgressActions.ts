"use server";

import { redirect } from "next/navigation";
import { createClient, getServerUser } from "../../lib/supabase/server";
import { LEARNING_ASSESSMENT_ATTEMPT_ROUTES } from "../../lib/learning/assessmentAttemptFoundation";
import { applyAssessmentProgress } from "../../lib/learning/assessmentProgressIntegration";

export async function applyAssessmentProgressAction(
  formData: FormData
): Promise<void> {
  const activityId = String(formData.get("activityId") ?? "").trim();
  const attemptId = String(formData.get("attemptId") ?? "").trim();

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

  const path = LEARNING_ASSESSMENT_ATTEMPT_ROUTES.attempt(activityId, attemptId);
  const supabase = await createClient();
  const result = await applyAssessmentProgress(supabase, attemptId);
  if (!result.ok) {
    redirect(`${path}?error=${encodeURIComponent(result.message)}`);
  }

  if (result.data.completion_recorded) {
    redirect(`${path}?progress=1`);
  }

  const reason = result.data.reason ?? result.data.status;
  redirect(
    `${path}?error=${encodeURIComponent(
      `Progress was not recorded (${reason}).`
    )}`
  );
}
