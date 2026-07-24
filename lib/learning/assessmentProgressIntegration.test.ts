import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  LEARNING_ASSESSMENT_PROGRESS_FORBIDDEN,
  LEARNING_ASSESSMENT_PROGRESS_INTERNAL,
  LEARNING_ASSESSMENT_PROGRESS_RPCS,
  applyAssessmentProgress,
  loadAssessmentProgressStatus,
  parseAssessmentProgressApplyView,
  sanitizeAssessmentProgressError,
} from "./assessmentProgressIntegration";
import { LEARNING_PROGRESS_RPCS } from "./progressFoundation";

const ROOT = join(__dirname, "../..");
const MIGRATION =
  "supabase/migrations/20260854_learning_assessment_progress_integration_v1.sql";
const SRC = readFileSync(
  join(ROOT, "lib/learning/assessmentProgressIntegration.ts"),
  "utf8"
);
const ACTIONS = readFileSync(
  join(ROOT, "app/learning/assessmentProgressActions.ts"),
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

describe("Assessment Progress Integration V1 — files", () => {
  it("ships Git-only migration after manual review", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(MIGRATION > "supabase/migrations/20260853").toBe(true);
    expect(
      readdirSync(join(ROOT, "supabase/migrations"))
    ).toContain(
      "20260854_learning_assessment_progress_integration_v1.sql"
    );
    expect(read(MIGRATION)).not.toMatch(/create table/i);
  });
});

describe("Assessment Progress Integration V1 — SQL", () => {
  const sql = read(MIGRATION);

  it("applies only graded + passed=true via existing progress helpers", () => {
    const fn = stripSqlComments(
      fnBody(sql, "learning_progress_try_apply_from_graded_assessment")
    );
    expect(LEARNING_ASSESSMENT_PROGRESS_INTERNAL.tryApply).toBe(
      "learning_progress_try_apply_from_graded_assessment"
    );
    expect(fn).toMatch(/status is distinct from 'graded'/);
    expect(fn).toMatch(/passed is distinct from true/);
    expect(fn).toMatch(/passed_null/);
    expect(fn).toMatch(/passed_false/);
    expect(fn).toMatch(/grading_incomplete/);
    expect(fn).toMatch(/learning_progress_complete_lesson_from_scored_attempt/);
    expect(fn).toMatch(/learning_attempt_progress_applications/);
    expect(fn).toMatch(/idempotent/);
    expect(fn).toMatch(/for update/i);
    expect(fn).toMatch(/relationship is malformed/);
    expect(fn).not.toMatch(/update public\.learning_attempt_answers/i);
    expect(fn).not.toMatch(/learning_attempt_answer_results/);
    expect(fn).not.toMatch(/certificate/i);
    expect(fn).not.toMatch(/reward/i);
    expect(fn).not.toMatch(/analytics/i);
  });

  it("owner RPC validates auth.uid and rejects foreign; no authoritative client fields", () => {
    const fn = stripSqlComments(
      fnBody(sql, "apply_my_learning_assessment_progress")
    );
    expect(fn).toMatch(/auth\.uid\(\)/);
    expect(fn).toMatch(/Not allowed to apply progress/);
    expect(fn).toMatch(/learning_progress_try_apply_from_graded_assessment/);
    expect(fn).not.toMatch(/p_user_id|p_passed|p_score|p_lesson_id/);
    expect(fn).toMatch(/set search_path\s*=\s*public/i);
  });

  it("grants/revokes correct; internal helper revoked from authenticated", () => {
    expect(sql).toMatch(
      /revoke all on function public\.learning_progress_try_apply_from_graded_assessment\(uuid, uuid\)\s+from public, anon, authenticated/
    );
    expect(sql).toMatch(
      /revoke all on function public\.apply_my_learning_assessment_progress\(uuid\)\s+from public, anon/
    );
    expect(sql).toMatch(
      /grant execute on function public\.apply_my_learning_assessment_progress\(uuid\)\s+to authenticated/
    );
    expect(sql).toMatch(
      /revoke all on function public\.get_my_learning_assessment_progress_status\(uuid\)\s+from public, anon/
    );
  });
});

describe("Assessment Progress Integration V1 — adapter/UI", () => {
  it("calls apply/status RPCs only and sanitizes foreign errors", async () => {
    const calls: string[] = [];
    const fake = {
      rpc: async (name: string) => {
        calls.push(name);
        if (name === LEARNING_ASSESSMENT_PROGRESS_RPCS.getStatus) {
          return {
            data: {
              attempt_id: ATTEMPT_ID,
              activity_id: ACTIVITY_ID,
              grading_status: "graded",
              passed: true,
              completion_recorded: false,
              applied_at: null,
              can_apply: true,
            },
            error: null,
          };
        }
        return {
          data: {
            attempt_id: ATTEMPT_ID,
            activity_id: ACTIVITY_ID,
            status: "applied",
            reason: null,
            completion_recorded: true,
            applied_at: "t",
            lesson_id: "11111111-1111-4111-8111-111111111111",
          },
          error: null,
        };
      },
      from: () => {
        throw new Error("no select");
      },
    };
    expect((await loadAssessmentProgressStatus(fake as never, ATTEMPT_ID)).ok).toBe(
      true
    );
    expect((await applyAssessmentProgress(fake as never, ATTEMPT_ID)).ok).toBe(
      true
    );
    expect(calls).toEqual([
      "get_my_learning_assessment_progress_status",
      "apply_my_learning_assessment_progress",
    ]);
    expect(
      sanitizeAssessmentProgressError(
        "Not allowed to apply progress for this attempt"
      )
    ).toMatch(/not allowed/i);
    expect(
      parseAssessmentProgressApplyView({
        attempt_id: ATTEMPT_ID,
        activity_id: ACTIVITY_ID,
        status: "skipped",
        reason: "passed_false",
        completion_recorded: false,
      })?.reason
    ).toBe("passed_false");
  });

  it("forbids direct completeLesson; UI shows completion status", () => {
    expect(LEARNING_ASSESSMENT_PROGRESS_FORBIDDEN.completeLesson).toBe(
      LEARNING_PROGRESS_RPCS.completeLesson
    );
    expect(SRC).not.toMatch(/\.from\(/);
    expect(SRC).not.toMatch(/complete_learning_lesson/);
    expect(ACTIONS).toMatch(/getServerUser/);
    expect(ACTIONS).not.toMatch(/SERVICE_ROLE|service_role/);
    expect(PANEL).toMatch(/Lesson completion/);
    expect(PANEL).toMatch(/Record lesson completion/);
    expect(PANEL).toMatch(/applyAssessmentProgressAction/);
  });
});
