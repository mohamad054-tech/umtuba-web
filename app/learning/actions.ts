"use server";

import { redirect } from "next/navigation";
import { createClient, getServerUser } from "../../lib/supabase/server";
import {
  LEARNING_LEARNER_ROUTES,
  startOrResumeLearningAttempt,
} from "../../lib/learning/learnerDelivery";

export async function startOrResumeAttemptAction(
  formData: FormData
): Promise<void> {
  const activityId = String(formData.get("activityId") ?? "").trim();
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        activityId
          ? LEARNING_LEARNER_ROUTES.activity(activityId)
          : LEARNING_LEARNER_ROUTES.hub
      )}`
    );
  }

  if (!activityId) {
    redirect(
      `${LEARNING_LEARNER_ROUTES.hub}?error=${encodeURIComponent(
        "Activity is required"
      )}`
    );
  }

  const supabase = await createClient();
  const result = await startOrResumeLearningAttempt(supabase, activityId);
  if (!result.ok) {
    redirect(
      `${LEARNING_LEARNER_ROUTES.activity(activityId)}?error=${encodeURIComponent(
        result.message
      )}`
    );
  }

  redirect(LEARNING_LEARNER_ROUTES.attempt(result.data.attempt_id));
}
