"use server";

import { redirect } from "next/navigation";
import { createClient, getServerUser } from "../../lib/supabase/server";
import {
  LEARNING_ASSESSMENT_ATTEMPT_ROUTES,
  cancelAssessmentAttempt,
  startAssessmentAttempt,
} from "../../lib/learning/assessmentAttemptFoundation";
import { LEARNING_ASSESSMENT_DELIVERY_ROUTES } from "../../lib/learning/assessmentDelivery";

export async function startAssessmentAttemptAction(
  formData: FormData
): Promise<void> {
  const activityId = String(formData.get("activityId") ?? "").trim();
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        activityId
          ? LEARNING_ASSESSMENT_DELIVERY_ROUTES.assessment(activityId)
          : "/learning"
      )}`
    );
  }

  if (!activityId) {
    redirect(
      `/learning?error=${encodeURIComponent("Activity is required")}`
    );
  }

  const supabase = await createClient();
  const result = await startAssessmentAttempt(supabase, activityId);
  if (!result.ok) {
    redirect(
      `${LEARNING_ASSESSMENT_DELIVERY_ROUTES.assessment(activityId)}?error=${encodeURIComponent(
        result.message
      )}`
    );
  }

  redirect(
    LEARNING_ASSESSMENT_ATTEMPT_ROUTES.attempt(
      result.data.activity_id,
      result.data.attempt_id
    )
  );
}

export async function cancelAssessmentAttemptAction(
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

  const supabase = await createClient();
  const result = await cancelAssessmentAttempt(supabase, attemptId);
  if (!result.ok) {
    redirect(
      `${LEARNING_ASSESSMENT_ATTEMPT_ROUTES.attempt(activityId, attemptId)}?error=${encodeURIComponent(
        result.message
      )}`
    );
  }

  redirect(
    `${LEARNING_ASSESSMENT_DELIVERY_ROUTES.assessment(activityId)}?cancelled=1`
  );
}
