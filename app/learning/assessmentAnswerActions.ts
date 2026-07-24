"use server";

import { revalidatePath } from "next/cache";
import { createClient, getServerUser } from "../../lib/supabase/server";
import {
  assessmentAnswerRevalidatePath,
  saveAssessmentAnswer,
  type AssessmentAnswerResult,
  type AssessmentAnswerSaveView,
} from "../../lib/learning/assessmentAnswerPersistence";

function formString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function saveAssessmentAnswerAction(
  formData: FormData
): Promise<AssessmentAnswerResult<AssessmentAnswerSaveView>> {
  const user = await getServerUser();
  if (!user) {
    return { ok: false, message: "Sign in required." };
  }

  const activityId = formString(formData, "activityId");
  const attemptId = formString(formData, "attemptId");
  const questionId = formString(formData, "questionId");
  const questionType = formString(formData, "questionType");
  const answerRaw = formString(formData, "answerJson");

  let parsedAnswer: unknown;
  try {
    parsedAnswer = JSON.parse(answerRaw || "{}");
  } catch {
    return { ok: false, message: "Answer payload is invalid." };
  }

  const supabase = await createClient();
  const result = await saveAssessmentAnswer(
    supabase,
    attemptId,
    questionId,
    questionType,
    parsedAnswer
  );

  if (result.ok && activityId) {
    revalidatePath(assessmentAnswerRevalidatePath(activityId, attemptId));
  }
  return result;
}
