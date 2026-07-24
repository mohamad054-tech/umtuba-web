"use server";

import { redirect } from "next/navigation";
import { createClient, getServerUser } from "../../lib/supabase/server";
import {
  LEARNING_COMPLETION_ROUTES,
  finalizeMyCourseCompletion,
} from "../../lib/learning/completionFoundation";

export async function finalizeCourseCompletionAction(
  formData: FormData
): Promise<void> {
  const courseId = String(formData.get("courseId") ?? "").trim();
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(LEARNING_COMPLETION_ROUTES.transcript)}`
    );
  }

  if (!courseId) {
    redirect(LEARNING_COMPLETION_ROUTES.transcript);
  }

  const supabase = await createClient();
  const result = await finalizeMyCourseCompletion(supabase, courseId);
  if (!result.ok) {
    redirect(
      `${LEARNING_COMPLETION_ROUTES.transcript}?error=${encodeURIComponent(result.message)}`
    );
  }

  if (result.data.certificate_issued) {
    redirect(`${LEARNING_COMPLETION_ROUTES.transcript}?issued=1`);
  }

  redirect(
    `${LEARNING_COMPLETION_ROUTES.transcript}?error=${encodeURIComponent(
      result.data.reason ?? result.data.status
    )}`
  );
}
