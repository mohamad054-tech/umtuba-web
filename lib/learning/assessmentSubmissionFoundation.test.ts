import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  LEARNING_ASSESSMENT_SUBMISSION_COMPLETENESS,
  LEARNING_ASSESSMENT_SUBMISSION_FORBIDDEN,
  LEARNING_ASSESSMENT_SUBMISSION_FORBIDDEN_INPUT_KEYS,
  LEARNING_ASSESSMENT_SUBMISSION_RPCS,
  assertAssessmentSubmitInputSafe,
  loadAssessmentSubmission,
  parseAssessmentSubmissionView,
  parseAssessmentSubmitResultView,
  sanitizeAssessmentSubmissionError,
  submitAssessmentAttempt,
} from "./assessmentSubmissionFoundation";
import { LEARNING_ATTEMPT_RPCS } from "./attemptsFoundation";
import { LEARNING_SCORING_RPCS } from "./scoringFoundation";
import { LEARNING_PROGRESS_RPCS } from "./progressFoundation";

const ROOT = join(__dirname, "../..");
const MIGRATION =
  "supabase/migrations/20260851_learning_assessment_submission_foundation_v1.sql";
const DOC =
  "docs/learning/implementation/ASSESSMENT_SUBMISSION_FOUNDATION_V1.md";
const ATTEMPTS_MIGRATION =
  "supabase/migrations/20260838_learning_attempts_foundation_v1.sql";
const SRC = readFileSync(
  join(ROOT, "lib/learning/assessmentSubmissionFoundation.ts"),
  "utf8"
);
const ACTIONS = readFileSync(
  join(ROOT, "app/learning/assessmentSubmissionActions.ts"),
  "utf8"
);
const PAGE = readFileSync(
  join(
    ROOT,
    "app/learning/activities/[activityId]/assessment-attempts/[attemptId]/page.tsx"
  ),
  "utf8"
);
const FORM = readFileSync(
  join(ROOT, "app/components/learning/AssessmentSubmitForm.tsx"),
  "utf8"
);

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function stripSqlComments(s: string) {
  return s.replace(/--[^\n]*/g, "");
}

function fnBody(sql: string, name: string) {
  const fnStarts = [
    ...sql.matchAll(/create or replace function public\.(\w+)/g),
  ];
  const idx = fnStarts.findIndex((m) => m[1] === name);
  if (idx < 0) throw new Error(`function ${name} not found`);
  const start = fnStarts[idx].index ?? 0;
  const end =
    idx + 1 < fnStarts.length
      ? (fnStarts[idx + 1].index ?? sql.length)
      : sql.length;
  return sql.slice(start, end);
}

const ATTEMPT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ACTIVITY_ID = "44444444-4444-4444-8444-444444444444";

describe("Assessment Submission Foundation V1 — files", () => {
  it("ships migration after answer persistence; no new submission table", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, DOC))).toBe(true);
    expect(MIGRATION > "supabase/migrations/20260850").toBe(true);
    const sql = read(MIGRATION);
    expect(sql).not.toMatch(/create table/i);
    expect(
      readdirSync(join(ROOT, "supabase/migrations"))
    ).toContain("20260851_learning_assessment_submission_foundation_v1.sql");
  });
});

describe("Assessment Submission Foundation V1 — SQL contracts", () => {
  const sql = read(MIGRATION);
  const attemptsSql = read(ATTEMPTS_MIGRATION);

  it("submit is owner-only, locks via expire_if_due, sets server submitted_at", () => {
    const fn = stripSqlComments(
      fnBody(sql, "submit_my_learning_assessment_attempt")
    );
    expect(LEARNING_ASSESSMENT_SUBMISSION_RPCS.submit).toBe(
      "submit_my_learning_assessment_attempt"
    );
    expect(fn).toMatch(/security definer/i);
    expect(fn).toMatch(/set search_path\s*=\s*public/i);
    expect(fn).toMatch(/auth\.uid\(\)/);
    expect(fn).toMatch(/learning_attempt_expire_if_due/);
    expect(fn).toMatch(/Not allowed to submit this attempt/);
    expect(fn).toMatch(/status = 'submitted'/);
    expect(fn).toMatch(/submitted_at = v_now/);
    expect(fn).toMatch(/idempotent/);
    expect(fn).not.toMatch(/p_submitted_at/);
    expect(fn).not.toMatch(/p_user_id/);
    expect(fn).not.toMatch(/p_status/);
    expect(fn).not.toMatch(/learning_question_answer_keys/);
    expect(fn).not.toMatch(/score_learning_attempt/);
    expect(fn).not.toMatch(/learning_lesson_progress/);
    expect(fn).not.toMatch(/complete_learning_lesson/);
    expect(fn).not.toMatch(/certificate/i);
    expect(fn).not.toMatch(/is_correct/);
    expect(fn).not.toMatch(/points_earned/);
  });

  it("owner can submit valid active attempt; foreign/expired/cancelled rejected", () => {
    const fn = stripSqlComments(
      fnBody(sql, "submit_my_learning_assessment_attempt")
    );
    expect(fn).toMatch(/user_id is distinct from v_uid/);
    expect(fn).toMatch(/Attempt is % and cannot be submitted/);
    expect(fn).toMatch(/status is distinct from 'active'/);
    expect(fn).toMatch(/status = 'submitted'/);
  });

  it("already submitted is idempotent and does not rewrite submitted_at", () => {
    const fn = stripSqlComments(
      fnBody(sql, "submit_my_learning_assessment_attempt")
    );
    expect(fn).toMatch(/if v_attempt\.status = 'submitted'/);
    expect(fn).toMatch(/'idempotent', true/);
    // First return path for submitted must use existing submitted_at, not v_now.
    const idempBlock = fn.slice(
      fn.indexOf("if v_attempt.status = 'submitted'"),
      fn.indexOf("if v_attempt.status is distinct from 'active'")
    );
    expect(idempBlock).toMatch(/v_attempt\.submitted_at/);
    expect(idempBlock).not.toMatch(/submitted_at = v_now/);
  });

  it("required unanswered blocks; optional unanswered does not", () => {
    const fn = stripSqlComments(
      fnBody(sql, "submit_my_learning_assessment_attempt")
    );
    expect(fn).toMatch(/Required question is unanswered/);
    expect(fn).toMatch(/is_required/);
    expect(fn).toMatch(/v_required := true/);
    expect(fn).toMatch(/learning_attempt_answers/);
    expect(fn).toMatch(/questions_snapshot/);
    expect(LEARNING_ASSESSMENT_SUBMISSION_COMPLETENESS.defaultRequired).toBe(
      true
    );
    expect(LEARNING_ASSESSMENT_SUBMISSION_COMPLETENESS.optionalFlags).toEqual([
      "is_required",
      "required",
    ]);
    // Optional path: only check answers when v_required is true.
    expect(fn).toMatch(/if v_required then/);
    expect(DOC).toBeTruthy();
    const doc = read(DOC);
    expect(doc).toMatch(/optional/i);
    expect(doc).toMatch(/required by default/i);
  });

  it("malformed snapshot fails closed", () => {
    const fn = stripSqlComments(
      fnBody(sql, "submit_my_learning_assessment_attempt")
    );
    expect(fn).toMatch(/Attempt questions snapshot is malformed/);
    expect(fn).toMatch(/jsonb_typeof\(v_attempt\.questions_snapshot\)/);
    expect(fn).toMatch(/v_question_count < 1/);
  });

  it("atomic transition under lock; concurrent save cannot write after submit", () => {
    const submitFn = stripSqlComments(
      fnBody(sql, "submit_my_learning_assessment_attempt")
    );
    const saveFn = stripSqlComments(
      fnBody(attemptsSql, "save_learning_attempt_answer")
    );
    const expireFn = stripSqlComments(
      fnBody(attemptsSql, "learning_attempt_expire_if_due")
    );
    expect(expireFn).toMatch(/for update/i);
    expect(submitFn).toMatch(/learning_attempt_expire_if_due/);
    expect(submitFn).toMatch(/where id = p_attempt_id\s+and status = 'active'/i);
    expect(saveFn).toMatch(/learning_attempt_expire_if_due/);
    expect(saveFn).toMatch(/status is distinct from 'active'/);
    expect(saveFn).toMatch(/can no longer be modified/);
  });

  it("cancel is rejected after submission via existing cancel path", () => {
    const cancelFn = stripSqlComments(
      fnBody(attemptsSql, "cancel_learning_attempt")
    );
    expect(cancelFn).toMatch(/status is distinct from 'active'/);
    expect(cancelFn).toMatch(/cannot be cancelled/);
  });

  it("get submission is owner-only lifecycle metadata without keys/answers/scores", () => {
    const fn = stripSqlComments(
      fnBody(sql, "get_my_learning_assessment_submission")
    );
    expect(fn).toMatch(/auth\.uid\(\)/);
    expect(fn).toMatch(/Not allowed to read this submission/);
    expect(fn).toMatch(/learning_attempt_expire_if_due/);
    expect(fn).toMatch(/submitted_at/);
    expect(fn).toMatch(/is_submitted/);
    expect(fn).not.toMatch(/answer_payload/);
    expect(fn).not.toMatch(/learning_question_answer_keys/);
    expect(fn).not.toMatch(/score_learning_attempt|'score'/);
    expect(fn).not.toMatch(/is_correct/);
    expect(fn).not.toMatch(/certificate/i);
    expect(fn).not.toMatch(/learning_lesson_progress/);
  });

  it("grants authenticated execute; revokes public/anon; search_path set", () => {
    expect(sql).toMatch(
      /revoke all on function public\.submit_my_learning_assessment_attempt\(uuid\)\s+from public, anon/
    );
    expect(sql).toMatch(
      /grant execute on function public\.submit_my_learning_assessment_attempt\(uuid\)\s+to authenticated/
    );
    expect(sql).toMatch(
      /revoke all on function public\.get_my_learning_assessment_submission\(uuid\)\s+from public, anon/
    );
    expect(sql).toMatch(
      /grant execute on function public\.get_my_learning_assessment_submission\(uuid\)\s+to authenticated/
    );
    expect(
      stripSqlComments(fnBody(sql, "submit_my_learning_assessment_attempt"))
    ).toMatch(/set search_path\s*=\s*public/i);
    expect(
      stripSqlComments(fnBody(sql, "get_my_learning_assessment_submission"))
    ).toMatch(/set search_path\s*=\s*public/i);
  });
});

describe("Assessment Submission Foundation V1 — adapter", () => {
  it("rejects injected submitted_at / status / score / learner identity", () => {
    expect(
      assertAssessmentSubmitInputSafe({
        attempt_id: ATTEMPT_ID,
        submitted_at: "2099-01-01T00:00:00Z",
      }).ok
    ).toBe(false);
    expect(
      assertAssessmentSubmitInputSafe({
        attempt_id: ATTEMPT_ID,
        status: "submitted",
      }).ok
    ).toBe(false);
    expect(
      assertAssessmentSubmitInputSafe({
        attempt_id: ATTEMPT_ID,
        user_id: "x",
      }).ok
    ).toBe(false);
    expect(
      assertAssessmentSubmitInputSafe({
        attempt_id: ATTEMPT_ID,
        score: 100,
      }).ok
    ).toBe(false);
    expect(
      assertAssessmentSubmitInputSafe({
        attempt_id: ATTEMPT_ID,
        activity_id: ACTIVITY_ID,
      }).ok
    ).toBe(true);
    expect(LEARNING_ASSESSMENT_SUBMISSION_FORBIDDEN_INPUT_KEYS).toContain(
      "submitted_at"
    );
  });

  it("sanitizes ownership, completeness, and lifecycle errors", () => {
    expect(
      sanitizeAssessmentSubmissionError("Not allowed to submit this attempt")
    ).toMatch(/not allowed/i);
    expect(
      sanitizeAssessmentSubmissionError("Required question is unanswered")
    ).toMatch(/required questions/i);
    expect(
      sanitizeAssessmentSubmissionError(
        "Attempt questions snapshot is malformed"
      )
    ).toMatch(/snapshot/i);
    expect(
      sanitizeAssessmentSubmissionError(
        "Attempt is expired and cannot be submitted"
      )
    ).toMatch(/no longer be submitted/i);
    expect(
      sanitizeAssessmentSubmissionError(
        "Attempt is cancelled and cannot be submitted"
      )
    ).toMatch(/no longer be submitted/i);
  });

  it("submitAssessmentAttempt calls assessment submit RPC only", async () => {
    const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
    const fake = {
      rpc: async (name: string, args: Record<string, unknown>) => {
        calls.push({ name, args });
        return {
          data: {
            attempt_id: ATTEMPT_ID,
            activity_id: ACTIVITY_ID,
            status: "submitted",
            submitted_at: "2026-07-24T10:00:00Z",
            started_at: "2026-07-24T09:00:00Z",
            question_count: 2,
            answer_count: 2,
            is_submitted: true,
            idempotent: false,
          },
          error: null,
        };
      },
      from: () => {
        throw new Error("no select");
      },
    };
    const r = await submitAssessmentAttempt(fake as never, ATTEMPT_ID);
    expect(r.ok).toBe(true);
    expect(calls).toEqual([
      {
        name: "submit_my_learning_assessment_attempt",
        args: { p_attempt_id: ATTEMPT_ID },
      },
    ]);
  });

  it("loadAssessmentSubmission parses lifecycle without keys/scores", async () => {
    const fake = {
      rpc: async () => ({
        data: {
          attempt_id: ATTEMPT_ID,
          activity_id: ACTIVITY_ID,
          status: "submitted",
          started_at: "t0",
          submitted_at: "t1",
          expired_at: null,
          cancelled_at: null,
          last_activity_at: "t1",
          question_count: 1,
          answer_count: 1,
          is_submitted: true,
        },
        error: null,
      }),
      from: () => {
        throw new Error("no select");
      },
    };
    const r = await loadAssessmentSubmission(fake as never, ATTEMPT_ID);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.is_submitted).toBe(true);
      expect(r.data.submitted_at).toBe("t1");
    }
    expect(
      parseAssessmentSubmissionView({
        attempt_id: ATTEMPT_ID,
        activity_id: ACTIVITY_ID,
        status: "submitted",
        started_at: "t0",
        score: 10,
      })
    ).toBeNull();
    expect(
      parseAssessmentSubmitResultView({
        attempt_id: ATTEMPT_ID,
        activity_id: ACTIVITY_ID,
        status: "submitted",
        submitted_at: "t1",
        started_at: "t0",
        is_submitted: true,
        score: 99,
      })
    ).toBeNull();
  });

  it("module forbids legacy submit/score/progress/keys; UI uses confirm + read-only", () => {
    expect(LEARNING_ASSESSMENT_SUBMISSION_FORBIDDEN.legacySubmit).toBe(
      LEARNING_ATTEMPT_RPCS.submit
    );
    expect(LEARNING_ASSESSMENT_SUBMISSION_FORBIDDEN.score).toBe(
      LEARNING_SCORING_RPCS.score
    );
    expect(LEARNING_ASSESSMENT_SUBMISSION_FORBIDDEN.completeLesson).toBe(
      LEARNING_PROGRESS_RPCS.completeLesson
    );
    expect(SRC).not.toMatch(/\.from\(/);
    expect(SRC).not.toMatch(/submit_learning_attempt/);
    expect(SRC).not.toMatch(/score_learning_attempt/);
    expect(SRC).not.toMatch(/learning_question_answer_keys/);
    expect(SRC).not.toMatch(/complete_learning_lesson/);
    expect(ACTIONS).toMatch(/getServerUser/);
    expect(ACTIONS).toMatch(/submitAssessmentAttempt/);
    expect(ACTIONS).toMatch(/confirmSubmit/);
    expect(ACTIONS).not.toMatch(/createServiceRole|service_role|SERVICE_ROLE/);
    expect(FORM).toMatch(/cannot be changed/);
    expect(FORM).toMatch(/confirmSubmit/);
    expect(PAGE).toMatch(/AssessmentSubmitForm/);
    expect(PAGE).toMatch(/loadAssessmentSubmission/);
    expect(PAGE).toMatch(/disabled=\{!canAnswer\}/);
    expect(PAGE).not.toMatch(/submit_learning_attempt/);
    expect(PAGE).not.toMatch(/answer_key|is_correct|points_earned/);
    expect(PAGE).not.toMatch(/score_learning_attempt|complete_learning_lesson/);
  });
});
