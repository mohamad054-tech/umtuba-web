import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LEARNING_ATTEMPT_RESULT_STATUSES,
  LEARNING_SCORING_ANSWERABLE_TYPES,
  LEARNING_SCORING_AUDIT_ACTIONS,
  LEARNING_SCORING_EXACT_MATCH_RULES,
  LEARNING_SCORING_HELPERS,
  LEARNING_SCORING_RPCS,
} from "./scoringFoundation";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260839_learning_scoring_foundation_v1.sql";
const DOC = "docs/learning/implementation/SCORING_FOUNDATION_V1.md";
const ATTEMPTS_MIGRATION =
  "supabase/migrations/20260838_learning_attempts_foundation_v1.sql";
const QUESTIONS_MIGRATION =
  "supabase/migrations/20260837_learning_questions_foundation_v1.sql";
const ACTIVITIES_MIGRATION =
  "supabase/migrations/20260833_learning_activities_foundation_v1.sql";
const PROGRESS_MIGRATION =
  "supabase/migrations/20260835_learning_progress_foundation_v1.sql";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

/**
 * Strip `--` line comments so negative assertions verify the executable SQL,
 * not the (deliberately explanatory) prose.
 */
function stripSqlComments(s: string) {
  return s.replace(/--[^\n]*/g, "");
}

/** Slice the body of a named function up to the next function definition. */
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

describe("Scoring Foundation V1 — files, ordering & deps", () => {
  it("ships migration, constants module, docs, and prior deps exist", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, DOC))).toBe(true);
    expect(existsSync(join(ROOT, "lib/learning/scoringFoundation.ts"))).toBe(
      true
    );
    expect(existsSync(join(ROOT, ATTEMPTS_MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, QUESTIONS_MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, ACTIVITIES_MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, PROGRESS_MIGRATION))).toBe(true);
  });

  it("is ordered after Attempts (20260839 > 20260838)", () => {
    expect(MIGRATION > ATTEMPTS_MIGRATION).toBe(true);
  });

  it("does NOT modify prior committed migrations (only adds 20260839)", () => {
    expect(MIGRATION).toContain("20260839");
  });
});

describe("Scoring Foundation V1 — schema: exactly two result tables", () => {
  const sql = read(MIGRATION);

  it("creates exactly two tables: results + answer_results", () => {
    const createdTables = [
      ...sql.matchAll(/create table if not exists public\.(\w+)/g),
    ].map((m) => m[1]);
    expect(createdTables).toEqual([
      "learning_attempt_results",
      "learning_attempt_answer_results",
    ]);
  });

  it("does NOT add score columns onto learning_attempts / answers (D1)", () => {
    expect(sql).not.toMatch(
      /alter table public\.learning_attempts\s+add/i
    );
    expect(sql).not.toMatch(
      /alter table public\.learning_attempt_answers\s+add/i
    );
  });

  it("attempt_results: attempt_id PK FK CASCADE + denormalized scope", () => {
    expect(sql).toMatch(
      /attempt_id uuid primary key\s*\n\s*references public\.learning_attempts \(id\) on delete cascade/
    );
    expect(sql).toMatch(
      /space_id uuid not null\s*\n\s*references public\.learning_spaces \(id\) on delete restrict/
    );
    expect(sql).toMatch(
      /course_id uuid not null\s*\n\s*references public\.learning_courses \(id\) on delete restrict/
    );
    expect(sql).toMatch(
      /activity_id uuid not null\s*\n\s*references public\.learning_activities \(id\) on delete restrict/
    );
    expect(sql).toMatch(
      /user_id uuid not null\s*\n\s*references public\.profiles \(id\) on delete restrict/
    );
  });

  it("attempt_results status is scored-only; has score/passed/snapshots", () => {
    expect([...LEARNING_ATTEMPT_RESULT_STATUSES]).toEqual(["scored"]);
    expect(sql).toMatch(/learning_attempt_results_status_check/);
    expect(sql).toMatch(/status = 'scored'/);
    expect(sql).toMatch(/score_earned numeric not null/);
    expect(sql).toMatch(/score_max numeric not null/);
    expect(sql).toMatch(/passed boolean/);
    expect(sql).toMatch(/max_score_snapshot numeric/);
    expect(sql).toMatch(/passing_score_snapshot numeric/);
    expect(sql).toMatch(/evaluation_mode_snapshot text not null/);
    expect(sql).toMatch(/evaluation_mode_snapshot = 'auto'/);
    expect(sql).toMatch(/scored_at timestamptz not null/);
    expect(sql).toMatch(/scored_by uuid/);
  });

  it("attempt_results has NO grade/rubric/manual/AI columns", () => {
    const tableStart = sql.indexOf(
      "create table if not exists public.learning_attempt_results"
    );
    const tableEnd = sql.indexOf(");", tableStart);
    const tableBody = stripSqlComments(sql.slice(tableStart, tableEnd));
    for (const forbidden of [
      /\bgrade\b/i,
      /rubric/i,
      /manual_override/i,
      /\bai_/i,
      /answer_key/i,
    ]) {
      expect(tableBody).not.toMatch(forbidden);
    }
  });

  it("answer_results: unique(attempt, question) + correctness + points", () => {
    expect(sql).toMatch(
      /attempt_id uuid not null\s*\n\s*references public\.learning_attempts \(id\) on delete cascade/
    );
    expect(sql).toMatch(
      /question_id uuid not null\s*\n\s*references public\.learning_questions \(id\) on delete restrict/
    );
    expect(sql).toMatch(
      /learning_attempt_answer_results_attempt_question_unique/
    );
    expect(sql).toMatch(/unique \(attempt_id, question_id\)/);
    expect(sql).toMatch(/is_correct boolean not null/);
    expect(sql).toMatch(/points_possible numeric not null/);
    expect(sql).toMatch(/points_earned numeric not null/);
  });

  it("answer_results has NO answer_key or answer_payload copy", () => {
    const tableStart = sql.indexOf(
      "create table if not exists public.learning_attempt_answer_results"
    );
    const tableEnd = sql.indexOf(");", tableStart);
    const tableBody = stripSqlComments(sql.slice(tableStart, tableEnd));
    expect(tableBody).not.toMatch(/answer_key/);
    expect(tableBody).not.toMatch(/answer_payload/);
    expect(tableBody).not.toMatch(/partial/i);
  });

  it("ENABLE + FORCE RLS on both result tables", () => {
    expect(sql).toMatch(
      /alter table public\.learning_attempt_results enable row level security/
    );
    expect(sql).toMatch(
      /alter table public\.learning_attempt_results force row level security/
    );
    expect(sql).toMatch(
      /alter table public\.learning_attempt_answer_results enable row level security/
    );
    expect(sql).toMatch(
      /alter table public\.learning_attempt_answer_results force row level security/
    );
  });

  it("grants SELECT to authenticated; revokes I/U/D; no anon", () => {
    for (const table of [
      "learning_attempt_results",
      "learning_attempt_answer_results",
    ]) {
      expect(sql).toMatch(
        new RegExp(
          `revoke all on table public\\.${table}\\s+from public, anon, authenticated`
        )
      );
      expect(sql).toMatch(
        new RegExp(`grant select on table public\\.${table} to authenticated`)
      );
      expect(sql).toMatch(
        new RegExp(
          `revoke insert, update, delete on table public\\.${table}\\s+from anon, authenticated`
        )
      );
      expect(sql).toMatch(
        new RegExp(`grant all on table public\\.${table} to service_role`)
      );
    }
  });

  it("guards immutable identity/scope columns", () => {
    expect(sql).toMatch(/learning_attempt_result_guard_immutable/);
    expect(sql).toMatch(/learning_attempt_answer_result_guard_immutable/);
  });
});

describe("Scoring Foundation V1 — snapshot extension (points only — D3)", () => {
  const sql = read(MIGRATION);
  const fn = fnBody(sql, "learning_attempt_build_questions_snapshot");

  it("REPLACE extends snapshot with points from learning_questions", () => {
    expect(fn).toMatch(/'points', q\.points/);
    expect(fn).toMatch(/'question_id', q\.id/);
    expect(fn).toMatch(/'question_type', q\.question_type/);
    expect(fn).toMatch(/'position', q\.position/);
    expect(fn).toMatch(/'content', q\.content/);
  });

  it("snapshot builder NEVER touches answer keys (firewall)", () => {
    const code = stripSqlComments(fn);
    expect(code).not.toMatch(/learning_question_answer_keys/);
    expect(code).not.toMatch(/answer_key/);
    expect(code).not.toMatch(/correct_key/);
    expect(code).not.toMatch(/accepted/);
    expect(code).not.toMatch(/tolerance/);
  });

  it("keeps snapshot builder revoked from clients", () => {
    expect(sql).toMatch(
      /revoke all on function public\.learning_attempt_build_questions_snapshot\(uuid\)\s+from public, anon, authenticated/
    );
  });
});

describe("Scoring Foundation V1 — exact-match evaluator (D5)", () => {
  const sql = read(MIGRATION);
  const fn = fnBody(sql, "learning_scoring_evaluate_answer");

  it("covers all six answerable types", () => {
    expect([...LEARNING_SCORING_ANSWERABLE_TYPES]).toEqual([
      "multiple_choice_single",
      "multiple_choice_multiple",
      "true_false",
      "short_answer",
      "fill_blank",
      "numeric",
    ]);
    for (const t of LEARNING_SCORING_ANSWERABLE_TYPES) {
      expect(fn).toMatch(new RegExp(`'${t}'`));
      expect(LEARNING_SCORING_EXACT_MATCH_RULES[t]).toBeTruthy();
    }
  });

  it("unanswered (null payload) → false", () => {
    expect(fn).toMatch(/p_answer_payload is null/);
    expect(fn).toMatch(/return false/);
  });

  it("MCQ single: selected_key equals correct_key", () => {
    expect(fn).toMatch(/selected_key/);
    expect(fn).toMatch(/correct_key/);
  });

  it("MCQ multi: set equality of selected_keys and correct_keys", () => {
    expect(fn).toMatch(/selected_keys/);
    expect(fn).toMatch(/correct_keys/);
    expect(fn).toMatch(/v_selected_keys = v_correct_keys/);
  });

  it("true_false: boolean value equals correct", () => {
    expect(fn).toMatch(/p_answer_key ->> 'correct'/);
  });

  it("short_answer: normalize via trim/case_sensitive only (no regex)", () => {
    const norm = fnBody(sql, "learning_scoring_normalize_short_answer");
    expect(norm).toMatch(/trim/);
    expect(norm).toMatch(/case_sensitive/);
    expect(stripSqlComments(norm)).not.toMatch(/~/);
    expect(stripSqlComments(norm)).not.toMatch(/regexp/i);
    expect(fn).toMatch(/learning_scoring_normalize_short_answer/);
    expect(fn).toMatch(/accepted/);
  });

  it("fill_blank: all blanks must match (no partial credit)", () => {
    expect(fn).toMatch(/jsonb_object_keys\(v_answers\)/);
    expect(fn).toMatch(/return false/);
  });

  it("numeric: abs(diff) <= coalesce(tolerance, 0)", () => {
    expect(fn).toMatch(/abs\(v_learner_num - v_key_num\)/);
    expect(fn).toMatch(/coalesce\(v_tolerance, 0\)/);
  });

  it("helpers are revoked from all clients", () => {
    for (const name of [
      LEARNING_SCORING_HELPERS.normalizeShortAnswer,
      LEARNING_SCORING_HELPERS.evaluateAnswer,
    ]) {
      expect(sql).toMatch(
        new RegExp(
          `revoke all on function public\\.${name}\\([\\s\\S]*?from public, anon, authenticated`
        )
      );
    }
  });
});

describe("Scoring Foundation V1 — score_learning_attempt RPC (D2)", () => {
  const sql = read(MIGRATION);
  const fn = fnBody(sql, "score_learning_attempt");

  it("is the sole Scoring RPC and is SECURITY DEFINER", () => {
    expect(LEARNING_SCORING_RPCS.score).toBe("score_learning_attempt");
    expect(Object.values(LEARNING_SCORING_RPCS)).toEqual([
      "score_learning_attempt",
    ]);
    expect(fn).toMatch(/security definer/i);
    expect(fn).toMatch(/set search_path = public/i);
  });

  it("requires auth and staff (manager or platform admin) — not learner", () => {
    expect(fn).toMatch(/v_uid uuid := auth\.uid\(\)/);
    expect(fn).toMatch(/Authentication required/);
    expect(fn).toMatch(/can_manage_learning_course\(v_attempt\.course_id, v_uid\)/);
    expect(fn).toMatch(/is_platform_admin\(v_uid\)/);
    expect(fn).toMatch(/Not allowed to score this attempt/);
    // Must NOT gate on attempt owner.
    expect(fn).not.toMatch(/v_attempt\.user_id is not distinct from v_uid/);
    expect(fn).not.toMatch(/v_attempt\.user_id = v_uid/);
  });

  it("runs lazy expiry then requires submitted only (D10)", () => {
    expect(fn).toMatch(/learning_attempt_expire_if_due\(p_attempt_id\)/);
    expect(fn).toMatch(/v_attempt\.status is distinct from 'submitted'/);
    expect(fn).toMatch(/Attempt must be submitted to score/);
  });

  it("requires evaluation_mode = auto (D7)", () => {
    expect(fn).toMatch(/from public\.learning_activity_settings/);
    expect(fn).toMatch(/evaluation_mode is distinct from 'auto'/);
    expect(fn).toMatch(/evaluation_mode must be auto/);
  });

  it("fail-closes when snapshot elements lack points key", () => {
    expect(fn).toMatch(/v_snap_elem \? 'points'/);
    expect(fn).toMatch(
      /questions_snapshot is missing points; attempt is not scoreable/
    );
  });

  it("fail-closes when any answer key is missing — before writes (D4)", () => {
    expect(fn).toMatch(/learning_question_answer_keys/);
    expect(fn).toMatch(/Answer key missing for one or more questions/);
    // Delete of prior results must come AFTER the missing-key gate.
    const missingIdx = fn.indexOf(
      "Answer key missing for one or more questions"
    );
    const deleteIdx = fn.indexOf(
      "delete from public.learning_attempt_answer_results"
    );
    expect(missingIdx).toBeGreaterThanOrEqual(0);
    expect(deleteIdx).toBeGreaterThan(missingIdx);
  });

  it("idempotent re-score: deletes answer results then upserts attempt result", () => {
    expect(fn).toMatch(
      /delete from public\.learning_attempt_answer_results\s+where attempt_id = p_attempt_id/
    );
    expect(fn).toMatch(/on conflict \(attempt_id\) do update/);
  });

  it("aggregates score_earned/score_max; null points → 0; passed from passing_score", () => {
    expect(fn).toMatch(/v_score_earned := v_score_earned \+ v_points_earned/);
    expect(fn).toMatch(/v_score_max := v_score_max \+ v_points_possible/);
    expect(fn).toMatch(/v_points_possible := 0/);
    expect(fn).toMatch(/passing_score is null/);
    expect(fn).toMatch(/v_score_earned >= v_settings\.passing_score/);
  });

  it("returns staff-safe summary only — never keys or payloads", () => {
    expect(fn).toMatch(/'score_earned'/);
    expect(fn).toMatch(/'score_max'/);
    expect(fn).toMatch(/'passed'/);
    expect(fn).toMatch(/'scored_at'/);
    expect(fn).toMatch(/'answer_results'/);
    expect(fn).toMatch(/'is_correct'/);
    expect(fn).toMatch(/'points_earned'/);
    expect(fn).toMatch(/'points_possible'/);
    const code = stripSqlComments(fn);
    // Return payload must not include answer_key or answer_payload.
    const returnIdx = code.lastIndexOf("return jsonb_build_object");
    const ret = code.slice(returnIdx);
    expect(ret).not.toMatch(/answer_key/);
    expect(ret).not.toMatch(/answer_payload/);
  });

  it("audits attempt.score with safe metadata only", () => {
    expect(LEARNING_SCORING_AUDIT_ACTIONS.score).toBe("attempt.score");
    expect(fn).toMatch(/'attempt\.score'/);
    expect(fn).toMatch(/learning_audit_write/);
    const auditStart = fn.indexOf("learning_audit_write");
    const audit = fn.slice(auditStart, auditStart + 600);
    expect(audit).toMatch(/score_earned/);
    expect(audit).toMatch(/score_max/);
    expect(audit).toMatch(/passed/);
    expect(audit).not.toMatch(/answer_key/);
    expect(audit).not.toMatch(/answer_payload/);
    expect(audit).not.toMatch(/accepted/);
  });

  it("performs ZERO Progress mutations (D8)", () => {
    const code = stripSqlComments(fn);
    expect(code).not.toMatch(/learning_lesson_progress/);
    expect(code).not.toMatch(/learning_course_progress/);
    expect(code).not.toMatch(/complete_learning_lesson/);
    expect(code).not.toMatch(/learning_progress_recompute_course/);
  });

  it("does NOT fold scoring into submit_learning_attempt", () => {
    expect(sql).not.toMatch(
      /create or replace function public\.submit_learning_attempt/
    );
  });

  it("grants EXECUTE to authenticated+service_role; revokes public/anon", () => {
    expect(sql).toMatch(
      /revoke all on function public\.score_learning_attempt\(uuid\)\s+from public, anon/
    );
    expect(sql).toMatch(
      /grant execute on function public\.score_learning_attempt\(uuid\)\s+to authenticated, service_role/
    );
  });
});

describe("Scoring Foundation V1 — staff-only RLS (D6 / D9)", () => {
  const sql = read(MIGRATION);

  it("managers + platform admins can SELECT results; no learner owner policy", () => {
    expect(sql).toMatch(
      /create policy "Managers read scoped attempt results"/
    );
    expect(sql).toMatch(
      /create policy "Platform admins read all attempt results"/
    );
    expect(sql).toMatch(
      /create policy "Managers read scoped attempt answer results"/
    );
    expect(sql).toMatch(
      /create policy "Platform admins read all attempt answer results"/
    );
    expect(sql).toMatch(/can_manage_learning_course\(course_id\)/);
    expect(sql).toMatch(/is_platform_admin\(\)/);
    // No learner owner policy on result tables.
    expect(sql).not.toMatch(/Learners read own attempt results/i);
    expect(sql).not.toMatch(/Learners read own attempt answer results/i);
    expect(sql).not.toMatch(
      /user_id = \(select auth\.uid\(\)\)/
    );
  });

  it("never widens result reads via space membership or course access", () => {
    const code = stripSqlComments(sql);
    // Policies section must not use these broadeners.
    expect(code).not.toMatch(
      /create policy[\s\S]*is_learning_space_member/
    );
    expect(code).not.toMatch(
      /create policy[\s\S]*has_learning_course_access/
    );
  });

  it("adds NO learner get-result RPC", () => {
    expect(sql).not.toMatch(/get_my_learning_attempt_result/i);
    expect(sql).not.toMatch(/get_learning_attempt_result/i);
    expect(sql).not.toMatch(
      /create or replace function public\.get_my_learning_attempt/
    );
  });
});

describe("Scoring Foundation V1 — exclusions & security summary", () => {
  const sql = read(MIGRATION);
  const code = stripSqlComments(sql);

  it("does not implement manual/AI grading or partial credit RPCs", () => {
    expect(sql).not.toMatch(/grade_learning_attempt/i);
    expect(sql).not.toMatch(/manual_grade/i);
    expect(sql).not.toMatch(/ai_grade/i);
    expect(sql).not.toMatch(/partial_credit/i);
  });

  it("does not mutate Progress tables anywhere in the migration code", () => {
    expect(code).not.toMatch(/insert into public\.learning_lesson_progress/i);
    expect(code).not.toMatch(/update public\.learning_lesson_progress/i);
    expect(code).not.toMatch(/insert into public\.learning_course_progress/i);
    expect(code).not.toMatch(/update public\.learning_course_progress/i);
    expect(code).not.toMatch(/complete_learning_lesson/);
    expect(code).not.toMatch(/learning_progress_recompute_course/);
  });

  it("documents Decision Log locks D1–D10 in the scoring doc", () => {
    const doc = read(DOC);
    expect(doc).toMatch(/Decision Log/);
    for (const d of ["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "D10"]) {
      expect(doc).toMatch(new RegExp(`\\| ${d} \\|`));
    }
    expect(doc).toMatch(/score_learning_attempt/);
    expect(doc).toMatch(/learning_attempt_results/);
    expect(doc).toMatch(/learning_attempt_answer_results/);
  });
});
