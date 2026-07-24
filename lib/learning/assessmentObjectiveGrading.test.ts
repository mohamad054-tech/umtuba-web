import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  LEARNING_ASSESSMENT_GRADING_FORBIDDEN,
  LEARNING_ASSESSMENT_GRADING_FORBIDDEN_INPUT_KEYS,
  LEARNING_ASSESSMENT_GRADING_RPCS,
  LEARNING_ASSESSMENT_NUMERIC_POLICY,
  LEARNING_ASSESSMENT_OBJECTIVE_TYPES,
  LEARNING_ASSESSMENT_SUBJECTIVE_TYPES,
  assertAssessmentGradeInputSafe,
  gradeAssessmentAttempt,
  loadAssessmentGrade,
  parseAssessmentGradeView,
  sanitizeAssessmentGradeError,
} from "./assessmentObjectiveGrading";
import { LEARNING_SCORING_RPCS } from "./scoringFoundation";
import { LEARNING_PROGRESS_RPCS } from "./progressFoundation";

const ROOT = join(__dirname, "../..");
const MIGRATION =
  "supabase/migrations/20260852_learning_assessment_objective_grading_foundation_v1.sql";
const DOC =
  "docs/learning/implementation/ASSESSMENT_OBJECTIVE_GRADING_FOUNDATION_V1.md";
const SCORING_MIGRATION =
  "supabase/migrations/20260839_learning_scoring_foundation_v1.sql";
const SRC = readFileSync(
  join(ROOT, "lib/learning/assessmentObjectiveGrading.ts"),
  "utf8"
);
const ACTIONS = readFileSync(
  join(ROOT, "app/learning/assessmentGradingActions.ts"),
  "utf8"
);
const PAGE = readFileSync(
  join(
    ROOT,
    "app/learning/activities/[activityId]/assessment-attempts/[attemptId]/page.tsx"
  ),
  "utf8"
);
const PANEL = readFileSync(
  join(ROOT, "app/components/learning/AssessmentGradePanel.tsx"),
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
const QUESTION_ID = "66666666-6666-4666-8666-666666666666";

describe("Assessment Objective Grading V1 — files", () => {
  it("ships migration after submission; extends existing result tables", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, DOC))).toBe(true);
    expect(MIGRATION > "supabase/migrations/20260851").toBe(true);
    expect(
      readdirSync(join(ROOT, "supabase/migrations"))
    ).toContain(
      "20260852_learning_assessment_objective_grading_foundation_v1.sql"
    );
    const sql = read(MIGRATION);
    expect(sql).toMatch(/learning_attempt_results/);
    expect(sql).toMatch(/learning_attempt_answer_results/);
    expect(sql).not.toMatch(/create table public\.learning_assessment_/i);
  });
});

describe("Assessment Objective Grading V1 — SQL contracts", () => {
  const sql = read(MIGRATION);
  const scoringSql = read(SCORING_MIGRATION);

  it("owner can grade own submitted attempt; foreign/active/cancelled/expired rejected", () => {
    const fn = stripSqlComments(
      fnBody(sql, "grade_my_learning_assessment_attempt")
    );
    expect(LEARNING_ASSESSMENT_GRADING_RPCS.grade).toBe(
      "grade_my_learning_assessment_attempt"
    );
    expect(fn).toMatch(/security definer/i);
    expect(fn).toMatch(/set search_path\s*=\s*public/i);
    expect(fn).toMatch(/auth\.uid\(\)/);
    expect(fn).toMatch(/learning_attempt_expire_if_due/);
    expect(fn).toMatch(/Not allowed to grade this attempt/);
    expect(fn).toMatch(/status is distinct from 'submitted'/);
    expect(fn).toMatch(/cannot be graded/);
    expect(fn).not.toMatch(/p_score|p_points|p_correct|p_grading_status/);
    expect(fn).not.toMatch(/complete_learning_lesson/);
    expect(fn).not.toMatch(/certificate/i);
  });

  it("apply grades objective types and leaves subjective pending_manual_review", () => {
    const fn = stripSqlComments(
      fnBody(sql, "learning_assessment_grade_apply_attempt")
    );
    expect(LEARNING_ASSESSMENT_OBJECTIVE_TYPES).toEqual([
      "multiple_choice_single",
      "multiple_choice_multiple",
      "true_false",
      "numeric",
    ]);
    expect(LEARNING_ASSESSMENT_SUBJECTIVE_TYPES).toEqual([
      "short_answer",
      "fill_blank",
    ]);
    expect(fn).toMatch(/learning_scoring_evaluate_answer/);
    expect(fn).toMatch(/pending_manual_review/);
    expect(fn).toMatch(/not_answered/);
    expect(fn).toMatch(/for update/i);
    expect(fn).toMatch(/delete from public\.learning_attempt_answer_results/);
    expect(fn).not.toMatch(/update public\.learning_attempt_answers/i);
    expect(fn).not.toMatch(/learning_lesson_progress/);
    expect(fn).not.toMatch(/complete_learning_lesson/);
    // Subjective answered path must not call evaluate_answer for short_answer.
    const subjectiveBlock = fn.slice(
      fn.indexOf("learning_assessment_is_subjective_type"),
      fn.indexOf("else", fn.indexOf("learning_assessment_is_subjective_type"))
    );
    expect(subjectiveBlock).not.toMatch(/learning_scoring_evaluate_answer/);
  });

  it("numeric policy reuses exact/tolerance contract; MC set compare is duplicate-safe", () => {
    expect(LEARNING_ASSESSMENT_NUMERIC_POLICY).toMatch(/tolerance/);
    const evalFn = stripSqlComments(
      fnBody(scoringSql, "learning_scoring_evaluate_answer")
    );
    expect(evalFn).toMatch(/select distinct jsonb_array_elements_text/);
    expect(evalFn).toMatch(/abs\(v_learner_num - v_key_num\)/);
    expect(evalFn).toMatch(/coalesce\(v_tolerance, 0\)/);
  });

  it("fail closed on malformed snapshot, key, and answer payload", () => {
    const fn = stripSqlComments(
      fnBody(sql, "learning_assessment_grade_apply_attempt")
    );
    expect(fn).toMatch(/Attempt questions snapshot is malformed/);
    expect(fn).toMatch(/Answer key missing for one or more objective questions/);
    expect(fn).toMatch(/Answer key is malformed/);
    expect(fn).toMatch(/Learner answer payload is malformed/);
    expect(fn).toMatch(/learning_assessment_objective_key_is_valid/);
  });

  it("unanswered objective follows not_answered policy; concurrent lock + unique results", () => {
    const fn = stripSqlComments(
      fnBody(sql, "learning_assessment_grade_apply_attempt")
    );
    expect(fn).toMatch(/'not_answered'/);
    expect(fn).toMatch(/delete from public\.learning_attempt_answer_results/);
    expect(fn).toMatch(/for update/i);
    expect(scoringSql).toMatch(
      /constraint learning_attempt_answer_results_attempt_question_unique\s+unique \(attempt_id, question_id\)/
    );
  });

  it("get grade is owner-only learner-safe; never returns keys", () => {
    const fn = stripSqlComments(
      fnBody(sql, "get_my_learning_assessment_grade")
    );
    expect(fn).toMatch(/Not allowed to read this grade/);
    expect(fn).toMatch(/objective_points_earned/);
    expect(fn).toMatch(/pending_manual_points/);
    expect(fn).toMatch(/objective_percentage/);
    expect(fn).toMatch(/has_pending_manual_review/);
    expect(fn).toMatch(/feedback_code/);
    expect(fn).not.toMatch(/answer_payload/);
    expect(fn).not.toMatch(/correct_key/);
    expect(fn).not.toMatch(/accepted/);
    expect(fn).not.toMatch(/learning_question_answer_keys/);
    expect(fn).not.toMatch(/'answer_key'/);
  });

  it("grants/revokes/search_path correct; helpers revoked from authenticated", () => {
    expect(sql).toMatch(
      /revoke all on function public\.grade_my_learning_assessment_attempt\(uuid\)\s+from public, anon/
    );
    expect(sql).toMatch(
      /grant execute on function public\.grade_my_learning_assessment_attempt\(uuid\)\s+to authenticated/
    );
    expect(sql).toMatch(
      /revoke all on function public\.get_my_learning_assessment_grade\(uuid\)\s+from public, anon/
    );
    expect(sql).toMatch(
      /grant execute on function public\.get_my_learning_assessment_grade\(uuid\)\s+to authenticated/
    );
    expect(sql).toMatch(
      /revoke all on function public\.learning_assessment_grade_apply_attempt\(uuid, uuid\)\s+from public, anon, authenticated/
    );
    expect(
      stripSqlComments(fnBody(sql, "grade_my_learning_assessment_attempt"))
    ).toMatch(/set search_path\s*=\s*public/i);
  });

  it("does not mutate progress/certificates/analytics and keeps passed null", () => {
    const apply = stripSqlComments(
      fnBody(sql, "learning_assessment_grade_apply_attempt")
    );
    expect(apply).toMatch(/passed = null/);
    expect(apply).not.toMatch(/learning_progress/);
    expect(apply).not.toMatch(/complete_learning_lesson/);
    expect(apply).not.toMatch(/issue_.*certificate|certificate_/i);
    expect(apply).not.toMatch(/insert into public\.learning_.*analytics/i);
    expect(apply).not.toMatch(/reward/i);
  });
});

describe("Assessment Objective Grading V1 — adapter", () => {
  it("rejects injected score/points/correctness/grading state", () => {
    expect(
      assertAssessmentGradeInputSafe({
        attempt_id: ATTEMPT_ID,
        score: 100,
      }).ok
    ).toBe(false);
    expect(
      assertAssessmentGradeInputSafe({
        attempt_id: ATTEMPT_ID,
        points_earned: 5,
      }).ok
    ).toBe(false);
    expect(
      assertAssessmentGradeInputSafe({
        attempt_id: ATTEMPT_ID,
        is_correct: true,
      }).ok
    ).toBe(false);
    expect(
      assertAssessmentGradeInputSafe({
        attempt_id: ATTEMPT_ID,
        grading_status: "graded",
      }).ok
    ).toBe(false);
    expect(
      assertAssessmentGradeInputSafe({
        attempt_id: ATTEMPT_ID,
        activity_id: ACTIVITY_ID,
      }).ok
    ).toBe(true);
    expect(LEARNING_ASSESSMENT_GRADING_FORBIDDEN_INPUT_KEYS).toContain("score");
  });

  it("sanitizes ownership and lifecycle errors", () => {
    expect(
      sanitizeAssessmentGradeError("Not allowed to grade this attempt")
    ).toMatch(/not allowed/i);
    expect(
      sanitizeAssessmentGradeError("Attempt is active and cannot be graded")
    ).toMatch(/submitted/i);
    expect(
      sanitizeAssessmentGradeError("Attempt is cancelled and cannot be graded")
    ).toMatch(/submitted/i);
    expect(
      sanitizeAssessmentGradeError("Attempt is expired and cannot be graded")
    ).toMatch(/submitted/i);
  });

  it("gradeAssessmentAttempt calls assessment grade RPC only", async () => {
    const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
    const fake = {
      rpc: async (name: string, args: Record<string, unknown>) => {
        calls.push({ name, args });
        return {
          data: {
            attempt_id: ATTEMPT_ID,
            activity_id: ACTIVITY_ID,
            grading_status: "partially_graded",
            graded_at: "2026-07-24T12:00:00Z",
            objective_points_earned: 1,
            objective_points_possible: 1,
            pending_manual_points: 2,
            total_points_possible: 3,
            objective_percentage: 100,
            has_pending_manual_review: true,
            is_final: false,
            question_results: [
              {
                question_id: QUESTION_ID,
                question_type: "true_false",
                result_state: "correct",
                points_possible: 1,
                points_earned: 1,
                feedback_code: "RESULT_CORRECT",
              },
            ],
          },
          error: null,
        };
      },
      from: () => {
        throw new Error("no select");
      },
    };
    const r = await gradeAssessmentAttempt(fake as never, ATTEMPT_ID);
    expect(r.ok).toBe(true);
    expect(calls).toEqual([
      {
        name: "grade_my_learning_assessment_attempt",
        args: { p_attempt_id: ATTEMPT_ID },
      },
    ]);
  });

  it("loadAssessmentGrade rejects key leakage and parses learner-safe fields", async () => {
    const fake = {
      rpc: async () => ({
        data: {
          attempt_id: ATTEMPT_ID,
          activity_id: ACTIVITY_ID,
          grading_status: "graded",
          graded_at: "t1",
          objective_points_earned: 2,
          objective_points_possible: 2,
          pending_manual_points: 0,
          total_points_possible: 2,
          objective_percentage: 100,
          has_pending_manual_review: false,
          is_final: true,
          question_results: [],
        },
        error: null,
      }),
      from: () => {
        throw new Error("no select");
      },
    };
    const r = await loadAssessmentGrade(fake as never, ATTEMPT_ID);
    expect(r.ok).toBe(true);
    expect(
      parseAssessmentGradeView({
        attempt_id: ATTEMPT_ID,
        activity_id: ACTIVITY_ID,
        grading_status: "graded",
        answer_key: { correct: true },
        question_results: [],
      })
    ).toBeNull();
  });

  it("module forbids staff score/keys/progress; UI shows objective vs pending", () => {
    expect(LEARNING_ASSESSMENT_GRADING_FORBIDDEN.staffScore).toBe(
      LEARNING_SCORING_RPCS.score
    );
    expect(LEARNING_ASSESSMENT_GRADING_FORBIDDEN.completeLesson).toBe(
      LEARNING_PROGRESS_RPCS.completeLesson
    );
    expect(SRC).not.toMatch(/\.from\(/);
    expect(SRC).not.toMatch(/score_learning_attempt/);
    expect(SRC).not.toMatch(/learning_question_answer_keys/);
    expect(SRC).not.toMatch(/complete_learning_lesson/);
    expect(ACTIONS).toMatch(/getServerUser/);
    expect(ACTIONS).toMatch(/gradeAssessmentAttempt/);
    expect(ACTIONS).not.toMatch(/createServiceRole|service_role|SERVICE_ROLE/);
    expect(PANEL).toMatch(/Grade objective questions/);
    expect(PANEL).toMatch(/not final/i);
    expect(PANEL).toMatch(/Answer keys are never shown/);
    expect(PAGE).toMatch(/AssessmentGradePanel/);
    expect(PAGE).toMatch(/loadAssessmentGrade/);
    expect(PAGE).not.toMatch(/score_learning_attempt/);
  });
});
