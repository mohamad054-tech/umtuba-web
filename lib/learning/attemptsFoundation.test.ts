import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LEARNING_ATTEMPT_ANSWER_PAYLOAD_KEYS,
  LEARNING_ATTEMPT_ANSWERABLE_TYPES,
  LEARNING_ATTEMPT_AUDIT_ACTIONS,
  LEARNING_ATTEMPT_HELPERS,
  LEARNING_ATTEMPT_LIMITS,
  LEARNING_ATTEMPT_RPCS,
  LEARNING_ATTEMPT_STATUSES,
  LEARNING_ATTEMPT_TERMINAL_STATUSES,
} from "./attemptsFoundation";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260838_learning_attempts_foundation_v1.sql";
const DOC = "docs/learning/implementation/ATTEMPTS_FOUNDATION_V1.md";
const QUESTIONS_MIGRATION =
  "supabase/migrations/20260837_learning_questions_foundation_v1.sql";
const PROGRESS_MIGRATION =
  "supabase/migrations/20260835_learning_progress_foundation_v1.sql";
const ACTIVITIES_MIGRATION =
  "supabase/migrations/20260833_learning_activities_foundation_v1.sql";
const ENROLLMENTS_MIGRATION =
  "supabase/migrations/20260834_learning_enrollments_foundation_v1.sql";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

/**
 * Strip `--` line comments so negative assertions verify the executable SQL,
 * not the (deliberately explanatory) prose. The migration intentionally names
 * the answer-key firewall in comments; those must never count as references.
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
      ? fnStarts[idx + 1].index ?? sql.length
      : sql.length;
  return sql.slice(start, end);
}

describe("Attempts Foundation V1 — files, ordering & deps", () => {
  it("ships migration, constants module, docs, and prior deps exist", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, DOC))).toBe(true);
    expect(existsSync(join(ROOT, "lib/learning/attemptsFoundation.ts"))).toBe(
      true
    );
    expect(existsSync(join(ROOT, QUESTIONS_MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, PROGRESS_MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, ACTIVITIES_MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, ENROLLMENTS_MIGRATION))).toBe(true);
  });

  it("is ordered after Questions (20260838 > 20260837)", () => {
    expect(MIGRATION > QUESTIONS_MIGRATION).toBe(true);
  });

  it("does NOT modify prior committed migrations (only adds 20260838)", () => {
    expect(MIGRATION).toContain("20260838");
  });
});

describe("Attempts Foundation V1 — schema: exactly two tables", () => {
  const sql = read(MIGRATION);

  it("creates exactly two tables: learning_attempts + learning_attempt_answers", () => {
    const createdTables = [
      ...sql.matchAll(/create table if not exists public\.(\w+)/g),
    ].map((m) => m[1]);
    expect(createdTables).toEqual([
      "learning_attempts",
      "learning_attempt_answers",
    ]);
  });

  it("does NOT create an events table (audit-only via learning_audit_write)", () => {
    expect(sql).not.toMatch(
      /create table if not exists public\.\w*attempt_events/i
    );
    expect(sql).not.toMatch(/create table if not exists public\.\w*_events/i);
    expect(sql).toMatch(/learning_audit_write/);
  });

  it("denormalizes immutable space/course/lesson/activity scope + user (Progress-style)", () => {
    expect(sql).toMatch(
      /space_id uuid not null\s*\n\s*references public\.learning_spaces \(id\) on delete restrict/
    );
    expect(sql).toMatch(
      /course_id uuid not null\s*\n\s*references public\.learning_courses \(id\) on delete restrict/
    );
    expect(sql).toMatch(
      /lesson_id uuid not null\s*\n\s*references public\.learning_lessons \(id\) on delete restrict/
    );
    expect(sql).toMatch(
      /activity_id uuid not null\s*\n\s*references public\.learning_activities \(id\) on delete restrict/
    );
    expect(sql).toMatch(
      /user_id uuid not null\s*\n\s*references public\.profiles \(id\) on delete restrict/
    );
  });

  it("has optional enrollment attribution like Progress", () => {
    expect(sql).toMatch(
      /enrollment_id uuid\s*\n\s*references public\.learning_enrollments \(id\) on delete set null/
    );
    expect(sql).toMatch(/learning_progress_resolve_enrollment_id/);
  });

  it("declares the four statuses with NO draft", () => {
    expect([...LEARNING_ATTEMPT_STATUSES]).toEqual([
      "active",
      "submitted",
      "expired",
      "cancelled",
    ]);
    expect(sql).toMatch(/learning_attempts_status_check/);
    expect(sql).toMatch(
      /status in \('active', 'submitted', 'expired', 'cancelled'\)/
    );
    // No draft anywhere in the attempts status domain.
    expect(sql).not.toMatch(/'draft'/);
  });

  it("has NO scoring/correctness/points/grade columns", () => {
    const tableStart = sql.indexOf(
      "create table if not exists public.learning_attempts"
    );
    const tableEnd = sql.indexOf(");", tableStart);
    const tableBody = stripSqlComments(sql.slice(tableStart, tableEnd));
    for (const forbidden of [
      /\bscore\b/i,
      /\bpassed\b/i,
      /pass_fail/i,
      /\bgrade\b/i,
      /\bpoints\b/i,
      /correct/i,
      /partial_credit/i,
    ]) {
      expect(tableBody).not.toMatch(forbidden);
    }
  });

  it("snapshots time_limit + max_attempts (inert copies) and questions payload", () => {
    expect(sql).toMatch(/time_limit_seconds_snapshot integer/);
    expect(sql).toMatch(/max_attempts_snapshot integer/);
    expect(sql).toMatch(/questions_snapshot jsonb not null default '\[\]'::jsonb/);
    expect(sql).toMatch(/jsonb_typeof\(questions_snapshot\) = 'array'/);
  });

  it("declares lifecycle timestamps", () => {
    expect(sql).toMatch(/started_at timestamptz not null default now\(\)/);
    expect(sql).toMatch(/last_activity_at timestamptz not null default now\(\)/);
    expect(sql).toMatch(/submitted_at timestamptz/);
    expect(sql).toMatch(/expired_at timestamptz/);
    expect(sql).toMatch(/cancelled_at timestamptz/);
  });
});

describe("Attempts Foundation V1 — uniqueness & indexes", () => {
  const sql = read(MIGRATION);

  it("enforces one active attempt per (user, activity) via partial unique", () => {
    expect(sql).toMatch(
      /create unique index if not exists learning_attempts_one_active_uidx[\s\S]*?on public\.learning_attempts \(user_id, activity_id\)[\s\S]*?where status = 'active'/
    );
  });

  it("enforces unique (user_id, activity_id, attempt_number)", () => {
    expect(sql).toMatch(
      /unique \(user_id, activity_id, attempt_number\)/
    );
  });

  it("indexes user/activity/status, attempt/question, and timestamps", () => {
    expect(sql).toMatch(/learning_attempts_user_activity_status_idx/);
    expect(sql).toMatch(/learning_attempts_activity_status_idx/);
    expect(sql).toMatch(/learning_attempts_started_at_idx/);
    expect(sql).toMatch(/learning_attempts_last_activity_at_idx/);
    expect(sql).toMatch(/learning_attempt_answers_attempt_idx/);
    expect(sql).toMatch(/learning_attempt_answers_question_idx/);
  });
});

describe("Attempts Foundation V1 — answers table", () => {
  const sql = read(MIGRATION);

  it("has attempt_id (cascade), question_id (FK), unique (attempt_id, question_id)", () => {
    expect(sql).toMatch(
      /attempt_id uuid not null\s*\n\s*references public\.learning_attempts \(id\) on delete cascade/
    );
    expect(sql).toMatch(
      /question_id uuid not null\s*\n\s*references public\.learning_questions \(id\) on delete restrict/
    );
    expect(sql).toMatch(/unique \(attempt_id, question_id\)/);
  });

  it("stores only a learner response payload — no answer key/correctness/score", () => {
    const tableStart = sql.indexOf(
      "create table if not exists public.learning_attempt_answers"
    );
    const tableEnd = sql.indexOf(");", tableStart);
    const tableBody = stripSqlComments(sql.slice(tableStart, tableEnd));
    expect(tableBody).toMatch(/answer_payload jsonb not null/);
    expect(tableBody).toMatch(/jsonb_typeof\(answer_payload\) = 'object'/);
    expect(tableBody).not.toMatch(/answer_key/);
    expect(tableBody).not.toMatch(/\bscore\b/i);
    expect(tableBody).not.toMatch(/correct/i);
    expect(tableBody).not.toMatch(/\bgrade\b/i);
  });

  it("tracks first_answered_at + last_saved_at", () => {
    expect(sql).toMatch(/first_answered_at timestamptz not null default now\(\)/);
    expect(sql).toMatch(/last_saved_at timestamptz not null default now\(\)/);
  });

  it("does NOT denormalize user_id (ownership derives from the attempt)", () => {
    const tableStart = sql.indexOf(
      "create table if not exists public.learning_attempt_answers"
    );
    const tableEnd = sql.indexOf(");", tableStart);
    const tableBody = sql.slice(tableStart, tableEnd);
    expect(tableBody).not.toMatch(/user_id/);
  });
});

describe("Attempts Foundation V1 — immutability guards", () => {
  const sql = read(MIGRATION);

  it("guards attempt identity + snapshots (incl. questions_snapshot & started_at)", () => {
    const fn = fnBody(sql, "learning_attempt_guard_immutable");
    for (const col of [
      "space_id",
      "course_id",
      "lesson_id",
      "activity_id",
      "user_id",
      "attempt_number",
      "started_at",
      "time_limit_seconds_snapshot",
      "max_attempts_snapshot",
      "questions_snapshot",
      "created_at",
    ]) {
      expect(fn).toMatch(
        new RegExp(`new\\.${col} is distinct from old\\.${col}`)
      );
    }
    expect(fn).toMatch(/identity\/snapshot columns are immutable/);
    expect(sql).toMatch(
      /create trigger learning_attempts_guard_immutable[\s\S]*?before update/
    );
  });

  it("no RPC ever reassigns immutable attempt columns", () => {
    expect(sql).not.toMatch(/set\s+questions_snapshot\s*=/i);
    expect(sql).not.toMatch(/set\s+started_at\s*=/i);
    expect(sql).not.toMatch(/set\s+attempt_number\s*=/i);
    expect(sql).not.toMatch(/set\s+user_id\s*=/i);
    expect(sql).not.toMatch(/set\s+activity_id\s*=/i);
  });

  it("guards answer identity (attempt_id/question_id/first_answered_at/created_at)", () => {
    const fn = fnBody(sql, "learning_attempt_answer_guard_immutable");
    expect(fn).toMatch(/new\.attempt_id is distinct from old\.attempt_id/);
    expect(fn).toMatch(/new\.question_id is distinct from old\.question_id/);
    expect(fn).toMatch(
      /new\.first_answered_at is distinct from old\.first_answered_at/
    );
    expect(fn).toMatch(/identity columns are immutable/);
  });
});

describe("Attempts Foundation V1 — ANSWER-KEY FIREWALL (critical)", () => {
  const sql = read(MIGRATION);

  it("NEVER references learning_question_answer_keys anywhere (code, not comments)", () => {
    const code = stripSqlComments(sql);
    expect(code).not.toMatch(/learning_question_answer_keys/);
    expect(code).not.toMatch(/answer_key/);
  });

  it("snapshot builder loads ONLY published questions with learner-safe fields", () => {
    const fn = fnBody(sql, "learning_attempt_build_questions_snapshot");
    expect(fn).toMatch(/from public\.learning_questions q/);
    expect(fn).toMatch(/q\.status = 'published'/);
    expect(fn).toMatch(/order by q\.position, q\.id/);
    // Only learner-safe keys are emitted.
    expect(fn).toMatch(/'question_id', q\.id/);
    expect(fn).toMatch(/'question_type', q\.question_type/);
    expect(fn).toMatch(/'content', q\.content/);
    // Never joins/reads any answer key or correctness.
    expect(fn).not.toMatch(/answer_key/);
    expect(fn).not.toMatch(/correct/i);
  });

  it("response validation is STRUCTURAL only — never compared to a key", () => {
    const fn = fnBody(sql, "learning_attempt_validate_answer");
    expect(fn).not.toMatch(/answer_key/);
    expect(fn).not.toMatch(/correct_key/);
    expect(fn).not.toMatch(/is_correct/);
  });

  it("get_my_learning_attempt never returns keys/correct answers", () => {
    const fn = fnBody(sql, "get_my_learning_attempt");
    expect(fn).not.toMatch(/answer_key/);
    expect(fn).not.toMatch(/correct/i);
    // Returns learner-safe snapshot + the caller's own saved answers only.
    expect(fn).toMatch(/'questions_snapshot', v_attempt\.questions_snapshot/);
    expect(fn).toMatch(/'answer_payload', ans\.answer_payload/);
  });

  it("does NOT add a learner SELECT policy on questions/answer keys", () => {
    expect(sql).not.toMatch(/on public\.learning_questions for select/);
    expect(sql).not.toMatch(
      /on public\.learning_question_answer_keys for select/
    );
  });
});

describe("Attempts Foundation V1 — snapshot immutability vs live edits", () => {
  const sql = read(MIGRATION);

  it("snapshot is embedded at start and never rebuilt/updated later", () => {
    // Snapshot is built once (in start) and inserted; never re-selected/updated.
    const startFn = fnBody(sql, "start_learning_attempt");
    expect(startFn).toMatch(
      /learning_attempt_build_questions_snapshot\(p_activity_id\)/
    );
    // The snapshot builder is invoked ONLY in start.
    const calls = [
      ...sql.matchAll(/learning_attempt_build_questions_snapshot\(/g),
    ];
    // one definition + one revoke + one call in start = builder call appears once
    // outside its own definition/revoke lines.
    expect(startFn.match(/learning_attempt_build_questions_snapshot\(/g)?.length).toBe(1);
    // guard forbids changing questions_snapshot after create.
    const guard = fnBody(sql, "learning_attempt_guard_immutable");
    expect(guard).toMatch(
      /new\.questions_snapshot is distinct from old\.questions_snapshot/
    );
  });

  it("save validates against the snapshot content, not the live question row", () => {
    const fn = fnBody(sql, "save_learning_attempt_answer");
    expect(fn).toMatch(/jsonb_array_elements\(v_attempt\.questions_snapshot\)/);
    expect(fn).toMatch(/Question is not part of this attempt/);
    expect(fn).toMatch(/v_snap_q ->> 'question_type'/);
    expect(fn).toMatch(/v_snap_q -> 'content'/);
    // Does not re-read learning_questions to validate the response.
    expect(fn).not.toMatch(/from public\.learning_questions/);
  });
});

describe("Attempts Foundation V1 — start RPC", () => {
  const sql = read(MIGRATION);
  const fn = fnBody(sql, "start_learning_attempt");

  it("uses server identity only; never accepts client scope/limits", () => {
    expect(fn).toMatch(/v_uid uuid := auth\.uid\(\)/);
    expect(fn).not.toMatch(/p_user_id/);
    expect(fn).not.toMatch(/p_course_id/);
    expect(fn).not.toMatch(/p_space_id/);
    expect(fn).not.toMatch(/p_max_attempts/);
    expect(fn).not.toMatch(/p_time_limit/);
    // Only the activity id is accepted from the client.
    expect(sql).toMatch(/function public\.start_learning_attempt\(\s*p_activity_id uuid\s*\)/);
  });

  it("checks entitlement via has_learning_course_access before reading settings", () => {
    const accessIdx = fn.indexOf("has_learning_course_access");
    const settingsIdx = fn.indexOf("from public.learning_activity_settings");
    expect(accessIdx).toBeGreaterThan(0);
    expect(settingsIdx).toBeGreaterThan(0);
    expect(accessIdx).toBeLessThan(settingsIdx);
  });

  it("requires an active space and a fully published parent chain + activity", () => {
    expect(fn).toMatch(/Learning space must be active to start an attempt/);
    expect(fn).toMatch(/Parent program must be published to start an attempt/);
    expect(fn).toMatch(/Parent course must be published to start an attempt/);
    expect(fn).toMatch(/Parent section must be published to start an attempt/);
    expect(fn).toMatch(/Parent lesson must be published to start an attempt/);
    expect(fn).toMatch(/Activity must be published to start an attempt/);
  });

  it("locks the parent activity FOR UPDATE (concurrency contract)", () => {
    expect(fn).toMatch(
      /from public\.learning_activities\s+where id = p_activity_id\s+for update/
    );
  });

  it("is idempotent: resumes a live active attempt after lazy expiry", () => {
    expect(fn).toMatch(/status = 'active'\s*\n\s*for update/);
    expect(fn).toMatch(/learning_attempt_expire_if_due\(v_existing\.id\)/);
    expect(fn).toMatch(/'resumed', true/);
  });

  it("enforces max_attempts by counting terminal attempts (race-free under lock)", () => {
    expect(fn).toMatch(
      /status in \('submitted', 'expired', 'cancelled'\)/
    );
    expect(fn).toMatch(/Maximum attempts reached for this activity/);
    expect([...LEARNING_ATTEMPT_TERMINAL_STATUSES]).toEqual([
      "submitted",
      "expired",
      "cancelled",
    ]);
  });

  it("rejects start when there are no published questions", () => {
    expect(fn).toMatch(/Activity has no published questions to attempt/);
    expect(fn).toMatch(/jsonb_array_length\(v_snapshot\) < 1/);
  });

  it("snapshots the live settings into the new attempt", () => {
    expect(fn).toMatch(/v_settings\.time_limit_seconds/);
    expect(fn).toMatch(/v_settings\.max_attempts/);
  });

  it("assigns a monotonic attempt_number", () => {
    expect(fn).toMatch(/coalesce\(max\(attempt_number\), 0\) \+ 1/);
  });
});

describe("Attempts Foundation V1 — lazy expiry (no background job)", () => {
  const sql = read(MIGRATION);
  const fn = fnBody(sql, "learning_attempt_expire_if_due");

  it("locks the row and transitions active→expired using the DB clock", () => {
    expect(fn).toMatch(/where id = p_attempt_id\s*\n\s*for update/);
    expect(fn).toMatch(/v_attempt\.status = 'active'/);
    expect(fn).toMatch(/v_attempt\.time_limit_seconds_snapshot is not null/);
    expect(fn).toMatch(
      /now\(\) > v_attempt\.started_at\s*\n?\s*\+ make_interval\(secs => v_attempt\.time_limit_seconds_snapshot\)/
    );
    expect(fn).toMatch(/set status = 'expired'/);
    expect(fn).toMatch(/expired_at = now\(\)/);
  });

  it("is invoked before read/save/submit/cancel", () => {
    for (const name of [
      "save_learning_attempt_answer",
      "get_my_learning_attempt",
      "submit_learning_attempt",
      "cancel_learning_attempt",
    ]) {
      expect(fnBody(sql, name)).toMatch(
        /learning_attempt_expire_if_due\(p_attempt_id\)/
      );
    }
  });

  it("implements NO background job / scheduled sweep", () => {
    expect(sql).not.toMatch(/pg_cron/i);
    expect(sql).not.toMatch(/cron\.schedule/i);
    expect(sql).not.toMatch(/expire_due_learning_attempts/i);
  });
});

describe("Attempts Foundation V1 — save_learning_attempt_answer", () => {
  const sql = read(MIGRATION);
  const fn = fnBody(sql, "save_learning_attempt_answer");

  it("requires ownership + active status (after lazy expiry)", () => {
    expect(fn).toMatch(/v_attempt := public\.learning_attempt_expire_if_due\(p_attempt_id\)/);
    expect(fn).toMatch(/v_attempt\.user_id is distinct from v_uid/);
    expect(fn).toMatch(/Not allowed to modify this attempt/);
    expect(fn).toMatch(/v_attempt\.status is distinct from 'active'/);
  });

  it("upserts idempotently and preserves first_answered_at", () => {
    expect(fn).toMatch(/on conflict \(attempt_id, question_id\) do update/);
    expect(fn).toMatch(/set answer_payload = excluded\.answer_payload/);
    expect(fn).toMatch(/last_saved_at = v_now/);
    // first_answered_at is only set on insert; never in the update branch.
    const updateBranch = fn.slice(fn.indexOf("do update"));
    expect(updateBranch).not.toMatch(/first_answered_at\s*=/);
  });

  it("updates the attempt's last_activity_at", () => {
    expect(fn).toMatch(/update public\.learning_attempts\s*\n\s*set last_activity_at = v_now/);
  });

  it("audits with SAFE metadata only — never the payload", () => {
    expect(fn).toMatch(/'attempt\.answer_save'/);
    const auditIdx = fn.indexOf("attempt.answer_save");
    const auditSlice = fn.slice(auditIdx, auditIdx + 400);
    expect(auditSlice).not.toMatch(/answer_payload/);
    expect(auditSlice).toMatch(/'saved', true/);
  });
});

describe("Attempts Foundation V1 — per-type response validation", () => {
  const sql = read(MIGRATION);
  const fn = fnBody(sql, "learning_attempt_validate_answer");

  it("is object-only and bounded to 16384 bytes", () => {
    expect(fn).toMatch(/answer_payload must be a JSON object/);
    expect(fn).toMatch(/v_max_bytes integer := 16384/);
    expect(LEARNING_ATTEMPT_LIMITS.answerPayloadMaxBytes).toBe(16384);
  });

  it("multiple_choice_single: one key that must exist among snapshot options", () => {
    expect(fn).toMatch(/answer_payload\.selected_key must be a string/);
    expect(fn).toMatch(
      /answer_payload\.selected_key must reference an existing option key/
    );
    expect(LEARNING_ATTEMPT_ANSWER_PAYLOAD_KEYS.multiple_choice_single).toEqual([
      "selected_key",
    ]);
  });

  it("multiple_choice_multiple: unique keys, all in options, bounded by option count", () => {
    expect(fn).toMatch(/answer_payload\.selected_keys must be an array/);
    expect(fn).toMatch(
      /answer_payload\.selected_keys exceeds the number of options/
    );
    expect(fn).toMatch(
      /answer_payload\.selected_keys must reference existing option keys/
    );
    expect(fn).toMatch(/answer_payload\.selected_keys must be unique/);
    expect(
      LEARNING_ATTEMPT_ANSWER_PAYLOAD_KEYS.multiple_choice_multiple
    ).toEqual(["selected_keys"]);
  });

  it("true_false: boolean only", () => {
    expect(fn).toMatch(/answer_payload\.value must be a boolean/);
    expect(LEARNING_ATTEMPT_ANSWER_PAYLOAD_KEYS.true_false).toEqual(["value"]);
  });

  it("short_answer: bounded text with safe-text (no raw HTML)", () => {
    expect(fn).toMatch(/answer_payload\.text must be a string/);
    expect(fn).toMatch(/answer_payload\.text exceeds the maximum of 5000 chars/);
    expect(fn).toMatch(/learning_attempt_assert_safe_text/);
    expect(LEARNING_ATTEMPT_ANSWER_PAYLOAD_KEYS.short_answer).toEqual(["text"]);
    expect(LEARNING_ATTEMPT_LIMITS.shortAnswerTextMaxChars).toBe(5000);
  });

  it("fill_blank: only declared blank keys, bounded safe strings", () => {
    expect(fn).toMatch(/answer_payload\.blanks must be a JSON object/);
    expect(fn).toMatch(/answer_payload\.blanks references unknown blank/);
    expect(fn).toMatch(/answer_payload\.blanks\.% must be a string/);
    expect(LEARNING_ATTEMPT_ANSWER_PAYLOAD_KEYS.fill_blank).toEqual(["blanks"]);
  });

  it("numeric: valid number only — no expression/JS/NaN/Infinity", () => {
    expect(fn).toMatch(/answer_payload\.value must be a number/);
    expect(LEARNING_ATTEMPT_ANSWER_PAYLOAD_KEYS.numeric).toEqual(["value"]);
    expect(fn).not.toMatch(/eval\(/i);
    expect(fn).not.toMatch(/to_expression/i);
  });

  it("enforces a strict per-type payload key allowlist", () => {
    expect(fn).toMatch(/answer_payload contains unexpected key % for type %/);
  });

  it("safe-text helper rejects HTML/JS/iframe/handlers", () => {
    const safe = fnBody(sql, "learning_attempt_assert_safe_text");
    expect(safe).toMatch(/script\|iframe\|object\|embed\|html/);
    expect(safe).toMatch(/javascript\|vbscript/);
    expect(safe).toMatch(/contains unsafe HTML or script content/);
  });

  it("mirrors the answerable types (creatable Question types only)", () => {
    expect([...LEARNING_ATTEMPT_ANSWERABLE_TYPES]).toEqual([
      "multiple_choice_single",
      "multiple_choice_multiple",
      "true_false",
      "short_answer",
      "fill_blank",
      "numeric",
    ]);
    for (const t of LEARNING_ATTEMPT_ANSWERABLE_TYPES) {
      expect(fn).toMatch(new RegExp(`p_type = '${t}'`));
    }
  });
});

describe("Attempts Foundation V1 — lifecycle: submit & cancel", () => {
  const sql = read(MIGRATION);

  it("submit: active→submitted once; idempotent; expired/cancelled cannot submit", () => {
    const fn = fnBody(sql, "submit_learning_attempt");
    expect(fn).toMatch(/learning_attempt_expire_if_due\(p_attempt_id\)/);
    expect(fn).toMatch(/if v_attempt\.status = 'submitted' then/);
    expect(fn).toMatch(/v_attempt\.status is distinct from 'active'/);
    expect(fn).toMatch(/Attempt is % and cannot be submitted/);
    expect(fn).toMatch(/set status = 'submitted'/);
    expect(fn).toMatch(/submitted_at = v_now/);
  });

  it("submit does NOT score, touch progress, or issue certificates", () => {
    const fn = fnBody(sql, "submit_learning_attempt");
    expect(fn).not.toMatch(/\bscore\b/i);
    expect(fn).not.toMatch(/learning_lesson_progress/);
    expect(fn).not.toMatch(/learning_course_progress/);
    expect(fn).not.toMatch(/certificate/i);
    expect(fn).not.toMatch(/answer_key/);
  });

  it("cancel: active→cancelled only; idempotent; keeps answers; counts toward max", () => {
    const fn = fnBody(sql, "cancel_learning_attempt");
    expect(fn).toMatch(/learning_attempt_expire_if_due\(p_attempt_id\)/);
    expect(fn).toMatch(/if v_attempt\.status = 'cancelled' then/);
    expect(fn).toMatch(/v_attempt\.status is distinct from 'active'/);
    expect(fn).toMatch(/set status = 'cancelled'/);
    expect(fn).toMatch(/cancelled_at = v_now/);
    // Keeps answers (no delete of learning_attempt_answers anywhere).
    expect(sql).not.toMatch(/delete from public\.learning_attempt_answers/);
  });

  it("terminal statuses never reopen to active (no RPC sets status='active' on update)", () => {
    // Only start inserts 'active'; no lifecycle RPC updates a row back to active.
    expect(sql).not.toMatch(/set status = 'active'/);
  });
});

describe("Attempts Foundation V1 — Progress untouched (fully separate)", () => {
  const sql = read(MIGRATION);

  it("performs ZERO mutations to lesson/course progress tables", () => {
    expect(sql).not.toMatch(/insert into public\.learning_lesson_progress/);
    expect(sql).not.toMatch(/update public\.learning_lesson_progress/);
    expect(sql).not.toMatch(/insert into public\.learning_course_progress/);
    expect(sql).not.toMatch(/update public\.learning_course_progress/);
    expect(sql).not.toMatch(/learning_progress_recompute_course/);
    expect(sql).not.toMatch(/complete_learning_lesson/);
  });
});

describe("Attempts Foundation V1 — RLS & staff access", () => {
  const sql = read(MIGRATION);

  it("FORCE + ENABLE RLS on both tables; RPC-only writes; no anon", () => {
    for (const t of ["learning_attempts", "learning_attempt_answers"]) {
      expect(sql).toMatch(
        new RegExp(`alter table public\\.${t} enable row level security`)
      );
      expect(sql).toMatch(
        new RegExp(`alter table public\\.${t} force row level security`)
      );
      expect(sql).toMatch(
        new RegExp(`revoke insert, update, delete on table public\\.${t}`)
      );
      expect(sql).toMatch(
        new RegExp(`grant select on table public\\.${t} to authenticated`)
      );
    }
    expect(sql).not.toMatch(/\bto anon\b/);
  });

  it("learners read only their own attempts; managers/admin read in scope", () => {
    expect(sql).toMatch(/create policy "Learners read own attempts"/);
    expect(sql).toMatch(/user_id = \(select auth\.uid\(\)\)/);
    expect(sql).toMatch(/create policy "Managers read scoped attempts"/);
    expect(sql).toMatch(/public\.can_manage_learning_course\(course_id\)/);
    expect(sql).toMatch(/create policy "Platform admins read all attempts"/);
  });

  it("answers are readable by owner (via attempt), scoped managers, and admin", () => {
    expect(sql).toMatch(/create policy "Learners read own attempt answers"/);
    expect(sql).toMatch(/create policy "Managers read scoped attempt answers"/);
    expect(sql).toMatch(
      /create policy "Platform admins read all attempt answers"/
    );
  });

  it("ordinary space members cannot see others' attempts (no space-member read)", () => {
    expect(sql).not.toMatch(/is_learning_space_member/);
  });

  it("adds NO manual grading RPCs", () => {
    expect(sql).not.toMatch(/grade_learning_attempt/i);
    expect(sql).not.toMatch(/score_learning_attempt/i);
    expect(sql).not.toMatch(/review_learning_attempt/i);
  });
});

describe("Attempts Foundation V1 — security hardening & RPC-only writes", () => {
  const sql = read(MIGRATION);

  it("requires authentication in every client RPC", () => {
    for (const name of Object.values(LEARNING_ATTEMPT_RPCS)) {
      const start = sql.indexOf(`create or replace function public.${name}`);
      expect(start).toBeGreaterThanOrEqual(0);
      const body = sql.slice(start, start + 900);
      expect(body).toMatch(/v_uid uuid := auth\.uid\(\)/);
      expect(body).toMatch(/Authentication required/);
    }
  });

  it("all RPCs are SECURITY DEFINER with search_path = public", () => {
    for (const name of Object.values(LEARNING_ATTEMPT_RPCS)) {
      const start = sql.indexOf(`create or replace function public.${name}`);
      const body = sql.slice(start, start + 500);
      expect(body).toMatch(/security definer/i);
      expect(body).toMatch(/set search_path = public/i);
    }
  });

  it("grants RPC EXECUTE to authenticated+service_role, revokes public/anon", () => {
    for (const name of Object.values(LEARNING_ATTEMPT_RPCS)) {
      expect(sql).toMatch(
        new RegExp(
          `revoke all on function public\\.${name}\\([\\s\\S]*?\\)\\s+from public, anon`,
          "i"
        )
      );
      expect(sql).toMatch(
        new RegExp(
          `grant execute on function public\\.${name}\\([\\s\\S]*?\\)\\s+to authenticated, service_role`,
          "i"
        )
      );
    }
  });

  it("keeps internal helpers/validators revoked from all clients", () => {
    for (const name of Object.values(LEARNING_ATTEMPT_HELPERS)) {
      expect(sql).toMatch(
        new RegExp(
          `revoke all on function public\\.${name}\\([\\s\\S]*?from public, anon, authenticated`
        )
      );
    }
  });
});

describe("Attempts Foundation V1 — audit & scope containment", () => {
  const sql = read(MIGRATION);

  it("audits the full lifecycle via learning_audit_write", () => {
    for (const action of Object.values(LEARNING_ATTEMPT_AUDIT_ACTIONS)) {
      expect(sql).toMatch(new RegExp(`'${action.replace(".", "\\.")}'`));
    }
    expect(Object.values(LEARNING_ATTEMPT_AUDIT_ACTIONS)).toEqual([
      "attempt.start",
      "attempt.answer_save",
      "attempt.submit",
      "attempt.expire",
      "attempt.cancel",
    ]);
  });

  it("does NOT create out-of-scope tables (score/grade/certificate/assignment/bank)", () => {
    const createdTables = [
      ...sql.matchAll(/create table if not exists public\.(\w+)/g),
    ].map((m) => m[1]);
    expect(createdTables).toEqual([
      "learning_attempts",
      "learning_attempt_answers",
    ]);
    expect(sql).not.toMatch(/create table if not exists public\.\w*grade/i);
    expect(sql).not.toMatch(/create table if not exists public\.\w*score/i);
    expect(sql).not.toMatch(/create table if not exists public\.\w*certificate/i);
    expect(sql).not.toMatch(/create table if not exists public\.\w*assignment/i);
    expect(sql).not.toMatch(/create table if not exists public\.\w*bank/i);
  });

  it("names all client RPCs in constants and SQL", () => {
    for (const name of Object.values(LEARNING_ATTEMPT_RPCS)) {
      expect(sql).toMatch(
        new RegExp(`create or replace function public\\.${name}`, "i")
      );
    }
  });
});

describe("Attempts Foundation V1 — documentation", () => {
  it("documents scope, hierarchy, lifecycle, snapshot, firewall, exclusions", () => {
    const doc = read(DOC);
    expect(doc).toMatch(/Attempts Foundation V1/i);
    expect(doc).toMatch(/learning_attempts/);
    expect(doc).toMatch(/learning_attempt_answers/);
    expect(doc).toMatch(
      /Space → Program → Course → Section → Lesson → Activity → Attempt|Space -> Program -> Course -> Section -> Lesson -> Activity -> Attempt/
    );
    expect(doc).toMatch(/active/);
    expect(doc).toMatch(/submitted/);
    expect(doc).toMatch(/expired/);
    expect(doc).toMatch(/cancelled/);
    expect(doc).toMatch(/snapshot/i);
    expect(doc).toMatch(/answer.?key/i);
    expect(doc).toMatch(/lazy expiry/i);
    expect(doc).toMatch(/max_attempts/);
    expect(doc).toMatch(/no scoring|NO scoring|without.*scoring/i);
  });
});
