/**
 * UM Learning OS — Assessment Delivery Minimal V1 (BLOCKED stub).
 *
 * Intended product: read-only learner delivery of published activity questions
 * without starting an attempt or persisting answers.
 *
 * STATUS: fail-closed. There is no authenticated learner-callable RPC that
 * returns published questions without creating an attempt. See
 * `docs/learning/implementation/ASSESSMENT_DELIVERY_MINIMAL_V1.md`.
 *
 * Do NOT SELECT `learning_questions` / `learning_question_answer_keys` from
 * learner JWT clients. Do NOT call attempt start/save/submit/score RPCs here.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { LEARNING_ATTEMPT_HELPERS } from "./attemptsFoundation";
import { LEARNING_LEARNER_FORBIDDEN, LEARNING_LEARNER_ROUTES } from "./learnerDelivery";
import { LEARNING_QUESTION_RPCS } from "./questionsFoundation";
import { LEARNING_SCORING_RPCS } from "./scoringFoundation";

type AnyClient = SupabaseClient;

/**
 * Intended future RPC name (NOT present in migrations yet). Documented only so
 * the next migration slice has a stable TypeScript target.
 */
export const LEARNING_ASSESSMENT_DELIVERY_RPCS = {
  /** Proposed — requires a future migration; not callable today. */
  getMyActivityAssessment: "get_my_learning_activity_assessment",
} as const;

export const LEARNING_ASSESSMENT_DELIVERY_ROUTES = {
  assessment: (activityId: string) =>
    `/learning/activities/${activityId}/assessment`,
  activityGate: LEARNING_LEARNER_ROUTES.activity,
} as const;

/** Surfaces / tables / RPCs this slice must never use. */
export const LEARNING_ASSESSMENT_DELIVERY_FORBIDDEN = {
  questionTables: LEARNING_LEARNER_FORBIDDEN.questionTables,
  resultTables: LEARNING_LEARNER_FORBIDDEN.resultTables,
  scoringRpc: LEARNING_SCORING_RPCS.score,
  /** Internal helper — revoked from authenticated; not a delivery API. */
  internalSnapshotBuilder: LEARNING_ATTEMPT_HELPERS.buildSnapshot,
  /** Creating an attempt is out of Assessment Delivery Minimal V1 scope. */
  startAttempt: "start_learning_attempt",
  saveAnswer: "save_learning_attempt_answer",
  submitAttempt: "submit_learning_attempt",
  /** Staff authoring write RPCs are not learner delivery. */
  setAnswerKey: LEARNING_QUESTION_RPCS.setAnswerKey,
} as const;

export const LEARNING_ASSESSMENT_DELIVERY_BLOCKED_MESSAGE =
  "Assessment delivery is not available yet. A learner-safe assessment RPC has not been shipped." as const;

export type AssessmentDeliveryResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; blocked: true };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isAssessmentDeliveryUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/**
 * Fail-closed loader. Does not call RPCs, does not SELECT question tables, and
 * does not start attempts. Unblocks only after
 * `get_my_learning_activity_assessment` (or equivalent) exists and is granted.
 */
export async function loadAssessmentDelivery(
  _supabase: AnyClient,
  activityId: string
): Promise<AssessmentDeliveryResult<never>> {
  if (!isAssessmentDeliveryUuid(activityId)) {
    return {
      ok: false,
      blocked: true,
      message: "activity_id must be a valid UUID",
    };
  }
  return {
    ok: false,
    blocked: true,
    message: LEARNING_ASSESSMENT_DELIVERY_BLOCKED_MESSAGE,
  };
}
