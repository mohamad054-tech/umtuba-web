import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LEARNING_PROGRESS_MUTATIONS_APPLICATION_TABLE,
  LEARNING_PROGRESS_MUTATIONS_APPLY_STATUSES,
  LEARNING_PROGRESS_MUTATIONS_AUDIT_ACTIONS,
  LEARNING_PROGRESS_MUTATIONS_COMPLETION_MODE,
  LEARNING_PROGRESS_MUTATIONS_COMPLETION_SOURCES,
  LEARNING_PROGRESS_MUTATIONS_HOOK_HOST,
  LEARNING_PROGRESS_MUTATIONS_INTERNAL_HELPERS,
  LEARNING_PROGRESS_MUTATIONS_MIGRATION,
  LEARNING_PROGRESS_MUTATIONS_SKIP_REASONS,
  LEARNING_PROGRESS_MUTATIONS_UNCHANGED_COMPLETION_MODES,
  learningProgressScoreCompletes,
} from "./progressMutations";
import { LEARNING_LESSON_COMPLETION_SOURCES } from "./progressFoundation";

const sqlPath = resolve(
  process.cwd(),
  "supabase/migrations",
  LEARNING_PROGRESS_MUTATIONS_MIGRATION
);
const sql = readFileSync(sqlPath, "utf8");

const scoringApplyStart = sql.indexOf(
  "create or replace function public.learning_scoring_apply_attempt_result"
);
const scoringApplyEnd = sql.indexOf("$$;", scoringApplyStart);
const scoringApplyFn = sql.slice(scoringApplyStart, scoringApplyEnd);

const tryApplyStart = sql.indexOf(
  "create or replace function public.learning_progress_try_apply_from_scored_attempt"
);
const tryApplyEnd = sql.indexOf("$$;", tryApplyStart);
const tryApplyFn = sql.slice(tryApplyStart, tryApplyEnd);

const completeStart = sql.indexOf(
  "create or replace function public.learning_progress_complete_lesson_from_scored_attempt"
);
const completeEnd = sql.indexOf("$$;", completeStart);
const completeFn = sql.slice(completeStart, completeEnd);

describe("Progress Mutations V1 — migration identity", () => {
  it("uses locked migration 20260845 (after Games 42–43 and Result Policy 44)", () => {
    expect(LEARNING_PROGRESS_MUTATIONS_MIGRATION).toBe(
      "20260845_learning_progress_mutations_v1.sql"
    );
    expect(sql).toMatch(/Progress Mutations After Scored Attempts V1/i);
    expect(sql).toMatch(/20260845/);
  });

  it("documents locked decisions: NULL passing_score + lesson-level only", () => {
    expect(sql).toMatch(/passing_score IS NULL/);
    expect(sql).toMatch(/Lesson-level progress only/);
    expect(sql).not.toMatch(
      /create table if not exists public\.learning_activity_progress/
    );
  });
});

describe("Progress Mutations V1 — completion_source expand", () => {
  it("allows scored_attempt alongside manual", () => {
    expect(sql).toMatch(
      /completion_source in \('manual', 'scored_attempt'\)/
    );
    expect(LEARNING_PROGRESS_MUTATIONS_COMPLETION_SOURCES).toEqual([
      "manual",
      "scored_attempt",
    ]);
    expect(LEARNING_LESSON_COMPLETION_SOURCES).toContain("scored_attempt");
  });
});

describe("Progress Mutations V1 — applications ledger", () => {
  it("creates insert-once table with attempt PK and user+activity unique", () => {
    expect(sql).toMatch(
      new RegExp(
        `create table if not exists public\\.${LEARNING_PROGRESS_MUTATIONS_APPLICATION_TABLE}`
      )
    );
    expect(sql).toMatch(/attempt_id uuid primary key/);
    expect(sql).toMatch(
      /constraint learning_attempt_progress_applications_user_activity_unique\s+unique \(user_id, activity_id\)/
    );
  });

  it("blocks update and delete via immutable trigger", () => {
    expect(sql).toMatch(
      /before update or delete on public\.learning_attempt_progress_applications/
    );
    expect(sql).toMatch(
      /learning_attempt_progress_applications rows are immutable/
    );
  });

  it("FORCE RLS and revokes write from authenticated", () => {
    expect(sql).toMatch(
      /alter table public\.learning_attempt_progress_applications force row level security/
    );
    expect(sql).toMatch(
      /revoke insert, update, delete on table public\.learning_attempt_progress_applications\s+from anon, authenticated/
    );
  });
});

describe("Progress Mutations V1 — try apply gates", () => {
  it("is security definer with search_path and revoked from clients", () => {
    expect(tryApplyFn).toMatch(/security definer/i);
    expect(tryApplyFn).toMatch(/set search_path = public/);
    expect(sql).toMatch(
      new RegExp(
        `revoke all on function public\\.${LEARNING_PROGRESS_MUTATIONS_INTERNAL_HELPERS.tryApplyFromScoredAttempt}`
      )
    );
  });

  it("requires completion_mode score and leaves other modes unchanged", () => {
    expect(tryApplyFn).toMatch(/completion_mode is distinct from 'score'/);
    expect(LEARNING_PROGRESS_MUTATIONS_COMPLETION_MODE).toBe("score");
    expect(LEARNING_PROGRESS_MUTATIONS_UNCHANGED_COMPLETION_MODES).toEqual([
      "view",
      "submit",
      "manual",
    ]);
  });

  it("implements NULL passing_score = scored enough; else require passed", () => {
    expect(tryApplyFn).toMatch(/passing_score is not null/);
    expect(tryApplyFn).toMatch(/passed is distinct from true/);
    expect(tryApplyFn).toMatch(/passing_score_not_met/);
  });

  it("first qualifying attempt wins; later attempts skip", () => {
    expect(tryApplyFn).toMatch(/activity_already_applied/);
    expect(tryApplyFn).toMatch(/unique_violation/);
    expect(tryApplyFn).toMatch(/activity_already_applied_concurrent/);
  });

  it("loads relationships from attempt row only (no client scope args)", () => {
    expect(tryApplyFn).toMatch(/v_attempt\.lesson_id/);
    expect(tryApplyFn).toMatch(/v_attempt\.user_id/);
    expect(tryApplyFn).toMatch(/v_attempt\.activity_id/);
    expect(tryApplyFn).not.toMatch(/p_lesson_id/);
    expect(tryApplyFn).not.toMatch(/p_user_id/);
    expect(tryApplyFn).not.toMatch(/p_activity_id/);
  });

  it("exposes documented skip/apply statuses in TS contract", () => {
    expect(LEARNING_PROGRESS_MUTATIONS_APPLY_STATUSES).toEqual([
      "applied",
      "idempotent",
      "skipped",
    ]);
    for (const reason of LEARNING_PROGRESS_MUTATIONS_SKIP_REASONS) {
      expect(tryApplyFn).toMatch(new RegExp(reason));
    }
  });
});

describe("Progress Mutations V1 — lesson then course same txn", () => {
  it("completes lesson with scored_attempt then recomputes course", () => {
    expect(completeFn).toMatch(/completion_source = 'scored_attempt'/);
    expect(completeFn).toMatch(/learning_progress_recompute_course/);
    // Order: lesson write paths before recompute
    const recomputeAt = completeFn.indexOf("learning_progress_recompute_course");
    const insertAt = completeFn.indexOf("insert into public.learning_lesson_progress");
    expect(insertAt).toBeGreaterThan(-1);
    expect(recomputeAt).toBeGreaterThan(insertAt);
  });

  it("calls complete only after application insert in try_apply", () => {
    const insertAt = tryApplyFn.indexOf(
      "insert into public.learning_attempt_progress_applications"
    );
    const completeAt = tryApplyFn.indexOf(
      "learning_progress_complete_lesson_from_scored_attempt"
    );
    expect(insertAt).toBeGreaterThan(-1);
    expect(completeAt).toBeGreaterThan(insertAt);
  });
});

describe("Progress Mutations V1 — scoring hook", () => {
  it("hooks progress apply inside scoring apply after score write", () => {
    expect(scoringApplyFn).toMatch(
      new RegExp(
        `learning_progress_try_apply_from_scored_attempt`
      )
    );
    expect(LEARNING_PROGRESS_MUTATIONS_HOOK_HOST).toBe(
      "learning_scoring_apply_attempt_result"
    );
    const scoreAuditAt = scoringApplyFn.indexOf("'attempt.score'");
    const progressAt = scoringApplyFn.indexOf(
      "learning_progress_try_apply_from_scored_attempt"
    );
    expect(scoreAuditAt).toBeGreaterThan(-1);
    expect(progressAt).toBeGreaterThan(scoreAuditAt);
  });

  it("keeps apply EXECUTE revoked from authenticated", () => {
    expect(sql).toMatch(
      /revoke all on function public\.learning_scoring_apply_attempt_result\(uuid, uuid\)\s+from public, anon, authenticated/
    );
  });
});

describe("Progress Mutations V1 — audit", () => {
  it("writes scored-attempt progress audit actions", () => {
    expect(sql).toMatch(
      new RegExp(
        LEARNING_PROGRESS_MUTATIONS_AUDIT_ACTIONS.lessonCompleteScoredAttempt
      )
    );
    expect(sql).toMatch(
      new RegExp(LEARNING_PROGRESS_MUTATIONS_AUDIT_ACTIONS.attemptScoredApply)
    );
  });
});

describe("Progress Mutations V1 — pass gate helper", () => {
  it("treats null passing_score as scored-enough for score mode", () => {
    expect(
      learningProgressScoreCompletes({
        completionMode: "score",
        passingScore: null,
        resultStatus: "scored",
        passed: null,
      })
    ).toBe(true);
  });

  it("requires passed when passing_score is set", () => {
    expect(
      learningProgressScoreCompletes({
        completionMode: "score",
        passingScore: 70,
        resultStatus: "scored",
        passed: false,
      })
    ).toBe(false);
    expect(
      learningProgressScoreCompletes({
        completionMode: "score",
        passingScore: 70,
        resultStatus: "scored",
        passed: true,
      })
    ).toBe(true);
  });

  it("ignores non-score completion modes and non-scored results", () => {
    expect(
      learningProgressScoreCompletes({
        completionMode: "submit",
        passingScore: null,
        resultStatus: "scored",
        passed: null,
      })
    ).toBe(false);
    expect(
      learningProgressScoreCompletes({
        completionMode: "score",
        passingScore: null,
        resultStatus: "pending",
        passed: null,
      })
    ).toBe(false);
  });
});
