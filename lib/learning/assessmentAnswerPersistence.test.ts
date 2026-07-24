import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  LEARNING_ASSESSMENT_ANSWER_FORBIDDEN,
  LEARNING_ASSESSMENT_ANSWER_FORBIDDEN_PAYLOAD_KEYS,
  LEARNING_ASSESSMENT_ANSWER_RPCS,
  buildAssessmentAnswerPayload,
  loadAssessmentAnswers,
  parseAssessmentAnswersView,
  saveAssessmentAnswer,
  sanitizeAssessmentAnswerError,
} from "./assessmentAnswerPersistence";
import { LEARNING_ATTEMPT_RPCS } from "./attemptsFoundation";
import { LEARNING_SCORING_RPCS } from "./scoringFoundation";

const ROOT = join(__dirname, "../..");
const MIGRATION =
  "supabase/migrations/20260850_learning_assessment_answer_persistence_v1.sql";
const DOC =
  "docs/learning/implementation/ASSESSMENT_ANSWER_PERSISTENCE_V1.md";
const SRC = readFileSync(
  join(ROOT, "lib/learning/assessmentAnswerPersistence.ts"),
  "utf8"
);
const ACTIONS = readFileSync(
  join(ROOT, "app/learning/assessmentAnswerActions.ts"),
  "utf8"
);
const PAGE = readFileSync(
  join(
    ROOT,
    "app/learning/activities/[activityId]/assessment-attempts/[attemptId]/page.tsx"
  ),
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
const ACTIVITY_ID = "44444444-4444-4444-8444-444444444444";

describe("Assessment Answer Persistence V1 — files", () => {
  it("ships migration after attempt foundation; no new answers table", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, DOC))).toBe(true);
    expect(MIGRATION > "supabase/migrations/20260849").toBe(true);
    const sql = read(MIGRATION);
    expect(sql).not.toMatch(/create table/i);
    expect(
      readdirSync(join(ROOT, "supabase/migrations"))
    ).toContain("20260850_learning_assessment_answer_persistence_v1.sql");
  });
});

describe("Assessment Answer Persistence V1 — SQL contracts", () => {
  const sql = read(MIGRATION);

  it("save wraps save_learning_attempt_answer with forbidden-field gate", () => {
    const fn = stripSqlComments(
      fnBody(sql, "save_my_learning_assessment_answer")
    );
    expect(LEARNING_ASSESSMENT_ANSWER_RPCS.save).toBe(
      "save_my_learning_assessment_answer"
    );
    expect(fn).toMatch(/security definer/i);
    expect(fn).toMatch(/set search_path\s*=\s*public/i);
    expect(fn).toMatch(/auth\.uid\(\)/);
    expect(fn).toMatch(/save_learning_attempt_answer/);
    expect(fn).toMatch(/forbidden authoritative fields/);
    expect(fn).not.toMatch(/learning_question_answer_keys/);
    expect(fn).not.toMatch(/submit_learning_attempt/);
    expect(fn).not.toMatch(/score_learning_attempt/);
    expect(fn).not.toMatch(/learning_lesson_progress/);
  });

  it("get is owner-only, no expire mutation, answers only", () => {
    const fn = stripSqlComments(
      fnBody(sql, "get_my_learning_assessment_answers")
    );
    expect(fn).toMatch(/stable/i);
    expect(fn).toMatch(/Not allowed to read answers/);
    expect(fn).not.toMatch(/learning_attempt_expire_if_due/);
    expect(fn).toMatch(/learning_attempt_answers/);
    expect(fn).toMatch(/answer_payload/);
    expect(fn).not.toMatch(/learning_question_answer_keys/);
    expect(fn).not.toMatch(/answer_key/);
    expect(fn).not.toMatch(/\binsert\b/i);
    expect(fn).not.toMatch(/\bupdate\b/i);
  });

  it("grants authenticated execute; revokes public/anon", () => {
    expect(sql).toMatch(
      /revoke all on function public\.save_my_learning_assessment_answer\(uuid, uuid, jsonb\)\s+from public, anon/
    );
    expect(sql).toMatch(
      /grant execute on function public\.save_my_learning_assessment_answer\(uuid, uuid, jsonb\)\s+to authenticated/
    );
    expect(sql).toMatch(
      /revoke all on function public\.get_my_learning_assessment_answers\(uuid\)\s+from public, anon/
    );
    expect(sql).toMatch(
      /grant execute on function public\.get_my_learning_assessment_answers\(uuid\)\s+to authenticated/
    );
  });
});

describe("Assessment Answer Persistence V1 — adapter validation", () => {
  it("builds typed payloads and rejects unknown/forbidden/unsupported", () => {
    expect(
      buildAssessmentAnswerPayload("true_false", { value: true }).ok
    ).toBe(true);
    expect(
      buildAssessmentAnswerPayload("multiple_choice_single", {
        selected_key: "a",
      }).ok
    ).toBe(true);
    expect(
      buildAssessmentAnswerPayload("essay", { text: "x" }).ok
    ).toBe(false);
    expect(
      buildAssessmentAnswerPayload("true_false", {
        value: true,
        score: 1,
      }).ok
    ).toBe(false);
    expect(
      buildAssessmentAnswerPayload("true_false", {
        value: true,
        extra: 1,
      }).ok
    ).toBe(false);
    expect(LEARNING_ASSESSMENT_ANSWER_FORBIDDEN_PAYLOAD_KEYS).toContain(
      "correct_key"
    );
  });

  it("sanitizes lifecycle and ownership errors", () => {
    expect(
      sanitizeAssessmentAnswerError(
        "Attempt is cancelled and can no longer be modified"
      )
    ).toMatch(/no longer accept/i);
    expect(
      sanitizeAssessmentAnswerError("Question is not part of this attempt")
    ).toMatch(/not part/i);
    expect(
      sanitizeAssessmentAnswerError("Not allowed to modify this attempt")
    ).toMatch(/not allowed/i);
  });

  it("saveAssessmentAnswer calls assessment save RPC only", async () => {
    const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
    const fake = {
      rpc: async (name: string, args: Record<string, unknown>) => {
        calls.push({ name, args });
        return {
          data: {
            attempt_id: ATTEMPT_ID,
            question_id: QUESTION_ID,
            saved: true,
            first_answered_at: "t1",
            last_saved_at: "t2",
          },
          error: null,
        };
      },
      from: () => {
        throw new Error("no select");
      },
    };
    const r = await saveAssessmentAnswer(
      fake as never,
      ATTEMPT_ID,
      QUESTION_ID,
      "true_false",
      { value: false }
    );
    expect(r.ok).toBe(true);
    expect(calls).toEqual([
      {
        name: "save_my_learning_assessment_answer",
        args: {
          p_attempt_id: ATTEMPT_ID,
          p_question_id: QUESTION_ID,
          p_answer: { value: false },
        },
      },
    ]);
  });

  it("loadAssessmentAnswers parses owner answers without keys", async () => {
    const fake = {
      rpc: async () => ({
        data: {
          attempt_id: ATTEMPT_ID,
          activity_id: ACTIVITY_ID,
          status: "active",
          answer_count: 1,
          answers: [
            {
              question_id: QUESTION_ID,
              answer_payload: { value: true },
              first_answered_at: "t1",
              last_saved_at: "t2",
            },
          ],
        },
        error: null,
      }),
    };
    const r = await loadAssessmentAnswers(fake as never, ATTEMPT_ID);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.answers[0].answer_payload).toEqual({ value: true });
    }
    expect(
      parseAssessmentAnswersView({
        attempt_id: ATTEMPT_ID,
        activity_id: ACTIVITY_ID,
        status: "active",
        answers: [
          {
            question_id: QUESTION_ID,
            answer_payload: { value: true, correct: true },
            first_answered_at: "t1",
            last_saved_at: "t2",
          },
        ],
      })
    ).toBeNull();
  });

  it("module forbids submit/score/keys and UI uses adapter actions", () => {
    expect(LEARNING_ASSESSMENT_ANSWER_FORBIDDEN.submit).toBe(
      LEARNING_ATTEMPT_RPCS.submit
    );
    expect(LEARNING_ASSESSMENT_ANSWER_FORBIDDEN.score).toBe(
      LEARNING_SCORING_RPCS.score
    );
    expect(SRC).not.toMatch(/\.from\(/);
    expect(SRC).not.toMatch(/submit_learning_attempt/);
    expect(SRC).not.toMatch(/score_learning_attempt/);
    expect(SRC).not.toMatch(/learning_question_answer_keys/);
    expect(ACTIONS).toMatch(/getServerUser/);
    expect(ACTIONS).toMatch(/saveAssessmentAnswer/);
    expect(ACTIONS).not.toMatch(/submit/);
    expect(PAGE).toMatch(/AssessmentAnswerSaveForm/);
    expect(PAGE).toMatch(/loadAssessmentAnswers/);
    expect(PAGE).not.toMatch(/submit_learning_attempt/);
  });
});
