import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LEARNING_COMPLETION_MODE_PROGRESS_AUDIT_ACTIONS,
  LEARNING_COMPLETION_MODE_PROGRESS_BLOCKED_MODES,
  LEARNING_COMPLETION_MODE_PROGRESS_ENABLED_MODES,
  LEARNING_COMPLETION_MODE_PROGRESS_HOOK_HOST,
  LEARNING_COMPLETION_MODE_PROGRESS_INTERNAL_HELPERS,
  LEARNING_COMPLETION_MODE_PROGRESS_MIGRATION,
  LEARNING_COMPLETION_MODE_PROGRESS_SKIP_REASONS,
  LEARNING_COMPLETION_MODE_PROGRESS_SUBMIT_MODE,
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
  learningProgressSubmitCompletes,
} from "./progressMutations";
import { LEARNING_LESSON_COMPLETION_SOURCES } from "./progressFoundation";

const sqlPath = resolve(
  process.cwd(),
  "supabase/migrations",
  LEARNING_PROGRESS_MUTATIONS_MIGRATION
);
const sql = readFileSync(sqlPath, "utf8");

const completionSqlPath = resolve(
  process.cwd(),
  "supabase/migrations",
  LEARNING_COMPLETION_MODE_PROGRESS_MIGRATION
);
const completionSql = readFileSync(completionSqlPath, "utf8");

function fnBody(source: string, name: string): string {
  const start = source.indexOf(`create or replace function public.${name}`);
  expect(start).toBeGreaterThan(-1);
  const end = source.indexOf("$$;", start);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

const scoringApplyFn = fnBody(sql, "learning_scoring_apply_attempt_result");
const tryApplyFn = fnBody(
  sql,
  "learning_progress_try_apply_from_scored_attempt"
);
const completeFn = fnBody(
  sql,
  "learning_progress_complete_lesson_from_scored_attempt"
);

const submitTryApplyFn = fnBody(
  completionSql,
  "learning_progress_try_apply_from_submitted_attempt"
);
const submitCompleteFn = fnBody(
  completionSql,
  "learning_progress_complete_lesson_from_submitted_attempt"
);
const submitRpcFn = fnBody(completionSql, "submit_learning_attempt");

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
  it("allows scored_attempt alongside manual in 20260845", () => {
    expect(sql).toMatch(
      /completion_source in \('manual', 'scored_attempt'\)/
    );
    expect(LEARNING_PROGRESS_MUTATIONS_COMPLETION_SOURCES).toEqual([
      "manual",
      "scored_attempt",
      "submitted_attempt",
    ]);
    expect(LEARNING_LESSON_COMPLETION_SOURCES).toContain("scored_attempt");
    expect(LEARNING_LESSON_COMPLETION_SOURCES).toContain("submitted_attempt");
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

  it("requires completion_mode score and leaves other modes unchanged in 20260845", () => {
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
    const recomputeAt = completeFn.indexOf("learning_progress_recompute_course");
    const insertAt = completeFn.indexOf(
      "insert into public.learning_lesson_progress"
    );
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
      /learning_progress_try_apply_from_scored_attempt/
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

describe("Completion-mode Progress V1 — migration identity", () => {
  it("uses additive migration 20260848 and does not edit 20260845 file", () => {
    expect(LEARNING_COMPLETION_MODE_PROGRESS_MIGRATION).toBe(
      "20260848_learning_completion_mode_progress_v1.sql"
    );
    expect(completionSql).toMatch(/Completion-mode Progress V1/i);
    expect(completionSql).toMatch(/20260848/);
    expect(completionSql).toMatch(/Does NOT edit migration 20260845/);
    expect(completionSql).not.toMatch(
      /create or replace function public\.learning_progress_try_apply_from_scored_attempt/
    );
    expect(completionSql).not.toMatch(
      /create or replace function public\.learning_scoring_apply_attempt_result/
    );
  });

  it("expands completion_source with submitted_attempt", () => {
    expect(completionSql).toMatch(
      /completion_source in \('manual', 'scored_attempt', 'submitted_attempt'\)/
    );
  });
});

describe("Completion-mode Progress V1 — submit try apply gates", () => {
  it("is security definer with search_path and revoked from clients", () => {
    expect(submitTryApplyFn).toMatch(/security definer/i);
    expect(submitTryApplyFn).toMatch(/set search_path = public/);
    expect(completionSql).toMatch(
      new RegExp(
        `revoke all on function public\\.${LEARNING_COMPLETION_MODE_PROGRESS_INTERNAL_HELPERS.tryApplyFromSubmittedAttempt}`
      )
    );
    expect(completionSql).toMatch(
      new RegExp(
        `grant execute on function public\\.${LEARNING_COMPLETION_MODE_PROGRESS_INTERNAL_HELPERS.tryApplyFromSubmittedAttempt}[\\s\\S]*?to service_role`
      )
    );
  });

  it("requires completion_mode submit only; blocks score/manual/view", () => {
    expect(submitTryApplyFn).toMatch(
      /completion_mode is distinct from 'submit'/
    );
    expect(submitTryApplyFn).toMatch(/completion_mode_not_submit/);
    expect(LEARNING_COMPLETION_MODE_PROGRESS_SUBMIT_MODE).toBe("submit");
    expect(LEARNING_COMPLETION_MODE_PROGRESS_ENABLED_MODES).toEqual([
      "score",
      "submit",
    ]);
    expect(LEARNING_COMPLETION_MODE_PROGRESS_BLOCKED_MODES).toEqual([
      "view",
      "manual",
    ]);
  });

  it("uses submitted status gate and does not require scoring", () => {
    expect(submitTryApplyFn).toMatch(/attempt_not_submitted/);
    expect(submitTryApplyFn).not.toMatch(/attempt_not_scored/);
    expect(submitTryApplyFn).not.toMatch(/passing_score_not_met/);
    expect(submitTryApplyFn).not.toMatch(/learning_attempt_results/);
  });

  it("reuses ledger first-winner and idempotency", () => {
    expect(submitTryApplyFn).toMatch(
      /learning_attempt_progress_applications/
    );
    expect(submitTryApplyFn).toMatch(/activity_already_applied/);
    expect(submitTryApplyFn).toMatch(/unique_violation/);
    expect(submitTryApplyFn).toMatch(/activity_already_applied_concurrent/);
    expect(submitTryApplyFn).toMatch(/'idempotent'/);
    expect(submitTryApplyFn).toMatch(/'applied'/);
  });

  it("loads relationships from attempt row only", () => {
    expect(submitTryApplyFn).toMatch(/v_attempt\.lesson_id/);
    expect(submitTryApplyFn).toMatch(/v_attempt\.user_id/);
    expect(submitTryApplyFn).toMatch(/v_attempt\.activity_id/);
    expect(submitTryApplyFn).not.toMatch(/p_lesson_id/);
    expect(submitTryApplyFn).not.toMatch(/p_user_id/);
    expect(submitTryApplyFn).not.toMatch(/p_activity_id/);
  });

  it("exposes submit skip reasons in TS contract", () => {
    for (const reason of LEARNING_COMPLETION_MODE_PROGRESS_SKIP_REASONS) {
      expect(submitTryApplyFn).toMatch(new RegExp(reason));
    }
  });
});

describe("Completion-mode Progress V1 — lesson then course same txn", () => {
  it("completes lesson with submitted_attempt then recomputes course", () => {
    expect(submitCompleteFn).toMatch(/completion_source = 'submitted_attempt'/);
    expect(submitCompleteFn).toMatch(/learning_progress_recompute_course/);
    const recomputeAt = submitCompleteFn.indexOf(
      "learning_progress_recompute_course"
    );
    const insertAt = submitCompleteFn.indexOf(
      "insert into public.learning_lesson_progress"
    );
    expect(insertAt).toBeGreaterThan(-1);
    expect(recomputeAt).toBeGreaterThan(insertAt);
  });

  it("calls complete only after application insert in try_apply", () => {
    const insertAt = submitTryApplyFn.indexOf(
      "insert into public.learning_attempt_progress_applications"
    );
    const completeAt = submitTryApplyFn.indexOf(
      "learning_progress_complete_lesson_from_submitted_attempt"
    );
    expect(insertAt).toBeGreaterThan(-1);
    expect(completeAt).toBeGreaterThan(insertAt);
  });

  it("revokes complete helper from authenticated", () => {
    expect(completionSql).toMatch(
      new RegExp(
        `revoke all on function public\\.${LEARNING_COMPLETION_MODE_PROGRESS_INTERNAL_HELPERS.completeLessonFromSubmittedAttempt}`
      )
    );
  });
});

describe("Completion-mode Progress V1 — submit hook", () => {
  it("hooks submit progress apply after trusted submit and before auto-score", () => {
    expect(LEARNING_COMPLETION_MODE_PROGRESS_HOOK_HOST).toBe(
      "submit_learning_attempt"
    );
    expect(submitRpcFn).toMatch(
      /learning_progress_try_apply_from_submitted_attempt/
    );

    const firstSubmitAudit = submitRpcFn.indexOf("'attempt.submit'");
    const firstProgress = submitRpcFn.indexOf(
      "learning_progress_try_apply_from_submitted_attempt",
      firstSubmitAudit
    );
    const firstAutoScore = submitRpcFn.indexOf(
      "learning_scoring_try_auto_score_submitted_attempt",
      firstProgress
    );
    expect(firstSubmitAudit).toBeGreaterThan(-1);
    expect(firstProgress).toBeGreaterThan(firstSubmitAudit);
    expect(firstAutoScore).toBeGreaterThan(firstProgress);
  });

  it("also recovers progress apply on idempotent already-submitted path", () => {
    const alreadySubmitted = submitRpcFn.indexOf(
      "if v_attempt.status = 'submitted' then"
    );
    const recoveryProgress = submitRpcFn.indexOf(
      "learning_progress_try_apply_from_submitted_attempt",
      alreadySubmitted
    );
    const recoveryAutoScore = submitRpcFn.indexOf(
      "learning_scoring_try_auto_score_submitted_attempt",
      recoveryProgress
    );
    expect(alreadySubmitted).toBeGreaterThan(-1);
    expect(recoveryProgress).toBeGreaterThan(alreadySubmitted);
    expect(recoveryAutoScore).toBeGreaterThan(recoveryProgress);
  });

  it("keeps learner-safe submit grants (authenticated + service_role)", () => {
    expect(completionSql).toMatch(
      /revoke all on function public\.submit_learning_attempt\(uuid\)\s+from public, anon/
    );
    expect(completionSql).toMatch(
      /grant execute on function public\.submit_learning_attempt\(uuid\)\s+to authenticated, service_role/
    );
  });
});

describe("Completion-mode Progress V1 — audit", () => {
  it("writes submitted-attempt progress audit actions", () => {
    expect(completionSql).toMatch(
      new RegExp(
        LEARNING_COMPLETION_MODE_PROGRESS_AUDIT_ACTIONS.lessonCompleteSubmittedAttempt
      )
    );
    expect(completionSql).toMatch(
      new RegExp(
        LEARNING_COMPLETION_MODE_PROGRESS_AUDIT_ACTIONS.attemptSubmittedApply
      )
    );
  });
});

describe("Completion-mode Progress V1 — submit vs score helpers", () => {
  it("submit helper accepts submitted status for submit mode only", () => {
    expect(
      learningProgressSubmitCompletes({
        completionMode: "submit",
        attemptStatus: "submitted",
      })
    ).toBe(true);
    expect(
      learningProgressSubmitCompletes({
        completionMode: "submit",
        attemptStatus: "active",
      })
    ).toBe(false);
    expect(
      learningProgressSubmitCompletes({
        completionMode: "score",
        attemptStatus: "submitted",
      })
    ).toBe(false);
    expect(
      learningProgressSubmitCompletes({
        completionMode: "view",
        attemptStatus: "submitted",
      })
    ).toBe(false);
    expect(
      learningProgressSubmitCompletes({
        completionMode: "manual",
        attemptStatus: "submitted",
      })
    ).toBe(false);
  });

  it("score and submit helpers remain mutually exclusive", () => {
    expect(
      learningProgressScoreCompletes({
        completionMode: "submit",
        passingScore: null,
        resultStatus: "scored",
        passed: true,
      })
    ).toBe(false);
    expect(
      learningProgressSubmitCompletes({
        completionMode: "score",
        attemptStatus: "submitted",
      })
    ).toBe(false);
  });
});
