"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import {
  assessmentRevalidatePaths,
  LEARNING_ASSESSMENT_ROUTES,
  runAssessmentAuthoringOperation,
  type AssessmentAuthoringResult,
} from "../../../lib/learning/assessmentAuthoring";
import {
  clearLearningAssessmentDueAt,
  setLearningAssessmentDueAt,
} from "../../../lib/learning/assessmentDueDates";
import {
  LEARNING_QUESTION_CREATABLE_TYPES,
  type LearningQuestionCreatableType,
} from "../../../lib/learning/questionsFoundation";

function formString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function parseIdList(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseOptions(raw: string): Array<{ key: string; text: string }> {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const sep = line.indexOf("|");
      if (sep <= 0) {
        return { key: "", text: line };
      }
      return {
        key: line.slice(0, sep).trim(),
        text: line.slice(sep + 1).trim(),
      };
    });
}

function parseBlankKeys(raw: string): Array<{ key: string }> {
  return parseIdList(raw).map((key) => ({ key }));
}

async function requireUser(): Promise<AssessmentAuthoringResult | null> {
  const user = await getServerUser();
  if (!user) {
    return { ok: false, message: "Sign in required." };
  }
  return null;
}

function revalidateAssessment(courseId: string, activityId: string) {
  for (const path of assessmentRevalidatePaths(courseId, activityId)) {
    revalidatePath(path);
  }
}

async function runOp(
  operation: string,
  input: Record<string, unknown>,
  courseId: string,
  activityId: string
): Promise<AssessmentAuthoringResult> {
  const authErr = await requireUser();
  if (authErr) return authErr;
  const supabase = await createClient();
  const result = await runAssessmentAuthoringOperation(
    supabase,
    operation,
    input
  );
  if (result.ok) {
    revalidateAssessment(courseId, activityId);
  }
  return result;
}

function isCreatableType(value: string): value is LearningQuestionCreatableType {
  return (LEARNING_QUESTION_CREATABLE_TYPES as readonly string[]).includes(
    value
  );
}

function buildContentFromForm(
  questionType: LearningQuestionCreatableType,
  formData: FormData
): { ok: true; content: Record<string, unknown> } | { ok: false; error: string } {
  const prompt = formString(formData, "prompt");
  if (!prompt) return { ok: false, error: "Prompt is required." };

  if (
    questionType === "multiple_choice_single" ||
    questionType === "multiple_choice_multiple"
  ) {
    const options = parseOptions(formString(formData, "options"));
    if (options.length < 2) {
      return {
        ok: false,
        error: "Provide at least two options as key|text lines.",
      };
    }
    return { ok: true, content: { prompt, options } };
  }

  if (questionType === "fill_blank") {
    const blanks = parseBlankKeys(formString(formData, "blanks"));
    if (blanks.length < 1) {
      return { ok: false, error: "Provide at least one blank key." };
    }
    return { ok: true, content: { prompt, blanks } };
  }

  if (questionType === "numeric") {
    const unit = formString(formData, "unit");
    return {
      ok: true,
      content: unit ? { prompt, unit } : { prompt },
    };
  }

  return { ok: true, content: { prompt } };
}

function buildAnswerKeyFromForm(
  questionType: LearningQuestionCreatableType,
  formData: FormData
):
  | { ok: true; answerKey: Record<string, unknown> }
  | { ok: false; error: string } {
  switch (questionType) {
    case "multiple_choice_single": {
      const correct_key = formString(formData, "correctKey");
      if (!correct_key) return { ok: false, error: "correctKey is required." };
      return { ok: true, answerKey: { correct_key } };
    }
    case "multiple_choice_multiple": {
      const correct_keys = parseIdList(formString(formData, "correctKeys"));
      if (correct_keys.length < 1) {
        return { ok: false, error: "correctKeys is required." };
      }
      return { ok: true, answerKey: { correct_keys } };
    }
    case "true_false": {
      const raw = formString(formData, "correct");
      if (raw !== "true" && raw !== "false") {
        return { ok: false, error: "correct must be true or false." };
      }
      return { ok: true, answerKey: { correct: raw === "true" } };
    }
    case "short_answer": {
      const accepted = formString(formData, "accepted")
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (accepted.length < 1) {
        return { ok: false, error: "Provide at least one accepted answer." };
      }
      const trim = formString(formData, "normTrim") === "on";
      const caseSensitive = formString(formData, "normCase") === "on";
      const answer_key: Record<string, unknown> = { accepted };
      if (trim || caseSensitive) {
        answer_key.normalization = {
          trim,
          case_sensitive: caseSensitive,
        };
      }
      return { ok: true, answerKey: answer_key };
    }
    case "fill_blank": {
      const raw = formString(formData, "blankAnswers");
      const answers: Record<string, string[]> = {};
      for (const line of raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)) {
        const eq = line.indexOf("=");
        if (eq <= 0) {
          return {
            ok: false,
            error: "blankAnswers lines must be blankKey=answer1|answer2",
          };
        }
        const key = line.slice(0, eq).trim();
        const vals = line
          .slice(eq + 1)
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean);
        if (vals.length < 1) {
          return {
            ok: false,
            error: `blank ${key} needs at least one accepted answer`,
          };
        }
        answers[key] = vals;
      }
      if (Object.keys(answers).length < 1) {
        return { ok: false, error: "blankAnswers is required." };
      }
      return { ok: true, answerKey: { answers } };
    }
    case "numeric": {
      const value = Number(formString(formData, "value"));
      if (!Number.isFinite(value)) {
        return { ok: false, error: "value must be a number." };
      }
      const tolRaw = formString(formData, "tolerance");
      if (!tolRaw) return { ok: true, answerKey: { value } };
      const tolerance = Number(tolRaw);
      if (!Number.isFinite(tolerance) || tolerance < 0) {
        return {
          ok: false,
          error: "tolerance must be a non-negative number.",
        };
      }
      return { ok: true, answerKey: { value, tolerance } };
    }
    default:
      return { ok: false, error: "Unsupported question type." };
  }
}

export async function createQuestionAction(
  formData: FormData
): Promise<AssessmentAuthoringResult> {
  const courseId = formString(formData, "courseId");
  const activityId = formString(formData, "activityId");
  const questionType = formString(formData, "questionType");
  if (!isCreatableType(questionType)) {
    return { ok: false, message: "Invalid or unsupported question type." };
  }
  const content = buildContentFromForm(questionType, formData);
  if (!content.ok) return { ok: false, message: content.error };

  const pointsRaw = formString(formData, "points");
  const input: Record<string, unknown> = {
    activity_id: activityId,
    question_type: questionType,
    content: content.content,
  };
  if (pointsRaw) input.points = Number(pointsRaw);

  return runOp("create_question", input, courseId, activityId);
}

export async function updateQuestionAction(
  formData: FormData
): Promise<AssessmentAuthoringResult> {
  const courseId = formString(formData, "courseId");
  const activityId = formString(formData, "activityId");
  const questionId = formString(formData, "questionId");
  const questionType = formString(formData, "questionType");
  if (!isCreatableType(questionType)) {
    return { ok: false, message: "Invalid or unsupported question type." };
  }
  const content = buildContentFromForm(questionType, formData);
  if (!content.ok) return { ok: false, message: content.error };

  const input: Record<string, unknown> = {
    question_id: questionId,
    content: content.content,
  };
  const pointsRaw = formString(formData, "points");
  const clearPoints = formString(formData, "clearPoints") === "on";
  if (clearPoints) input.clear_points = true;
  else if (pointsRaw) input.points = Number(pointsRaw);

  return runOp("update_question", input, courseId, activityId);
}

export async function publishQuestionAction(
  formData: FormData
): Promise<AssessmentAuthoringResult> {
  return runOp(
    "publish_question",
    { question_id: formString(formData, "questionId") },
    formString(formData, "courseId"),
    formString(formData, "activityId")
  );
}

export async function unpublishQuestionAction(
  formData: FormData
): Promise<AssessmentAuthoringResult> {
  return runOp(
    "unpublish_question",
    { question_id: formString(formData, "questionId") },
    formString(formData, "courseId"),
    formString(formData, "activityId")
  );
}

export async function archiveQuestionAction(
  formData: FormData
): Promise<AssessmentAuthoringResult> {
  return runOp(
    "archive_question",
    { question_id: formString(formData, "questionId") },
    formString(formData, "courseId"),
    formString(formData, "activityId")
  );
}

export async function reorderQuestionsAction(
  formData: FormData
): Promise<AssessmentAuthoringResult> {
  const courseId = formString(formData, "courseId");
  const activityId = formString(formData, "activityId");
  return runOp(
    "reorder_questions",
    {
      activity_id: activityId,
      question_ids: parseIdList(formString(formData, "questionIds")),
    },
    courseId,
    activityId
  );
}

export async function setAnswerKeyAction(
  formData: FormData
): Promise<AssessmentAuthoringResult> {
  const courseId = formString(formData, "courseId");
  const activityId = formString(formData, "activityId");
  const questionId = formString(formData, "questionId");
  const questionType = formString(formData, "questionType");
  if (!isCreatableType(questionType)) {
    return { ok: false, message: "Invalid or unsupported question type." };
  }
  const answerKey = buildAnswerKeyFromForm(questionType, formData);
  if (!answerKey.ok) return { ok: false, message: answerKey.error };

  return runOp(
    "set_answer_key",
    {
      question_id: questionId,
      question_type: questionType,
      answer_key: answerKey.answerKey,
    },
    courseId,
    activityId
  );
}

export async function setAssessmentDueAtAction(
  formData: FormData
): Promise<void> {
  const courseId = formString(formData, "courseId");
  const activityId = formString(formData, "activityId");
  const dueAtRaw = formString(formData, "dueAt");
  const path = LEARNING_ASSESSMENT_ROUTES.activityQuestions(
    courseId,
    activityId
  );

  const authErr = await requireUser();
  if (authErr) {
    redirect(`/login?next=${encodeURIComponent(path)}`);
  }

  const supabase = await createClient();
  const result = await setLearningAssessmentDueAt(supabase, {
    activityId,
    dueAt: dueAtRaw,
  });
  if (!result.ok) {
    redirect(`${path}?error=${encodeURIComponent(result.message)}`);
  }
  revalidateAssessment(courseId, activityId);
  redirect(`${path}?due=1`);
}

export async function clearAssessmentDueAtAction(
  formData: FormData
): Promise<void> {
  const courseId = formString(formData, "courseId");
  const activityId = formString(formData, "activityId");
  const path = LEARNING_ASSESSMENT_ROUTES.activityQuestions(
    courseId,
    activityId
  );

  const authErr = await requireUser();
  if (authErr) {
    redirect(`/login?next=${encodeURIComponent(path)}`);
  }

  const supabase = await createClient();
  const result = await clearLearningAssessmentDueAt(supabase, activityId);
  if (!result.ok) {
    redirect(`${path}?error=${encodeURIComponent(result.message)}`);
  }
  revalidateAssessment(courseId, activityId);
  redirect(`${path}?due=cleared`);
}
