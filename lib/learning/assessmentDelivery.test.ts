import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  LEARNING_ASSESSMENT_DELIVERY_FORBIDDEN,
  LEARNING_ASSESSMENT_DELIVERY_RPCS,
  LEARNING_ASSESSMENT_DELIVERY_ROUTES,
  loadAssessmentDelivery,
  parseAssessmentDeliveryView,
  sanitizeAssessmentDeliveryError,
  toLearnerSafeAssessmentQuestion,
} from "./assessmentDelivery";
import {
  LEARNING_ATTEMPT_HELPERS,
  LEARNING_ATTEMPT_RPCS,
} from "./attemptsFoundation";
import { LEARNING_LEARNER_FORBIDDEN } from "./learnerDelivery";
import { LEARNING_SCORING_RPCS } from "./scoringFoundation";

const ROOT = join(__dirname, "../..");
const MIGRATION =
  "supabase/migrations/20260848_learning_assessment_delivery_minimal_v1.sql";
const DUE_UX_MIGRATION =
  "supabase/migrations/20260909_learning_assessment_due_ux_followthrough_v1.sql";
const DOC = "docs/learning/implementation/ASSESSMENT_DELIVERY_MINIMAL_V1.md";
const DUE_UX_DOC =
  "docs/learning/implementation/LEARNING_ASSESSMENT_DUE_UX_FOLLOWTHROUGH_V1.md";
const SRC = readFileSync(
  join(ROOT, "lib/learning/assessmentDelivery.ts"),
  "utf8"
);
const PAGE = readFileSync(
  join(
    ROOT,
    "app/learning/activities/[activityId]/assessment/page.tsx"
  ),
  "utf8"
);

function read(rel: string): string {
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
const QUESTION_ID = "66666666-6666-4666-8666-666666666666";

describe("Assessment Delivery Minimal V1 — files & ordering", () => {
  it("ships migration, module, docs after Progress Mutations", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, DOC))).toBe(true);
    expect(existsSync(join(ROOT, "lib/learning/assessmentDelivery.ts"))).toBe(
      true
    );
    expect(MIGRATION > "supabase/migrations/20260845").toBe(true);
    const names = readdirSync(join(ROOT, "supabase/migrations"));
    expect(names).toContain(
      "20260848_learning_assessment_delivery_minimal_v1.sql"
    );
  });
});

describe("Assessment Delivery Minimal V1 — SQL security contract", () => {
  const sql = read(MIGRATION);
  const fn = fnBody(sql, "get_my_learning_activity_assessment");
  const code = stripSqlComments(fn);

  it("maps constant to get_my_learning_activity_assessment", () => {
    expect(LEARNING_ASSESSMENT_DELIVERY_RPCS.getMyActivityAssessment).toBe(
      "get_my_learning_activity_assessment"
    );
  });

  it("is SECURITY DEFINER with search_path = public", () => {
    expect(fn).toMatch(/security definer/i);
    expect(fn).toMatch(/set search_path\s*=\s*public/i);
    expect(fn).toMatch(/stable/i);
  });

  it("requires auth.uid and has_learning_course_access", () => {
    expect(code).toMatch(/auth\.uid\(\)/);
    expect(code).toMatch(/Authentication required/);
    expect(code).toMatch(/has_learning_course_access\(v_course\.id, v_uid\)/);
    expect(code).toMatch(/Not entitled to this course/);
  });

  it("requires active space and fully published chain", () => {
    expect(code).toMatch(/v_space_status is distinct from 'active'/);
    expect(code).toMatch(/v_program\.status is distinct from 'published'/);
    expect(code).toMatch(/v_course\.status is distinct from 'published'/);
    expect(code).toMatch(/v_section\.status is distinct from 'published'/);
    expect(code).toMatch(/v_lesson\.status is distinct from 'published'/);
    expect(code).toMatch(/v_activity\.status is distinct from 'published'/);
  });

  it("reuses snapshot builder and never touches answer keys", () => {
    expect(code).toMatch(/learning_attempt_build_questions_snapshot/);
    expect(code).not.toMatch(/learning_question_answer_keys/);
    expect(code).not.toMatch(/answer_key/);
    expect(code).not.toMatch(/correct_key/);
    expect(code).not.toMatch(/correct_keys/);
  });

  it("performs no writes and creates no attempts", () => {
    expect(code).not.toMatch(/\binsert\b/i);
    expect(code).not.toMatch(/\bupdate\b/i);
    expect(code).not.toMatch(/\bdelete\b/i);
    expect(code).not.toMatch(/learning_attempts/);
    expect(code).not.toMatch(/learning_attempt_answers/);
    expect(code).not.toMatch(/learning_lesson_progress/);
    expect(code).not.toMatch(/start_learning_attempt/);
    expect(code).not.toMatch(/score_learning_attempt/);
  });

  it("returns only learner-safe top-level fields", () => {
    expect(code).toMatch(/'activity_id'/);
    expect(code).toMatch(/'questions'/);
    expect(code).toMatch(/'hints'/);
    expect(code).toMatch(/'is_required'/);
    expect(code).toMatch(/'max_attempts'/);
    expect(code).toMatch(/'time_limit_seconds'/);
    expect(code).not.toMatch(/passing_score/);
    expect(code).not.toMatch(/evaluation_mode/);
    expect(code).not.toMatch(/show_result_policy/);
    expect(code).not.toMatch(/created_by/);
  });

  it("grants EXECUTE to authenticated only (revokes public/anon)", () => {
    expect(sql).toMatch(
      /revoke all on function public\.get_my_learning_activity_assessment\(uuid\)\s+from public, anon/
    );
    expect(sql).toMatch(
      /grant execute on function public\.get_my_learning_activity_assessment\(uuid\)\s+to authenticated/
    );
  });

  it("does not grant snapshot builder to authenticated", () => {
    expect(sql).not.toMatch(
      /grant execute on function public\.learning_attempt_build_questions_snapshot/
    );
  });
});

describe("Assessment Delivery Minimal V1 — adapter", () => {
  it("parses ordered learner-safe questions and strips correctness keys", () => {
    const view = parseAssessmentDeliveryView({
      activity_id: ACTIVITY_ID,
      lesson_id: "33333333-3333-4333-8333-333333333333",
      course_id: "11111111-1111-4111-8111-111111111111",
      name: "Quiz",
      slug: "quiz",
      type: "quiz",
      description: null,
      hints: { is_required: true, max_attempts: 2, time_limit_seconds: null },
      question_count: 2,
      questions: [
        {
          question_id: "77777777-7777-4777-8777-777777777777",
          question_type: "true_false",
          position: 1,
          content: { prompt: "Second?", correct: true },
          points: 1,
        },
        {
          question_id: QUESTION_ID,
          question_type: "true_false",
          position: 0,
          content: { prompt: "First?" },
          points: null,
        },
      ],
    });
    expect(view).not.toBeNull();
    if (!view) return;
    expect(view.questions.map((q) => q.question_id)).toEqual([
      QUESTION_ID,
      "77777777-7777-4777-8777-777777777777",
    ]);
    expect(view.questions[0].content).not.toHaveProperty("correct");
    expect(JSON.stringify(view)).not.toMatch(/answer_key/);
  });

  it("rejects reserved question types and malformed payloads", () => {
    expect(
      toLearnerSafeAssessmentQuestion({
        question_id: QUESTION_ID,
        question_type: "essay",
        position: 0,
        content: { prompt: "x" },
      })
    ).toBeNull();
    expect(parseAssessmentDeliveryView({ activity_id: ACTIVITY_ID })).toBeNull();
  });

  it("sanitizes auth and entitlement errors", () => {
    expect(sanitizeAssessmentDeliveryError("Authentication required")).toMatch(
      /not allowed/i
    );
    expect(sanitizeAssessmentDeliveryError("Not entitled to this course")).toMatch(
      /not allowed/i
    );
    expect(
      sanitizeAssessmentDeliveryError("Parent course must be published to view this assessment")
    ).toMatch(/not available/i);
  });

  it("loadAssessmentDelivery calls only the delivery RPC", async () => {
    const calls: Array<{ name: string; args: unknown }> = [];
    const fake = {
      rpc: async (name: string, args: unknown) => {
        calls.push({ name, args });
        return {
          data: {
            activity_id: ACTIVITY_ID,
            lesson_id: "33333333-3333-4333-8333-333333333333",
            course_id: "11111111-1111-4111-8111-111111111111",
            name: "Quiz",
            slug: "quiz",
            type: "quiz",
            description: null,
            hints: {
              is_required: true,
              max_attempts: null,
              time_limit_seconds: null,
            },
            question_count: 1,
            questions: [
              {
                question_id: QUESTION_ID,
                question_type: "true_false",
                position: 0,
                content: { prompt: "OK?" },
                points: null,
              },
            ],
          },
          error: null,
        };
      },
      from: () => {
        throw new Error("must not SELECT");
      },
    };

    const r = await loadAssessmentDelivery(fake as never, ACTIVITY_ID);
    expect(r.ok).toBe(true);
    expect(calls).toEqual([
      {
        name: "get_my_learning_activity_assessment",
        args: { p_activity_id: ACTIVITY_ID },
      },
    ]);
  });

  it("rejects malformed UUID before any RPC", async () => {
    const calls: string[] = [];
    const fake = {
      rpc: async (name: string) => {
        calls.push(name);
        return { data: null, error: null };
      },
    };
    const r = await loadAssessmentDelivery(fake as never, "bad");
    expect(r.ok).toBe(false);
    expect(calls).toEqual([]);
  });

  it("never imports write paths; forbids attempt/score/key RPCs", () => {
    expect(SRC).not.toMatch(/\.insert\(/);
    expect(SRC).not.toMatch(/\.update\(/);
    expect(SRC).not.toMatch(/\.delete\(/);
    expect(SRC).not.toMatch(/\.from\(/);
    expect(LEARNING_ASSESSMENT_DELIVERY_FORBIDDEN.startAttempt).toBe(
      LEARNING_ATTEMPT_RPCS.start
    );
    expect(LEARNING_ASSESSMENT_DELIVERY_FORBIDDEN.internalSnapshotBuilder).toBe(
      LEARNING_ATTEMPT_HELPERS.buildSnapshot
    );
    expect(LEARNING_ASSESSMENT_DELIVERY_FORBIDDEN.scoringRpc).toBe(
      LEARNING_SCORING_RPCS.score
    );
    expect(LEARNING_ASSESSMENT_DELIVERY_FORBIDDEN.questionTables).toEqual(
      LEARNING_LEARNER_FORBIDDEN.questionTables
    );
  });

  it("page uses adapter RPC path and no table writes", () => {
    expect(PAGE).toMatch(/loadAssessmentDelivery/);
    expect(PAGE).not.toMatch(/\.from\(/);
    expect(PAGE).not.toMatch(/start_learning_attempt/);
    expect(PAGE).not.toMatch(/save_learning_attempt/);
    expect(LEARNING_ASSESSMENT_DELIVERY_ROUTES.assessment(ACTIVITY_ID)).toBe(
      `/learning/activities/${ACTIVITY_ID}/assessment`
    );
  });
});

describe("Assessment Due UX Follow-through V1 — delivery due_at", () => {
  const dueSql = read(DUE_UX_MIGRATION);
  const dueFn = fnBody(dueSql, "get_my_learning_activity_assessment");
  const dueCode = stripSqlComments(dueFn);

  it("ships unique 20260909 migration and docs", () => {
    expect(existsSync(join(ROOT, DUE_UX_MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, DUE_UX_DOC))).toBe(true);
    const names = readdirSync(join(ROOT, "supabase/migrations"));
    expect(names).toContain(
      "20260909_learning_assessment_due_ux_followthrough_v1.sql"
    );
    expect(names.filter((f) => f.startsWith("20260909_"))).toEqual([
      "20260909_learning_assessment_due_ux_followthrough_v1.sql",
    ]);
  });

  it("CREATE OR REPLACE preserves security, auth, access, and grants", () => {
    expect(dueFn).toMatch(/security definer/i);
    expect(dueFn).toMatch(/set search_path\s*=\s*public/i);
    expect(dueCode).toMatch(/auth\.uid\(\)/);
    expect(dueCode).toMatch(/has_learning_course_access\(v_course\.id, v_uid\)/);
    expect(dueCode).toMatch(/v_activity\.status is distinct from 'published'/);
    expect(dueCode).toMatch(/learning_attempt_build_questions_snapshot/);
    expect(dueSql).toMatch(
      /revoke all on function public\.get_my_learning_activity_assessment\(uuid\)\s+from public, anon/
    );
    expect(dueSql).toMatch(
      /grant execute on function public\.get_my_learning_activity_assessment\(uuid\)\s+to authenticated/
    );
    expect(dueSql).toMatch(
      /grant execute on function public\.get_my_learning_activity_assessment\(uuid\)\s+to service_role/
    );
  });

  it("adds top-level due_at and keeps hints fields; no attempt gating RPCs", () => {
    expect(dueCode).toMatch(/'due_at',\s*v_settings\.due_at/);
    expect(dueCode).toMatch(/'is_required'/);
    expect(dueCode).toMatch(/'max_attempts'/);
    expect(dueCode).toMatch(/'time_limit_seconds'/);
    expect(dueCode).not.toMatch(/\binsert\b/i);
    expect(dueCode).not.toMatch(/start_learning_attempt/);
    expect(dueCode).not.toMatch(/score_learning_attempt/);
    expect(dueSql).not.toMatch(/start_my_learning_assessment_attempt/);
    expect(dueSql).not.toMatch(/set_learning_assessment_due_at/);
  });

  it("parses due_at string, null, and absent; rejects malformed", () => {
    const base = {
      activity_id: ACTIVITY_ID,
      lesson_id: "33333333-3333-4333-8333-333333333333",
      course_id: "11111111-1111-4111-8111-111111111111",
      name: "Quiz",
      slug: "quiz",
      type: "quiz",
      description: null,
      hints: { is_required: true, max_attempts: null, time_limit_seconds: null },
      question_count: 1,
      questions: [
        {
          question_id: QUESTION_ID,
          question_type: "true_false",
          position: 0,
          content: { prompt: "OK?" },
          points: null,
        },
      ],
    };
    const withDue = parseAssessmentDeliveryView({
      ...base,
      due_at: "2026-09-01T12:00:00.000Z",
    });
    expect(withDue?.due_at).toBe("2026-09-01T12:00:00.000Z");
    expect(withDue?.name).toBe("Quiz");
    expect(withDue?.hints.is_required).toBe(true);

    const withNull = parseAssessmentDeliveryView({ ...base, due_at: null });
    expect(withNull?.due_at).toBeNull();

    const absent = parseAssessmentDeliveryView({ ...base });
    expect(absent?.due_at).toBeNull();

    expect(
      parseAssessmentDeliveryView({ ...base, due_at: 123 as unknown as string })
    ).toBeNull();
  });

  it("learner page shows Due/Overdue presentationally without gating start", () => {
    expect(PAGE).toMatch(/classifyAssessmentDueStatus/);
    expect(PAGE).toMatch(/formatAssessmentDueDisplay/);
    expect(PAGE).toMatch(/assessment-due/);
    expect(PAGE).toMatch(/assessment-due-overdue/);
    expect(PAGE).toMatch(/Overdue/);
    expect(PAGE).toMatch(/data-testid="start-assessment-attempt"/);
    expect(PAGE).toMatch(/Start assessment attempt/);
    expect(PAGE).not.toMatch(/disabled=\{[^}]*due/i);
    expect(PAGE).not.toMatch(/dueStatus === \"overdue\" \? [\s\S]*disabled/);
  });
});
