import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  LEARNING_ASSESSMENT_MANUAL_REVIEW_FORBIDDEN,
  LEARNING_ASSESSMENT_MANUAL_REVIEW_FORBIDDEN_INPUT_KEYS,
  LEARNING_ASSESSMENT_MANUAL_REVIEW_RPCS,
  LEARNING_ASSESSMENT_MANUAL_REVIEW_TYPES,
  assertManualReviewInputSafe,
  loadManualReviewAttempt,
  loadManualReviewQueue,
  parseManualReviewAttemptView,
  reviewManualAssessmentAnswer,
  sanitizeManualReviewError,
} from "./assessmentManualReview";
import { LEARNING_SCORING_RPCS } from "./scoringFoundation";
import { LEARNING_PROGRESS_RPCS } from "./progressFoundation";

const ROOT = join(__dirname, "../..");
const MIGRATION =
  "supabase/migrations/20260853_learning_assessment_manual_review_foundation_v1.sql";
const DOC =
  "docs/learning/implementation/ASSESSMENT_MANUAL_REVIEW_FOUNDATION_V1.md";
const COURSES_MIGRATION =
  "supabase/migrations/20260830_learning_courses_foundation_v1.sql";
const SRC = readFileSync(
  join(ROOT, "lib/learning/assessmentManualReview.ts"),
  "utf8"
);
const ACTIONS = readFileSync(
  join(ROOT, "app/learning/assessmentManualReviewActions.ts"),
  "utf8"
);
const QUEUE_PAGE = readFileSync(
  join(
    ROOT,
    "app/learning/instructor/courses/[courseId]/manual-review/page.tsx"
  ),
  "utf8"
);
const ATTEMPT_PAGE = readFileSync(
  join(
    ROOT,
    "app/learning/instructor/courses/[courseId]/manual-review/[attemptId]/page.tsx"
  ),
  "utf8"
);
const GRADE_PANEL = readFileSync(
  join(ROOT, "app/components/learning/AssessmentGradePanel.tsx"),
  "utf8"
);
const GET_GRADE = readFileSync(
  join(ROOT, "lib/learning/assessmentObjectiveGrading.ts"),
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
const QUESTION_ID = "66666666-6666-4666-8666-666666666666";
const COURSE_ID = "33333333-3333-4333-8333-333333333333";

describe("Assessment Manual Review V1 — files", () => {
  it("ships migration after objective grading; extends result tables", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, DOC))).toBe(true);
    expect(MIGRATION > "supabase/migrations/20260852").toBe(true);
    expect(
      readdirSync(join(ROOT, "supabase/migrations"))
    ).toContain(
      "20260853_learning_assessment_manual_review_foundation_v1.sql"
    );
    const sql = read(MIGRATION);
    expect(sql).not.toMatch(/create table public\.learning_assessment_/i);
    expect(sql).toMatch(/manually_reviewed/);
    expect(sql).toMatch(/learner_feedback/);
    expect(sql).toMatch(/manual_points_earned/);
  });
});

describe("Assessment Manual Review V1 — SQL contracts", () => {
  const sql = read(MIGRATION);
  const coursesSql = read(COURSES_MIGRATION);

  it("queue requires course manage auth; rejects unauthorized", () => {
    const fn = stripSqlComments(
      fnBody(sql, "get_learning_assessment_manual_review_queue")
    );
    expect(LEARNING_ASSESSMENT_MANUAL_REVIEW_RPCS.queue).toBe(
      "get_learning_assessment_manual_review_queue"
    );
    expect(fn).toMatch(/security definer/i);
    expect(fn).toMatch(/set search_path\s*=\s*public/i);
    expect(fn).toMatch(/auth\.uid\(\)/);
    expect(fn).toMatch(/can_manage_learning_course\(p_course_id, v_uid\)/);
    expect(fn).toMatch(/is_platform_admin\(v_uid\)/);
    expect(fn).toMatch(/Not allowed to review assessments for this course/);
    expect(fn).toMatch(/pending_manual_review/);
    expect(fn).not.toMatch(/learning_question_answer_keys/);
    expect(fn).not.toMatch(/answer_key/);
  });

  it("can_manage_learning_course requires active course staff", () => {
    const fn = stripSqlComments(
      fnBody(coursesSql, "can_manage_learning_course")
    );
    expect(fn).toMatch(/s\.status = 'active'/);
    expect(fn).toMatch(/lead_instructor/);
  });

  it("attempt review shows learner answers for short_answer and fill_blank only", () => {
    const fn = stripSqlComments(
      fnBody(sql, "get_learning_assessment_attempt_for_review")
    );
    expect(fn).toMatch(/can_manage_learning_course\(v_attempt\.course_id/);
    expect(fn).toMatch(/status is distinct from 'submitted'/);
    expect(fn).toMatch(/learning_assessment_is_manual_review_type/);
    expect(fn).toMatch(/learner_answer/);
    expect(fn).toMatch(/prompt/);
    expect(fn).not.toMatch(/learning_question_answer_keys/);
    expect(LEARNING_ASSESSMENT_MANUAL_REVIEW_TYPES).toEqual([
      "short_answer",
      "fill_blank",
    ]);
  });

  it("review rejects objective, foreign scope, bad points; locks and recalculates", () => {
    const fn = stripSqlComments(
      fnBody(sql, "review_learning_assessment_answer")
    );
    expect(fn).toMatch(/Objective questions cannot be manually reviewed/);
    expect(fn).toMatch(/points_earned cannot be negative/);
    expect(fn).toMatch(/points_earned cannot exceed points_possible/);
    expect(fn).toMatch(/Not allowed to review this attempt/);
    expect(fn).toMatch(/learning_attempt_expire_if_due/);
    expect(fn).toMatch(/for update/i);
    expect(fn).toMatch(/learning_assessment_recalculate_manual_review_totals/);
    expect(fn).toMatch(/manually_reviewed/);
    expect(fn).toMatch(/reviewer_user_id = v_uid/);
    expect(fn).not.toMatch(/update public\.learning_attempt_answers/i);
    expect(fn).not.toMatch(/complete_learning_lesson/);
    expect(fn).not.toMatch(/p_reviewer|p_grading_status|p_passed/);
  });

  it("re-review before finalization allowed; finalized only identical idempotent", () => {
    const fn = stripSqlComments(
      fnBody(sql, "review_learning_assessment_answer")
    );
    expect(fn).toMatch(/pending_manual_review', 'manually_reviewed'/);
    expect(fn).toMatch(/Attempt grading is finalized and cannot be changed/);
    expect(fn).toMatch(/idempotent/);
  });

  it("partial stays partially_graded; final uses authoritative passing_score", () => {
    const recalc = stripSqlComments(
      fnBody(sql, "learning_assessment_recalculate_manual_review_totals")
    );
    expect(recalc).toMatch(/partially_graded/);
    expect(recalc).toMatch(/v_status := 'graded'/);
    expect(recalc).toMatch(/learning_activity_settings/);
    expect(recalc).toMatch(/passing_score/);
    expect(recalc).toMatch(/v_passed := null/);
    expect(recalc).toMatch(/final_percentage/);
    expect(recalc).not.toMatch(/complete_learning_lesson/);
    expect(recalc).not.toMatch(/certificate/i);
  });

  it("learner grade read exposes feedback and finals without keys", () => {
    const fn = stripSqlComments(
      fnBody(sql, "get_my_learning_assessment_grade")
    );
    expect(fn).toMatch(/learner_feedback/);
    expect(fn).toMatch(/final_percentage/);
    expect(fn).toMatch(/manual_points_earned/);
    expect(fn).toMatch(/passed/);
    expect(fn).not.toMatch(/learning_question_answer_keys/);
    expect(fn).not.toMatch(/reviewer_user_id/);
    expect(GET_GRADE).toMatch(/learner_feedback/);
  });

  it("grants/revokes/search_path correct", () => {
    expect(sql).toMatch(
      /revoke all on function public\.get_learning_assessment_manual_review_queue\(uuid\)\s+from public, anon/
    );
    expect(sql).toMatch(
      /grant execute on function public\.review_learning_assessment_answer\(uuid, uuid, numeric, text\)\s+to authenticated/
    );
    expect(sql).toMatch(
      /revoke all on function public\.learning_assessment_recalculate_manual_review_totals\(uuid\)\s+from public, anon, authenticated/
    );
  });
});

describe("Assessment Manual Review V1 — adapter", () => {
  it("rejects injected totals/status/reviewer identity and bad points", () => {
    expect(
      assertManualReviewInputSafe({
        attempt_id: ATTEMPT_ID,
        question_id: QUESTION_ID,
        points_earned: 1,
        reviewer_user_id: "x",
      }).ok
    ).toBe(false);
    expect(
      assertManualReviewInputSafe({
        attempt_id: ATTEMPT_ID,
        question_id: QUESTION_ID,
        points_earned: 1,
        passed: true,
      }).ok
    ).toBe(false);
    expect(
      assertManualReviewInputSafe({
        attempt_id: ATTEMPT_ID,
        question_id: QUESTION_ID,
        points_earned: -1,
      }).ok
    ).toBe(false);
    expect(
      assertManualReviewInputSafe({
        attempt_id: ATTEMPT_ID,
        question_id: QUESTION_ID,
        points_earned: 2,
        feedback: "ok",
      }).ok
    ).toBe(true);
    expect(LEARNING_ASSESSMENT_MANUAL_REVIEW_FORBIDDEN_INPUT_KEYS).toContain(
      "reviewer_user_id"
    );
  });

  it("sanitizes ownership and lifecycle errors", () => {
    expect(
      sanitizeManualReviewError("Not allowed to review this attempt")
    ).toMatch(/not allowed/i);
    expect(
      sanitizeManualReviewError("Attempt is active and cannot be reviewed")
    ).toMatch(/submitted/i);
    expect(
      sanitizeManualReviewError("Objective questions cannot be manually reviewed")
    ).toMatch(/objective/i);
  });

  it("queue and review call staff RPCs only (no table access)", async () => {
    const calls: string[] = [];
    const fake = {
      rpc: async (name: string) => {
        calls.push(name);
        if (name === LEARNING_ASSESSMENT_MANUAL_REVIEW_RPCS.queue) {
          return {
            data: { course_id: COURSE_ID, items: [], item_count: 0 },
            error: null,
          };
        }
        if (name === LEARNING_ASSESSMENT_MANUAL_REVIEW_RPCS.getAttempt) {
          return {
            data: {
              attempt_id: ATTEMPT_ID,
              activity_id: "44444444-4444-4444-8444-444444444444",
              course_id: COURSE_ID,
              learner_user_id: "55555555-5555-4555-8555-555555555555",
              attempt_status: "submitted",
              submitted_at: "t",
              grading_status: "partially_graded",
              has_pending_manual_review: true,
              objective_points_earned: 1,
              objective_points_possible: 1,
              manual_points_earned: 0,
              pending_manual_points: 2,
              total_points_earned: 1,
              total_points_possible: 3,
              questions: [],
            },
            error: null,
          };
        }
        return {
          data: {
            attempt_id: ATTEMPT_ID,
            question_id: QUESTION_ID,
            result_state: "manually_reviewed",
            points_earned: 2,
            points_possible: 2,
            learner_feedback: null,
            reviewed_at: "t",
            idempotent: false,
            grading_status: "graded",
          },
          error: null,
        };
      },
      from: () => {
        throw new Error("no select");
      },
    };
    expect((await loadManualReviewQueue(fake as never, COURSE_ID)).ok).toBe(
      true
    );
    expect((await loadManualReviewAttempt(fake as never, ATTEMPT_ID)).ok).toBe(
      true
    );
    expect(
      (
        await reviewManualAssessmentAnswer(
          fake as never,
          ATTEMPT_ID,
          QUESTION_ID,
          2,
          null
        )
      ).ok
    ).toBe(true);
    expect(calls).toEqual([
      "get_learning_assessment_manual_review_queue",
      "get_learning_assessment_attempt_for_review",
      "review_learning_assessment_answer",
    ]);
    expect(
      parseManualReviewAttemptView({
        attempt_id: ATTEMPT_ID,
        activity_id: "44444444-4444-4444-8444-444444444444",
        course_id: COURSE_ID,
        learner_user_id: "55555555-5555-4555-8555-555555555555",
        attempt_status: "submitted",
        grading_status: "partially_graded",
        answer_key: { x: 1 },
        questions: [],
      })
    ).toBeNull();
  });

  it("module forbids score/keys/progress; UI is staff review + learner feedback", () => {
    expect(LEARNING_ASSESSMENT_MANUAL_REVIEW_FORBIDDEN.staffScore).toBe(
      LEARNING_SCORING_RPCS.score
    );
    expect(LEARNING_ASSESSMENT_MANUAL_REVIEW_FORBIDDEN.completeLesson).toBe(
      LEARNING_PROGRESS_RPCS.completeLesson
    );
    expect(SRC).not.toMatch(/\.from\(/);
    expect(SRC).not.toMatch(/score_learning_attempt/);
    expect(SRC).not.toMatch(/complete_learning_lesson/);
    expect(ACTIONS).toMatch(/getServerUser/);
    expect(ACTIONS).not.toMatch(/SERVICE_ROLE|service_role/);
    expect(QUEUE_PAGE).toMatch(/loadManualReviewQueue/);
    expect(ATTEMPT_PAGE).toMatch(/ManualReviewAnswerForm/);
    expect(ATTEMPT_PAGE).toMatch(/Objective results cannot be changed/);
    expect(GRADE_PANEL).toMatch(/learner_feedback|Feedback/);
    expect(GRADE_PANEL).toMatch(/Not final yet|pending/i);
  });
});
