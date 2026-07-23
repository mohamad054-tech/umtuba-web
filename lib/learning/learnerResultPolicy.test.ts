import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LEARNING_LEARNER_RESULT_ACTIVE_POLICIES,
  LEARNING_LEARNER_RESULT_FAIL_CLOSED_POLICIES,
  LEARNING_LEARNER_RESULT_RPCS,
} from "./learnerResultDelivery";
import {
  LEARNING_RESULT_POLICY_FAIL_CLOSED,
  LEARNING_RESULT_POLICY_INTERNAL_HELPERS,
  LEARNING_RESULT_POLICY_RPCS,
  LEARNING_RESULT_POLICY_UNLOCKABLE,
  canChangeResultsAvailableAt,
  isLearningResultPolicyUnlocked,
  isResultsAvailableAtPostponementForbidden,
} from "./learnerResultPolicy";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260844_learning_result_policy_completion_v1.sql";
const PRIOR =
  "supabase/migrations/20260841_learning_learner_result_delivery_v1.sql";
const DOC =
  "docs/learning/implementation/LEARNER_RESULT_POLICY_COMPLETION_V1.md";

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

describe("Result Policy Completion V1 — files & version", () => {
  it("ships migration/docs/module after 20260841; skips Games 42–43", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, DOC))).toBe(true);
    expect(existsSync(join(ROOT, PRIOR))).toBe(true);
    expect(MIGRATION > PRIOR).toBe(true);
    const hits = readdirSync(join(ROOT, "supabase/migrations")).filter((f) =>
      f.startsWith("20260844")
    );
    expect(hits).toEqual([
      "20260844_learning_result_policy_completion_v1.sql",
    ]);
  });

  it("does not rewrite prior Learning migrations", () => {
    expect(read(PRIOR)).not.toMatch(/results_available_at/);
    expect(read(PRIOR)).not.toMatch(/learning_attempt_result_releases/);
  });
});

describe("Result Policy Completion V1 — gate helpers", () => {
  const past = "2020-01-01T00:00:00.000Z";
  const future = "2099-01-01T00:00:00.000Z";
  const now = Date.parse("2026-07-23T00:00:00.000Z");

  it("never / unknown stay locked; immediately unlocks when submitted", () => {
    expect(
      isLearningResultPolicyUnlocked({
        attemptStatus: "submitted",
        policy: "never",
        resultsAvailableAt: past,
        hasManualRelease: true,
        nowMs: now,
      })
    ).toBe(false);
    expect(
      isLearningResultPolicyUnlocked({
        attemptStatus: "submitted",
        policy: "immediately",
        resultsAvailableAt: null,
        hasManualRelease: false,
        nowMs: now,
      })
    ).toBe(true);
  });

  it("after_close respects results_available_at", () => {
    expect(
      isLearningResultPolicyUnlocked({
        attemptStatus: "submitted",
        policy: "after_close",
        resultsAvailableAt: future,
        hasManualRelease: false,
        nowMs: now,
      })
    ).toBe(false);
    expect(
      isLearningResultPolicyUnlocked({
        attemptStatus: "submitted",
        policy: "after_close",
        resultsAvailableAt: past,
        hasManualRelease: false,
        nowMs: now,
      })
    ).toBe(true);
    expect(
      isLearningResultPolicyUnlocked({
        attemptStatus: "submitted",
        policy: "after_close",
        resultsAvailableAt: null,
        hasManualRelease: false,
        nowMs: now,
      })
    ).toBe(false);
  });

  it("manual requires release row", () => {
    expect(
      isLearningResultPolicyUnlocked({
        attemptStatus: "submitted",
        policy: "manual",
        resultsAvailableAt: past,
        hasManualRelease: false,
        nowMs: now,
      })
    ).toBe(false);
    expect(
      isLearningResultPolicyUnlocked({
        attemptStatus: "submitted",
        policy: "manual",
        resultsAvailableAt: null,
        hasManualRelease: true,
        nowMs: now,
      })
    ).toBe(true);
  });

  it("non-submitted never unlocks from close or release", () => {
    expect(
      isLearningResultPolicyUnlocked({
        attemptStatus: "active",
        policy: "after_close",
        resultsAvailableAt: past,
        hasManualRelease: true,
        nowMs: now,
      })
    ).toBe(false);
    expect(
      isLearningResultPolicyUnlocked({
        attemptStatus: "expired",
        policy: "manual",
        resultsAvailableAt: past,
        hasManualRelease: true,
        nowMs: now,
      })
    ).toBe(false);
  });

  it("forbids postponement after available_at reached", () => {
    expect(canChangeResultsAvailableAt(past, now)).toBe(false);
    expect(canChangeResultsAvailableAt(future, now)).toBe(true);
    expect(
      isResultsAvailableAtPostponementForbidden(past, future, now)
    ).toBe(true);
    expect(
      isResultsAvailableAtPostponementForbidden(future, past, now)
    ).toBe(false);
  });
});

describe("Result Policy Completion V1 — SQL contracts", () => {
  const sql = read(MIGRATION);
  const code = stripSqlComments(sql);

  it("adds results_available_at and release table with FORCE RLS", () => {
    expect(sql).toMatch(/add column if not exists results_available_at/);
    expect(sql).toMatch(
      /create table if not exists public\.learning_attempt_result_releases/
    );
    expect(sql).toMatch(
      /alter table public\.learning_attempt_result_releases force row level security/
    );
    expect(sql).toMatch(
      /revoke insert, update, delete on table public\.learning_attempt_result_releases/
    );
  });

  it("release is insert-once idempotent and does not alter timestamps on replay", () => {
    const fn = fnBody(sql, "release_learning_attempt_result");
    expect(fn).toMatch(/idempotent_replay/);
    expect(fn).toMatch(/on conflict \(attempt_id\) do nothing/);
    expect(stripSqlComments(fn)).not.toMatch(
      /update\s+public\.learning_attempt_result_releases/i
    );
    expect(sql).toMatch(/learning_attempt_result_releases rows are immutable/);
  });

  it("release derives scope from attempt row; no client course/owner params", () => {
    const fn = fnBody(sql, "release_learning_attempt_result");
    expect(fn).toMatch(/from public\.learning_attempts/);
    expect(fn).toMatch(/can_manage_learning_course\(v_attempt\.course_id/);
    expect(fn).toMatch(/is_platform_admin/);
    expect(fn).not.toMatch(/p_course_id/);
    expect(fn).not.toMatch(/p_user_id/);
    expect(fn).not.toMatch(/p_learner/);
  });

  it("audits available_at changes and manual releases", () => {
    const setFn = fnBody(sql, "set_learning_activity_results_available_at");
    const relFn = fnBody(sql, "release_learning_attempt_result");
    expect(setFn).toMatch(/activity\.results_available_at\.set/);
    expect(relFn).toMatch(/attempt\.result_release/);
    expect(setFn).toMatch(/learning_audit_write/);
    expect(relFn).toMatch(/learning_audit_write/);
  });

  it("available_at immutable after reached; cannot clear via RPC", () => {
    const setFn = fnBody(sql, "set_learning_activity_results_available_at");
    expect(setFn).toMatch(/immutable after it has been reached/);
    expect(setFn).toMatch(/results_available_at is required/);
  });

  it("get_my preserves aggregate-only payload and submitted gate", () => {
    const getFn = fnBody(sql, "get_my_learning_attempt_result");
    const executable = getFn.split(/comment on function/i)[0];
    const code = stripSqlComments(executable);
    expect(code).toMatch(/'score_earned'/);
    expect(code).toMatch(/'percentage'/);
    expect(code).toMatch(/'scored_at'/);
    expect(code).not.toMatch(/answer_key/);
    expect(code).not.toMatch(/is_correct/);
    expect(code).not.toMatch(/'scored_by'/);
    expect(getFn).toMatch(/v_attempt\.status is distinct from 'submitted'/);
    expect(getFn).toMatch(/after_close/);
    expect(getFn).toMatch(/manual/);
    expect(getFn).toMatch(/results_available_at/);
  });

  it("SECURITY DEFINER search_path + revoke PUBLIC/anon on RPCs", () => {
    for (const name of Object.values(LEARNING_RESULT_POLICY_RPCS)) {
      const fn = fnBody(sql, name);
      expect(fn).toMatch(/security definer/i);
      expect(fn).toMatch(/set search_path = public/i);
      expect(sql).toMatch(
        new RegExp(
          `revoke all on function public\\.${name}[\\s\\S]*?from public, anon`
        )
      );
    }
    // Trigger helper is security invoker (not granted to clients).
    const guard = fnBody(
      sql,
      LEARNING_RESULT_POLICY_INTERNAL_HELPERS.releaseGuardImmutable
    );
    expect(guard).toMatch(/security invoker/i);
    expect(guard).toMatch(/set search_path = public/i);
  });

  it("no Progress / Games / UM Points / grading surfaces", () => {
    expect(code).not.toMatch(/learning_lesson_progress/);
    expect(code).not.toMatch(/award_um_points/);
    expect(code).not.toMatch(/upsert_game_catalog/);
    expect(code).not.toMatch(/answer_key/);
  });

  it("constants align delivery module with unlockable policies", () => {
    expect([...LEARNING_LEARNER_RESULT_ACTIVE_POLICIES]).toEqual([
      ...LEARNING_RESULT_POLICY_UNLOCKABLE,
    ]);
    expect([...LEARNING_LEARNER_RESULT_FAIL_CLOSED_POLICIES]).toEqual([
      ...LEARNING_RESULT_POLICY_FAIL_CLOSED,
    ]);
    expect(LEARNING_RESULT_POLICY_RPCS.getMyResult).toBe(
      LEARNING_LEARNER_RESULT_RPCS.getMyResult
    );
  });
});
