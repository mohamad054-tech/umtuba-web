import { describe, expect, it } from "vitest";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  LEARNING_ASSESSMENT_DELIVERY_BLOCKED_MESSAGE,
  LEARNING_ASSESSMENT_DELIVERY_FORBIDDEN,
  LEARNING_ASSESSMENT_DELIVERY_RPCS,
  loadAssessmentDelivery,
} from "./assessmentDelivery";
import {
  LEARNING_ATTEMPT_HELPERS,
  LEARNING_ATTEMPT_RPCS,
} from "./attemptsFoundation";
import { LEARNING_LEARNER_FORBIDDEN } from "./learnerDelivery";

const ROOT = join(__dirname, "../..");
const QUESTIONS_SQL =
  "supabase/migrations/20260837_learning_questions_foundation_v1.sql";
const ATTEMPTS_SQL =
  "supabase/migrations/20260838_learning_attempts_foundation_v1.sql";
const SRC = readFileSync(
  join(ROOT, "lib/learning/assessmentDelivery.ts"),
  "utf8"
);

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Assessment Delivery Minimal V1 — schema gap (blocked)", () => {
  it("ships blocker docs and fail-closed module; no assessment-delivery migration", () => {
    expect(
      existsSync(
        join(
          ROOT,
          "docs/learning/implementation/ASSESSMENT_DELIVERY_MINIMAL_V1.md"
        )
      )
    ).toBe(true);
    expect(existsSync(join(ROOT, "lib/learning/assessmentDelivery.ts"))).toBe(
      true
    );
    const names = readdirSync(join(ROOT, "supabase/migrations"));
    expect(
      names.some((n) => n.toLowerCase().includes("assessment_delivery"))
    ).toBe(false);
    expect(
      names.some((n) => n.includes("get_my_learning_activity_assessment"))
    ).toBe(false);
  });

  it("proposed delivery RPC is not present in Questions or Attempts SQL", () => {
    const q = read(QUESTIONS_SQL);
    const a = read(ATTEMPTS_SQL);
    expect(q).not.toMatch(/get_my_learning_activity_assessment/);
    expect(a).not.toMatch(/get_my_learning_activity_assessment/);
    expect(LEARNING_ASSESSMENT_DELIVERY_RPCS.getMyActivityAssessment).toBe(
      "get_my_learning_activity_assessment"
    );
  });

  it("snapshot builder is revoked from authenticated (not a client delivery API)", () => {
    const sql = read(ATTEMPTS_SQL);
    expect(sql).toMatch(
      /revoke all on function public\.learning_attempt_build_questions_snapshot\(uuid\)\s+from public, anon, authenticated/
    );
    expect(LEARNING_ASSESSMENT_DELIVERY_FORBIDDEN.internalSnapshotBuilder).toBe(
      LEARNING_ATTEMPT_HELPERS.buildSnapshot
    );
  });

  it("questions foundation documents no learner-facing question read RPC", () => {
    const sql = read(QUESTIONS_SQL);
    expect(sql).toMatch(/NO learner-facing RPC/i);
    expect(sql).not.toMatch(/function public\.get_learning_question/i);
  });

  it("learner forbidden contract still blocks question + answer-key tables", () => {
    expect(LEARNING_LEARNER_FORBIDDEN.questionTables).toContain(
      "learning_questions"
    );
    expect(LEARNING_LEARNER_FORBIDDEN.questionTables).toContain(
      "learning_question_answer_keys"
    );
    expect(LEARNING_ASSESSMENT_DELIVERY_FORBIDDEN.questionTables).toEqual(
      LEARNING_LEARNER_FORBIDDEN.questionTables
    );
  });

  it("loadAssessmentDelivery fails closed without calling attempt/score RPCs", async () => {
    const calls: string[] = [];
    const fake = {
      rpc: async (name: string) => {
        calls.push(name);
        return { data: null, error: null };
      },
      from: () => {
        calls.push("from");
        throw new Error("must not SELECT");
      },
    };
    const r = await loadAssessmentDelivery(
      fake as never,
      "44444444-4444-4444-8444-444444444444"
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.blocked).toBe(true);
      expect(r.message).toBe(LEARNING_ASSESSMENT_DELIVERY_BLOCKED_MESSAGE);
    }
    expect(calls).toEqual([]);
  });

  it("rejects malformed activity UUIDs", async () => {
    const r = await loadAssessmentDelivery({} as never, "not-a-uuid");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/UUID/i);
  });

  it("module source never writes, never invokes attempt/score RPCs", () => {
    expect(SRC).not.toMatch(/\.insert\(/);
    expect(SRC).not.toMatch(/\.update\(/);
    expect(SRC).not.toMatch(/\.delete\(/);
    expect(SRC).not.toMatch(/\.from\(/);
    expect(SRC).not.toMatch(/supabase\.rpc\(/);
    expect(SRC).not.toMatch(/await .*\.rpc\(/);
    expect(SRC).toMatch(/BLOCKED/);
    expect(SRC).toMatch(/fail-closed/i);
  });

  it("forbids start/save/submit/score/set-answer-key on this surface", () => {
    expect(LEARNING_ASSESSMENT_DELIVERY_FORBIDDEN.startAttempt).toBe(
      LEARNING_ATTEMPT_RPCS.start
    );
    expect(LEARNING_ASSESSMENT_DELIVERY_FORBIDDEN.saveAnswer).toBe(
      LEARNING_ATTEMPT_RPCS.saveAnswer
    );
    expect(LEARNING_ASSESSMENT_DELIVERY_FORBIDDEN.submitAttempt).toBe(
      LEARNING_ATTEMPT_RPCS.submit
    );
    expect(LEARNING_ASSESSMENT_DELIVERY_FORBIDDEN.scoringRpc).toBe(
      LEARNING_LEARNER_FORBIDDEN.scoringRpc
    );
  });
});
