import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LEARNING_ATTEMPT_RPCS } from "./attemptsFoundation";
import { LEARNING_SCORING_RPCS } from "./scoringFoundation";
import {
  LEARNING_LEARNER_RESULT_ACTIVE_POLICIES,
  LEARNING_LEARNER_RESULT_FAIL_CLOSED_POLICIES,
  LEARNING_LEARNER_RESULT_INTERNAL_HELPERS,
  LEARNING_LEARNER_RESULT_MESSAGES,
  LEARNING_LEARNER_RESULT_RPCS,
  LEARNING_LEARNER_RESULT_VISIBILITIES,
  computeLearnerResultPercentage,
  learnerResultStatusMessage,
  parseLearnerAttemptResultView,
} from "./learnerResultDelivery";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260841_learning_learner_result_delivery_v1.sql";
const SCORING_MIGRATION =
  "supabase/migrations/20260839_learning_scoring_foundation_v1.sql";
const ATTEMPTS_MIGRATION =
  "supabase/migrations/20260838_learning_attempts_foundation_v1.sql";
const DOC = "docs/learning/implementation/LEARNER_RESULT_DELIVERY_V1.md";

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

describe("Learner Result Delivery V1 — files & ordering", () => {
  it("ships migration, module, docs; 20260841 after scoring", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, DOC))).toBe(true);
    expect(
      existsSync(join(ROOT, "lib/learning/learnerResultDelivery.ts"))
    ).toBe(true);
    expect(existsSync(join(ROOT, SCORING_MIGRATION))).toBe(true);
    expect(MIGRATION > SCORING_MIGRATION).toBe(true);
  });

  it("does not rewrite prior Learning migrations", () => {
    expect(MIGRATION).toContain("20260841");
    for (const prior of [
      "20260838",
      "20260839",
      "20260840",
    ]) {
      expect(MIGRATION).not.toContain(prior);
    }
  });
});

describe("Learner Result Delivery V1 — get_my_learning_attempt_result", () => {
  const sql = read(MIGRATION);
  const fn = fnBody(sql, "get_my_learning_attempt_result");
  const code = stripSqlComments(fn);

  it("is SECURITY DEFINER with search_path public", () => {
    expect(LEARNING_LEARNER_RESULT_RPCS.getMyResult).toBe(
      "get_my_learning_attempt_result"
    );
    expect(fn).toMatch(/security definer/i);
    expect(fn).toMatch(/set search_path = public/i);
  });

  it("requires auth.uid, ownership, and has_learning_course_access (IDOR)", () => {
    expect(fn).toMatch(/v_uid uuid := auth\.uid\(\)/);
    expect(fn).toMatch(/Authentication required/);
    expect(fn).toMatch(/v_attempt\.user_id is distinct from v_uid/);
    expect(fn).toMatch(/has_learning_course_access\(v_attempt\.course_id, v_uid\)/);
    expect(fn).toMatch(/Not allowed to read this attempt result/);
  });

  it("uses the same deny message for missing and non-owner attempts", () => {
    expect(fn).toMatch(/v_deny constant text := 'Not allowed to read this attempt result'/);
    expect(fn).toMatch(/if not found or v_attempt\.user_id is distinct from v_uid/);
  });

  it("returns uniform learner-safe keys only", () => {
    expect(fn).toMatch(/'attempt_id'/);
    expect(fn).toMatch(/'activity_id'/);
    expect(fn).toMatch(/'attempt_status'/);
    expect(fn).toMatch(/'visibility'/);
    expect(fn).toMatch(/'result'/);
    expect(fn).toMatch(/'message'/);
    expect([...LEARNING_LEARNER_RESULT_VISIBILITIES]).toEqual([
      "hidden",
      "pending_score",
      "available",
    ]);
  });

  it("payload allowlist: no keys, answer results, scored_by, grading metadata", () => {
    const retStart = code.lastIndexOf("return jsonb_build_object");
    const retEnd = code.indexOf("end;", retStart);
    const ret = code.slice(retStart, retEnd >= 0 ? retEnd : undefined);
    expect(ret).toMatch(/'attempt_id'/);
    expect(ret).toMatch(/'visibility'/);
    expect(ret).not.toMatch(/answer_key/);
    expect(ret).not.toMatch(/answer_payload/);
    expect(ret).not.toMatch(/answer_results/);
    expect(ret).not.toMatch(/is_correct/);
    expect(ret).not.toMatch(/points_earned/);
    expect(ret).not.toMatch(/scored_by/);
    expect(ret).not.toMatch(/evaluation_mode_snapshot/);
    expect(ret).not.toMatch(/passing_score_snapshot/);
    expect(ret).not.toMatch(/max_score_snapshot/);
  });

  it("percentage is 0 when score_max = 0", () => {
    expect(fn).toMatch(/score_max = 0/);
    expect(fn).toMatch(/v_percentage := 0/);
    expect(computeLearnerResultPercentage(5, 0)).toBe(0);
    expect(computeLearnerResultPercentage(5, 10)).toBe(50);
  });

  it("grants EXECUTE to authenticated+service_role; revokes public/anon", () => {
    expect(sql).toMatch(
      /revoke all on function public\.get_my_learning_attempt_result\(uuid\)\s+from public, anon/
    );
    expect(sql).toMatch(
      /grant execute on function public\.get_my_learning_attempt_result\(uuid\)\s+to authenticated, service_role/
    );
  });
});

describe("Learner Result Delivery V1 — visibility matrix", () => {
  const sql = read(MIGRATION);
  const fn = fnBody(sql, "get_my_learning_attempt_result");

  it("active / expired / cancelled → hidden", () => {
    expect(fn).toMatch(/v_attempt\.status is distinct from 'submitted'/);
    expect(fn).toMatch(/v_visibility := 'hidden'/);
  });

  it("never fail-closed; after_close/manual unlockable; immediately/after_submit active", () => {
    expect([...LEARNING_LEARNER_RESULT_ACTIVE_POLICIES]).toEqual([
      "immediately",
      "after_submit",
      "after_close",
      "manual",
    ]);
    expect([...LEARNING_LEARNER_RESULT_FAIL_CLOSED_POLICIES]).toEqual([
      "never",
    ]);
    expect(fn).toMatch(/'immediately'/);
    expect(fn).toMatch(/'after_submit'/);
    expect(fn).toMatch(/v_visibility := 'pending_score'/);
    expect(fn).toMatch(/v_visibility := 'available'/);
  });

  it("documents pending and available messages", () => {
    expect(LEARNING_LEARNER_RESULT_MESSAGES.pending).toBe(
      "Submitted — your result is being prepared."
    );
    expect(fn).toMatch(/Submitted — your result is being prepared\./);
    expect(learnerResultStatusMessage("pending_score")).toBe(
      LEARNING_LEARNER_RESULT_MESSAGES.pending
    );
    expect(learnerResultStatusMessage("available")).toBe(
      LEARNING_LEARNER_RESULT_MESSAGES.available
    );
    expect(learnerResultStatusMessage("hidden")).toBe(
      LEARNING_LEARNER_RESULT_MESSAGES.hidden
    );
  });
});

describe("Learner Result Delivery V1 — parse allowlist", () => {
  it("parses available aggregate payload", () => {
    const view = parseLearnerAttemptResultView({
      attempt_id: "a1",
      activity_id: "act1",
      attempt_status: "submitted",
      visibility: "available",
      message: LEARNING_LEARNER_RESULT_MESSAGES.available,
      result: {
        status: "scored",
        score_earned: 8,
        score_max: 10,
        percentage: 80,
        passed: true,
        scored_at: "2026-01-01T00:00:00Z",
      },
    });
    expect(view?.visibility).toBe("available");
    expect(view?.result?.score_earned).toBe(8);
    expect(view?.result?.passed).toBe(true);
  });

  it("rejects per-question / staff fields in result object", () => {
    expect(
      parseLearnerAttemptResultView({
        attempt_id: "a1",
        activity_id: "act1",
        attempt_status: "submitted",
        visibility: "available",
        message: "x",
        result: {
          status: "scored",
          score_earned: 1,
          score_max: 1,
          percentage: 100,
          passed: null,
          scored_at: "2026-01-01T00:00:00Z",
          is_correct: true,
        },
      })
    ).toBeNull();

    expect(
      parseLearnerAttemptResultView({
        attempt_id: "a1",
        activity_id: "act1",
        attempt_status: "submitted",
        visibility: "available",
        message: "x",
        result: {
          status: "scored",
          score_earned: 1,
          score_max: 1,
          percentage: 100,
          passed: null,
          scored_at: "2026-01-01T00:00:00Z",
          scored_by: "staff",
        },
      })
    ).toBeNull();
  });

  it("forces result null when not available", () => {
    const view = parseLearnerAttemptResultView({
      attempt_id: "a1",
      activity_id: "act1",
      attempt_status: "submitted",
      visibility: "pending_score",
      message: LEARNING_LEARNER_RESULT_MESSAGES.pending,
      result: {
        status: "scored",
        score_earned: 1,
        score_max: 1,
        percentage: 100,
        passed: true,
        scored_at: "2026-01-01T00:00:00Z",
      },
    });
    expect(view?.result).toBeNull();
  });
});

describe("Learner Result Delivery V1 — auto-score helpers & submit", () => {
  const sql = read(MIGRATION);

  it("internal apply + try_auto helpers are revoked from authenticated", () => {
    expect(LEARNING_LEARNER_RESULT_INTERNAL_HELPERS.applyAttemptResult).toBe(
      "learning_scoring_apply_attempt_result"
    );
    expect(LEARNING_LEARNER_RESULT_INTERNAL_HELPERS.tryAutoScore).toBe(
      "learning_scoring_try_auto_score_submitted_attempt"
    );
    for (const name of Object.values(LEARNING_LEARNER_RESULT_INTERNAL_HELPERS)) {
      expect(sql).toMatch(
        new RegExp(
          `revoke all on function public\\.${name}\\(uuid, uuid\\)\\s+from public, anon, authenticated`
        )
      );
    }
  });

  it("score_learning_attempt remains staff-gated and uses shared apply", () => {
    const fn = fnBody(sql, "score_learning_attempt");
    expect(fn).toMatch(/can_manage_learning_course/);
    expect(fn).toMatch(/is_platform_admin/);
    expect(fn).toMatch(/Not allowed to score this attempt/);
    expect(fn).toMatch(/learning_scoring_apply_attempt_result/);
    expect(LEARNING_SCORING_RPCS.score).toBe("score_learning_attempt");
  });

  it("submit calls try_auto; returns lifecycle only (no scores)", () => {
    const fn = fnBody(sql, "submit_learning_attempt");
    expect(fn).toMatch(/learning_scoring_try_auto_score_submitted_attempt/);
    const code = stripSqlComments(fn);
    expect(code).not.toMatch(/score_earned/);
    expect(code).not.toMatch(/answer_results/);
    expect(code).not.toMatch(/'visibility'/);
    const retMatches = [
      ...fn.matchAll(/return jsonb_build_object\([\s\S]*?\);/g),
    ];
    expect(retMatches.length).toBeGreaterThanOrEqual(2);
    for (const m of retMatches) {
      expect(m[0]).toMatch(/'status',\s*'submitted'/);
      expect(m[0]).toMatch(/'submitted_at'/);
    }
  });

  it("try_auto skips when result already scored (idempotent timestamps)", () => {
    const fn = fnBody(sql, "learning_scoring_try_auto_score_submitted_attempt");
    expect(fn).toMatch(/learning_attempt_results/);
    expect(fn).toMatch(/status = 'scored'/);
    expect(fn).toMatch(/exception/);
    expect(fn).toMatch(/attempt\.auto_score_failed/);
    expect(stripSqlComments(fn)).not.toMatch(/answer_key/);
    expect(stripSqlComments(fn)).not.toMatch(/answer_payload/);
  });

  it("apply helper reuses evaluate_answer; no Progress mutations", () => {
    const fn = fnBody(sql, "learning_scoring_apply_attempt_result");
    expect(fn).toMatch(/learning_scoring_evaluate_answer/);
    expect(fn).toMatch(/on conflict \(attempt_id\) do update/);
    expect(fn).toMatch(/delete from public\.learning_attempt_answer_results/);
    const code = stripSqlComments(fn);
    expect(code).not.toMatch(/learning_lesson_progress/);
    expect(code).not.toMatch(/learning_course_progress/);
    expect(code).not.toMatch(/complete_learning_lesson/);
  });
});

describe("Learner Result Delivery V1 — security fences", () => {
  const sql = read(MIGRATION);
  const attemptsSql = read(ATTEMPTS_MIGRATION);
  const scoringSql = read(SCORING_MIGRATION);

  it("does not add learner SELECT policies on result tables", () => {
    expect(sql).not.toMatch(
      /create policy[\s\S]*learning_attempt_results[\s\S]*user_id/i
    );
    expect(sql).not.toMatch(/Learners read own attempt results/i);
    expect(sql).not.toMatch(/Learners read own attempt answer results/i);
    // Prior scoring staff-only policies remain the contract.
    expect(scoringSql).toMatch(/Managers read scoped attempt results/);
    expect(scoringSql).not.toMatch(/Learners read.*attempt results/i);
  });

  it("does not modify get_my_learning_attempt to return scores", () => {
    // Exact RPC name with '(' — must not match get_my_learning_attempt_result.
    expect(sql).not.toMatch(
      /create or replace function public\.get_my_learning_attempt\(/
    );
    const getFn = fnBody(attemptsSql, "get_my_learning_attempt");
    expect(getFn).not.toMatch(/score_earned/);
    expect(getFn).not.toMatch(/learning_attempt_results/);
    expect(getFn).not.toMatch(/visibility/);
    expect(LEARNING_ATTEMPT_RPCS.getMine).toBe("get_my_learning_attempt");
  });

  it("UI pages stay force-dynamic; no per-question correctness in result UI", () => {
    const page = read("app/learning/attempts/[attemptId]/page.tsx");
    expect(page).toMatch(/force-dynamic/);
    expect(page).not.toMatch(/score_learning_attempt/);
    expect(page).not.toMatch(/is_correct/);
    expect(page).not.toMatch(/answer_keys/);

    const summary = read("app/components/learning/LearnerResultSummary.tsx");
    expect(summary).not.toMatch(/is_correct/);
    expect(summary).not.toMatch(/points_earned/);
    expect(summary).not.toMatch(/dangerouslySetInnerHTML/);
    expect(summary).not.toMatch(/score_learning_attempt/);
    expect(summary).not.toMatch(/answer_key/);
  });
});
