import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  LEARNING_ASSESSMENT_ATTEMPT_FORBIDDEN,
  LEARNING_ASSESSMENT_ATTEMPT_RPCS,
  LEARNING_ASSESSMENT_ATTEMPT_ROUTES,
  cancelAssessmentAttempt,
  loadAssessmentAttempt,
  parseAssessmentAttemptStartView,
  parseAssessmentAttemptView,
  sanitizeAssessmentAttemptError,
  startAssessmentAttempt,
} from "./assessmentAttemptFoundation";
import { LEARNING_ASSESSMENT_DELIVERY_RPCS } from "./assessmentDelivery";
import { LEARNING_ATTEMPT_RPCS } from "./attemptsFoundation";
import { LEARNING_SCORING_RPCS } from "./scoringFoundation";

const ROOT = join(__dirname, "../..");
const MIGRATION =
  "supabase/migrations/20260849_learning_assessment_attempt_foundation_v1.sql";
const DOC =
  "docs/learning/implementation/ASSESSMENT_ATTEMPT_FOUNDATION_V1.md";
const SRC = readFileSync(
  join(ROOT, "lib/learning/assessmentAttemptFoundation.ts"),
  "utf8"
);
const ACTIONS = readFileSync(
  join(ROOT, "app/learning/assessmentAttemptActions.ts"),
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

const ACTIVITY_ID = "44444444-4444-4444-8444-444444444444";
const ATTEMPT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const QUESTION_ID = "66666666-6666-4666-8666-666666666666";

describe("Assessment Attempt Foundation V1 — files", () => {
  it("ships migration after assessment delivery; no second attempts table", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, DOC))).toBe(true);
    expect(MIGRATION > "supabase/migrations/20260848").toBe(true);
    const sql = read(MIGRATION);
    expect(sql).not.toMatch(/create table/i);
    const names = readdirSync(join(ROOT, "supabase/migrations"));
    expect(names).toContain(
      "20260849_learning_assessment_attempt_foundation_v1.sql"
    );
  });
});

describe("Assessment Attempt Foundation V1 — SQL contracts", () => {
  const sql = read(MIGRATION);

  it("start reuses delivery RPC then start_learning_attempt", () => {
    const fn = stripSqlComments(
      fnBody(sql, "start_my_learning_assessment_attempt")
    );
    expect(LEARNING_ASSESSMENT_ATTEMPT_RPCS.start).toBe(
      "start_my_learning_assessment_attempt"
    );
    expect(fn).toMatch(/security definer/i);
    expect(fn).toMatch(/set search_path\s*=\s*public/i);
    expect(fn).toMatch(/auth\.uid\(\)/);
    expect(fn).toMatch(/get_my_learning_activity_assessment/);
    expect(fn).toMatch(/start_learning_attempt/);
    expect(fn).toMatch(/no published questions/i);
    expect(fn).not.toMatch(/save_learning_attempt_answer/);
    expect(fn).not.toMatch(/score_learning_attempt/);
    expect(fn).not.toMatch(/learning_question_answer_keys/);
    expect(fn).not.toMatch(/answer_key/);
  });

  it("get returns lifecycle + expires_at metadata and never answers/scores", () => {
    const fn = stripSqlComments(
      fnBody(sql, "get_my_learning_assessment_attempt")
    );
    expect(fn).toMatch(/learning_attempt_expire_if_due/);
    expect(fn).toMatch(/has_learning_course_access/);
    expect(fn).toMatch(/expires_at/);
    expect(fn).toMatch(/remaining_seconds/);
    expect(fn).toMatch(/questions_snapshot/);
    expect(fn).not.toMatch(/learning_attempt_answers/);
    expect(fn).not.toMatch(/answer_payload/);
    expect(fn).not.toMatch(/score_learning_attempt/);
    expect(fn).not.toMatch(/'score'/);
    expect(fn).not.toMatch(/answer_key/);
    expect(fn).not.toMatch(/\binsert\b/i);
    expect(fn).not.toMatch(/learning_lesson_progress/);
  });

  it("cancel delegates to cancel_learning_attempt", () => {
    const fn = stripSqlComments(
      fnBody(sql, "cancel_my_learning_assessment_attempt")
    );
    expect(fn).toMatch(/cancel_learning_attempt/);
    expect(fn).not.toMatch(/submit_learning_attempt/);
  });

  it("grants EXECUTE to authenticated; revokes public/anon", () => {
    for (const name of Object.values(LEARNING_ASSESSMENT_ATTEMPT_RPCS)) {
      expect(sql).toMatch(
        new RegExp(
          `revoke all on function public\\.${name}\\(uuid\\)\\s+from public, anon`
        )
      );
      expect(sql).toMatch(
        new RegExp(
          `grant execute on function public\\.${name}\\(uuid\\)\\s+to authenticated`
        )
      );
    }
  });
});

describe("Assessment Attempt Foundation V1 — adapter", () => {
  it("parses start and attempt views without answer fields", () => {
    const start = parseAssessmentAttemptStartView({
      attempt_id: ATTEMPT_ID,
      activity_id: ACTIVITY_ID,
      status: "active",
      attempt_number: 1,
      started_at: "2026-01-01T00:00:00Z",
      resumed: false,
      question_count: 1,
    });
    expect(start?.attempt_id).toBe(ATTEMPT_ID);

    const view = parseAssessmentAttemptView({
      attempt_id: ATTEMPT_ID,
      activity_id: ACTIVITY_ID,
      lesson_id: "33333333-3333-4333-8333-333333333333",
      course_id: "11111111-1111-4111-8111-111111111111",
      status: "active",
      attempt_number: 1,
      started_at: "2026-01-01T00:00:00Z",
      last_activity_at: "2026-01-01T00:00:00Z",
      submitted_at: null,
      expired_at: null,
      cancelled_at: null,
      time_limit_seconds: 60,
      max_attempts: 3,
      expires_at: "2026-01-01T00:01:00Z",
      remaining_seconds: 40,
      question_count: 1,
      questions: [
        {
          question_id: QUESTION_ID,
          question_type: "true_false",
          position: 0,
          content: { prompt: "OK?", correct: true },
          points: null,
        },
      ],
    });
    expect(view?.questions[0].content).not.toHaveProperty("correct");
    expect(JSON.stringify(view)).not.toMatch(/answer_key|answer_payload/);
  });

  it("startAssessmentAttempt calls only assessment start RPC", async () => {
    const calls: string[] = [];
    const fake = {
      rpc: async (name: string) => {
        calls.push(name);
        return {
          data: {
            attempt_id: ATTEMPT_ID,
            activity_id: ACTIVITY_ID,
            status: "active",
            attempt_number: 1,
            started_at: "t",
            resumed: true,
            question_count: 2,
          },
          error: null,
        };
      },
      from: () => {
        throw new Error("no select");
      },
    };
    const r = await startAssessmentAttempt(fake as never, ACTIVITY_ID);
    expect(r.ok).toBe(true);
    expect(calls).toEqual(["start_my_learning_assessment_attempt"]);
  });

  it("load/cancel use assessment RPCs only", async () => {
    const calls: string[] = [];
    const fake = {
      rpc: async (name: string) => {
        calls.push(name);
        if (name === "get_my_learning_assessment_attempt") {
          return {
            data: {
              attempt_id: ATTEMPT_ID,
              activity_id: ACTIVITY_ID,
              lesson_id: "33333333-3333-4333-8333-333333333333",
              course_id: "11111111-1111-4111-8111-111111111111",
              status: "active",
              attempt_number: 1,
              started_at: "t",
              last_activity_at: "t",
              submitted_at: null,
              expired_at: null,
              cancelled_at: null,
              time_limit_seconds: null,
              max_attempts: null,
              expires_at: null,
              remaining_seconds: null,
              question_count: 0,
              questions: [],
            },
            error: null,
          };
        }
        return {
          data: {
            attempt_id: ATTEMPT_ID,
            status: "cancelled",
            cancelled_at: "t",
          },
          error: null,
        };
      },
    };
    expect((await loadAssessmentAttempt(fake as never, ATTEMPT_ID)).ok).toBe(
      true
    );
    expect((await cancelAssessmentAttempt(fake as never, ATTEMPT_ID)).ok).toBe(
      true
    );
    expect(calls).toEqual([
      "get_my_learning_assessment_attempt",
      "cancel_my_learning_assessment_attempt",
    ]);
  });

  it("sanitizes auth and max-attempts errors", () => {
    expect(sanitizeAssessmentAttemptError("Authentication required")).toMatch(
      /not allowed/i
    );
    expect(
      sanitizeAssessmentAttemptError("Maximum attempts reached for this activity")
    ).toMatch(/Maximum attempts/i);
  });

  it("forbids save/submit/score on this surface", () => {
    expect(LEARNING_ASSESSMENT_ATTEMPT_FORBIDDEN.saveAnswer).toBe(
      LEARNING_ATTEMPT_RPCS.saveAnswer
    );
    expect(LEARNING_ASSESSMENT_ATTEMPT_FORBIDDEN.submit).toBe(
      LEARNING_ATTEMPT_RPCS.submit
    );
    expect(LEARNING_ASSESSMENT_ATTEMPT_FORBIDDEN.score).toBe(
      LEARNING_SCORING_RPCS.score
    );
    expect(LEARNING_ASSESSMENT_ATTEMPT_FORBIDDEN.deliveryOnlyRead).toBe(
      LEARNING_ASSESSMENT_DELIVERY_RPCS.getMyActivityAssessment
    );
    expect(SRC).not.toMatch(/save_learning_attempt_answer/);
    expect(SRC).not.toMatch(/submit_learning_attempt/);
    expect(SRC).not.toMatch(/score_learning_attempt/);
    expect(SRC).not.toMatch(/\.from\(/);
    expect(ACTIONS).toMatch(/startAssessmentAttempt/);
    expect(ACTIONS).toMatch(/cancelAssessmentAttempt/);
    expect(ACTIONS).not.toMatch(/saveAnswer|submit/);
    expect(
      LEARNING_ASSESSMENT_ATTEMPT_ROUTES.attempt(ACTIVITY_ID, ATTEMPT_ID)
    ).toBe(
      `/learning/activities/${ACTIVITY_ID}/assessment-attempts/${ATTEMPT_ID}`
    );
  });
});
