import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LEARNING_LESSON_COMPLETION_SOURCES,
  LEARNING_PROGRESS_AUDIT_ACTIONS,
  LEARNING_PROGRESS_EVENT_TYPES,
  LEARNING_PROGRESS_HELPERS,
  LEARNING_PROGRESS_RPCS,
  LEARNING_PROGRESS_STATUSES,
} from "./progressFoundation";

const sqlPath = resolve(
  process.cwd(),
  "supabase/migrations/20260835_learning_progress_foundation_v1.sql"
);
const sql = readFileSync(sqlPath, "utf8");

describe("Progress Foundation V1 — migration presence & access gate", () => {
  it("is numbered after enrollments (20260835) with no collision markers", () => {
    expect(sqlPath).toContain("20260835_learning_progress_foundation_v1.sql");
    expect(sql).toMatch(/Progress Foundation V1/i);
  });

  it("expands has_learning_course_access with parent program enrollment inheritance", () => {
    const start = sql.indexOf(
      "create or replace function public.has_learning_course_access"
    );
    expect(start).toBeGreaterThan(-1);
    const end = sql.indexOf("$$;", start);
    const fn = sql.slice(start, end);

    expect(fn).toMatch(/is_platform_admin/);
    expect(fn).toMatch(/can_manage_learning_course/);
    expect(fn).toMatch(/e\.course_id = p_course_id/);
    expect(fn).toMatch(/e\.program_id = c\.program_id/);
    expect(fn).toMatch(/status = 'active'/);
    expect(fn).toMatch(/starts_at is null or [\s\S]*?starts_at <= now\(\)/);
    expect(fn).toMatch(/expires_at is null or [\s\S]*?expires_at > now\(\)/);
    expect(fn).toMatch(/security definer/i);
    expect(fn).toMatch(/set search_path = public/);
  });
});

describe("Progress Foundation V1 — schema", () => {
  it("creates lesson + course progress + append-only events (no activity progress)", () => {
    expect(sql).toMatch(/create table if not exists public\.learning_lesson_progress/);
    expect(sql).toMatch(/create table if not exists public\.learning_course_progress/);
    expect(sql).toMatch(/create table if not exists public\.learning_progress_events/);
    expect(sql).not.toMatch(/create table if not exists public\.learning_activity_progress/);
  });

  it("enforces unique learner progress per lesson and per course", () => {
    expect(sql).toMatch(
      /constraint learning_lesson_progress_user_lesson_unique unique \(user_id, lesson_id\)/
    );
    expect(sql).toMatch(
      /constraint learning_course_progress_user_course_unique unique \(user_id, course_id\)/
    );
  });

  it("stores completed_lessons_count, total_lessons_count, and DB percent_complete", () => {
    expect(sql).toMatch(/completed_lessons_count integer not null default 0/);
    expect(sql).toMatch(/total_lessons_count integer not null default 0/);
    expect(sql).toMatch(/percent_complete integer not null default 0/);
    expect(sql).toMatch(
      /constraint learning_course_progress_percent_bounds check \(\s*percent_complete >= 0 and percent_complete <= 100\s*\)/
    );
    expect(sql).toMatch(
      /constraint learning_course_progress_counts_consistent check \(\s*completed_lessons_count <= total_lessons_count\s*\)/
    );
  });

  it("keeps last_activity_id reserved null without activity FK in V1", () => {
    expect(sql).toMatch(/last_activity_id uuid,/);
    expect(sql).toMatch(/Always null in V1/);
    expect(sql).not.toMatch(
      /last_activity_id uuid[\s\S]*?references public\.learning_activities/
    );
  });

  it("uses progress statuses not_started|in_progress|completed", () => {
    for (const status of LEARNING_PROGRESS_STATUSES) {
      expect(sql).toContain(`'${status}'`);
    }
  });

  it("FORCE RLS on progress tables and grants SELECT to authenticated only (no anon)", () => {
    for (const table of [
      "learning_lesson_progress",
      "learning_course_progress",
      "learning_progress_events",
    ]) {
      expect(sql).toMatch(
        new RegExp(
          `alter table public\\.${table} enable row level security;[\\s\\S]*?force row level security`
        )
      );
      expect(sql).toMatch(
        new RegExp(`grant select on table public\\.${table} to authenticated`)
      );
      expect(sql).not.toMatch(
        new RegExp(`grant select on table public\\.${table} to anon`)
      );
    }
  });

  it("revokes client writes on progress tables", () => {
    for (const table of [
      "learning_lesson_progress",
      "learning_course_progress",
      "learning_progress_events",
    ]) {
      expect(sql).toMatch(
        new RegExp(
          `revoke insert, update, delete on table public\\.${table}\\s+from anon, authenticated`
        )
      );
    }
  });

  it("forbids mutation on progress events (append-only)", () => {
    expect(sql).toMatch(/learning_progress_events_forbid_mutation/);
    expect(sql).toMatch(
      /learning_progress_events is append-only/
    );
  });

  it("guards identity immutability on lesson and course progress", () => {
    expect(sql).toMatch(/learning_lesson_progress_guard_immutable/);
    expect(sql).toMatch(/learning_course_progress_guard_immutable/);
    expect(sql).toMatch(
      /learning_lesson_progress identity columns are immutable/
    );
  });
});

describe("Progress Foundation V1 — RPCs & security", () => {
  it("exposes the approved RPC set with SECURITY DEFINER + search_path", () => {
    for (const rpc of Object.values(LEARNING_PROGRESS_RPCS)) {
      const start = sql.indexOf(`create or replace function public.${rpc}`);
      expect(start).toBeGreaterThan(-1);
      const end = sql.indexOf("$$;", start);
      const fn = sql.slice(start, end);
      expect(fn).toMatch(/security definer/i);
      expect(fn).toMatch(/set search_path = public/);
    }
  });

  it("revokes EXECUTE from public/anon and grants authenticated + service_role", () => {
    for (const rpc of Object.values(LEARNING_PROGRESS_RPCS)) {
      expect(sql).toMatch(
        new RegExp(
          `revoke all on function public\\.${rpc}[\\s\\S]*?from public, anon`
        )
      );
      expect(sql).toMatch(
        new RegExp(
          `grant execute on function public\\.${rpc}[\\s\\S]*?to authenticated, service_role`
        )
      );
    }
  });

  it("gates lesson writes on has_learning_course_access (server-derived course)", () => {
    for (const rpc of [
      "start_learning_lesson",
      "touch_learning_lesson",
      "complete_learning_lesson",
      "reopen_learning_lesson",
    ]) {
      const start = sql.indexOf(`create or replace function public.${rpc}`);
      const end = sql.indexOf("$$;", start);
      const fn = sql.slice(start, end);
      expect(fn).toMatch(/has_learning_course_access\(v_ctx\.o_course\.id/);
      expect(fn).toMatch(/learning_progress_load_lesson_context/);
      expect(fn).not.toMatch(/p_user_id/);
      expect(fn).not.toMatch(/p_course_id/);
      expect(fn).not.toMatch(/p_percent/);
    }
  });

  it("computes percent from completed/total in recompute helper (never client input)", () => {
    const start = sql.indexOf(
      "create or replace function public.learning_progress_recompute_course"
    );
    const end = sql.indexOf("$$;", start);
    const fn = sql.slice(start, end);
    expect(fn).toMatch(/les\.status = 'published'/);
    expect(fn).toMatch(/floor\(\(100\.0 \* v_completed\) \/ v_total\)/);
    expect(fn).toMatch(/completed_lessons_count = v_completed/);
    expect(fn).toMatch(/total_lessons_count = v_total/);
    expect(fn).toMatch(/percent_complete = v_percent/);
  });

  it("complete is idempotent and preserves first_completed_at on reopen path", () => {
    const completeStart = sql.indexOf(
      "create or replace function public.complete_learning_lesson"
    );
    const completeEnd = sql.indexOf("$$;", completeStart);
    const completeFn = sql.slice(completeStart, completeEnd);
    expect(completeFn).toMatch(/v_row\.status = 'completed'/);
    expect(completeFn).toMatch(/first_completed_at = coalesce\(first_completed_at, v_now\)/);
    expect(completeFn).toMatch(/completion_source = 'manual'/);

    const reopenStart = sql.indexOf(
      "create or replace function public.reopen_learning_lesson"
    );
    const reopenEnd = sql.indexOf("$$;", reopenStart);
    const reopenFn = sql.slice(reopenStart, reopenEnd);
    expect(reopenFn).toMatch(/Only completed lessons can be reopened/);
    expect(reopenFn).toMatch(/completed_at = null/);
    expect(reopenFn).toMatch(/first_completed_at retained/);
  });

  it("does not create attempt/certificate/payment/activity-progress RPCs", () => {
    expect(sql).not.toMatch(/create or replace function public\.\w*attempt/i);
    expect(sql).not.toMatch(/create or replace function public\.\w*certificate/i);
    expect(sql).not.toMatch(/create or replace function public\.\w*payment/i);
    expect(sql).not.toMatch(
      /create or replace function public\.\w*activity_progress/i
    );
  });

  it("does not expand activity settings draft read policies", () => {
    expect(sql).not.toMatch(/learning_activity_settings/);
    expect(sql).not.toMatch(/Members read activity settings/);
  });

  it("writes audit actions for start/complete/reopen", () => {
    for (const action of Object.values(LEARNING_PROGRESS_AUDIT_ACTIONS)) {
      expect(sql).toContain(`'${action}'`);
    }
  });

  it("keeps internal helpers revoked from clients", () => {
    for (const helper of [
      LEARNING_PROGRESS_HELPERS.recomputeCourse,
      LEARNING_PROGRESS_HELPERS.resolveEnrollment,
      LEARNING_PROGRESS_HELPERS.loadLessonContext,
      LEARNING_PROGRESS_HELPERS.eventWrite,
    ]) {
      expect(sql).toMatch(
        new RegExp(
          `revoke all on function public\\.${helper}[\\s\\S]*?from public, anon, authenticated`
        )
      );
    }
  });
});

describe("Progress Foundation V1 — TS contract parity", () => {
  it("mirrors status / completion / event / rpc constants", () => {
    expect(LEARNING_PROGRESS_STATUSES).toEqual([
      "not_started",
      "in_progress",
      "completed",
    ]);
    expect(LEARNING_LESSON_COMPLETION_SOURCES).toEqual([
      "manual",
      "scored_attempt",
    ]);
    expect(LEARNING_PROGRESS_EVENT_TYPES).toContain("course_rollup_updated");
    expect(LEARNING_PROGRESS_RPCS.completeLesson).toBe(
      "complete_learning_lesson"
    );
    expect(LEARNING_PROGRESS_HELPERS.hasCourseAccess).toBe(
      "has_learning_course_access"
    );
  });
});
