"use server";

/**
 * Learning AI Tutor Server Actions Foundation V1.
 *
 * Official server entry for future Learning UI. Named actions only.
 * Routes exclusively through learningTutorIntegration (not the shared
 * multi-domain service entry).
 */

import { createClient, getServerUser } from "../../lib/supabase/server";
import type {
  LearningTutorAnswerQuestionActionInput,
  LearningTutorExplainLessonActionInput,
  LearningTutorExplainWrongAnswerActionInput,
  LearningTutorGeneratePracticeActionInput,
  LearningTutorServerActionResult,
  LearningTutorSummarizeLessonActionInput,
} from "../../lib/ai/contracts/learningTutorServerActions";
import {
  answerQuestionLearningTutor,
  explainLessonLearningTutor,
  explainWrongAnswerLearningTutor,
  generatePracticeLearningTutor,
  summarizeLessonLearningTutor,
  type LearningTutorServerActionRuntime,
} from "../../lib/ai/services/learningTutorServerActions";

async function defaultRuntime(): Promise<LearningTutorServerActionRuntime> {
  return {
    getUserId: async () => {
      const user = await getServerUser();
      return user?.id ?? null;
    },
    getSupabase: async () => createClient(),
  };
}

export async function explainLessonLearningTutorAction(
  input: LearningTutorExplainLessonActionInput
): Promise<LearningTutorServerActionResult> {
  return explainLessonLearningTutor(input, await defaultRuntime());
}

export async function summarizeLessonLearningTutorAction(
  input: LearningTutorSummarizeLessonActionInput
): Promise<LearningTutorServerActionResult> {
  return summarizeLessonLearningTutor(input, await defaultRuntime());
}

export async function answerQuestionLearningTutorAction(
  input: LearningTutorAnswerQuestionActionInput
): Promise<LearningTutorServerActionResult> {
  return answerQuestionLearningTutor(input, await defaultRuntime());
}

export async function generatePracticeLearningTutorAction(
  input: LearningTutorGeneratePracticeActionInput
): Promise<LearningTutorServerActionResult> {
  return generatePracticeLearningTutor(input, await defaultRuntime());
}

export async function explainWrongAnswerLearningTutorAction(
  input: LearningTutorExplainWrongAnswerActionInput
): Promise<LearningTutorServerActionResult> {
  return explainWrongAnswerLearningTutor(input, await defaultRuntime());
}
