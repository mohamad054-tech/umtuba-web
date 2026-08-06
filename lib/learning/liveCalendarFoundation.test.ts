import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  LEARNING_LIVE_RPCS,
  LEARNING_LIVE_ROUTES,
  LEARNING_LIVE_EARLY_JOIN_MINUTES,
  LEARNING_CALENDAR_KINDS,
  sanitizeLiveCalendarError,
  isLiveCalendarUuid,
  formatLearningLiveInstant,
} from "./liveCalendarFoundation";

const ROOT = join(__dirname, "../..");
const MIGRATION =
  "supabase/migrations/20260859_learning_live_calendar_foundation_v1.sql";
const DOC =
  "docs/learning/implementation/LIVE_CALENDAR_FOUNDATION_V1.md";

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

describe("Live Learning & Calendar Foundation V1 — files", () => {
  it("ships migration, docs, and key pages", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, DOC))).toBe(true);
    expect(readdirSync(join(ROOT, "supabase/migrations"))).toContain(
      "20260859_learning_live_calendar_foundation_v1.sql"
    );
    expect(
      existsSync(join(ROOT, "app/learning/courses/[courseId]/live/page.tsx"))
    ).toBe(true);
    expect(
      existsSync(
        join(ROOT, "app/learning/instructor/courses/[courseId]/live/page.tsx")
      )
    ).toBe(true);
    expect(
      existsSync(
        join(ROOT, "app/learning/courses/[courseId]/calendar/page.tsx")
      )
    ).toBe(true);
    expect(
      existsSync(
        join(
          ROOT,
          "app/learning/instructor/courses/[courseId]/calendar/page.tsx"
        )
      )
    ).toBe(true);
  });

  it("exposes routes and join window constants", () => {
    const courseId = "11111111-1111-4111-8111-111111111111";
    expect(LEARNING_LIVE_ROUTES.learnerSchedule(courseId)).toContain("/live");
    expect(LEARNING_LIVE_EARLY_JOIN_MINUTES).toBe(15);
    expect(formatLearningLiveInstant("2026-07-24T12:00:00.000Z")).not.toBe("");
  });
});

describe("Live Learning & Calendar Foundation V1 — SQL", () => {
  const sql = read(MIGRATION);
  const body = stripSqlComments(sql);

  it("creates live session and attendance tables", () => {
    expect(sql).toMatch(/create table if not exists public\.learning_live_sessions/);
    expect(sql).toMatch(/learning_live_attendance/);
    expect(sql).toMatch(/status in \('scheduled', 'live', 'cancelled', 'completed'\)/);
  });

  it("extends notification types for live lifecycle", () => {
    expect(sql).toMatch(/learning_live_session_scheduled/);
    expect(sql).toMatch(/learning_live_session_updated/);
    expect(sql).toMatch(/learning_live_session_cancelled/);
    expect(sql).toMatch(/learning_course_completed/);
  });

  it("exposes all live/calendar RPCs", () => {
    for (const name of Object.values(LEARNING_LIVE_RPCS)) {
      expect(sql).toMatch(
        new RegExp(`create or replace function public\\.${name}`)
      );
    }
  });

  it("force-enables RLS and revokes DML from authenticated", () => {
    expect(body).toMatch(/force row level security/);
    expect(body).toMatch(
      /revoke insert, update, delete on table public\.learning_live_sessions/
    );
    expect(body).toMatch(
      /revoke insert, update, delete on table public\.learning_live_attendance/
    );
  });

  it("create requires manage auth; stores UTC timestamptz; sets server sfu room", () => {
    const fn = stripSqlComments(fnBody(sql, "create_learning_live_session"));
    expect(fn).toMatch(/learning_live_assert_manage/);
    expect(fn).toMatch(/auth\.uid\(\)/);
    expect(fn).toMatch(/learning_live_sfu_room_name/);
    expect(fn).toMatch(/learning_live_session_scheduled/);
    expect(fn).not.toMatch(/service_role/);
  });

  it("rejects time updates on terminal sessions", () => {
    const fn = stripSqlComments(fnBody(sql, "update_learning_live_session"));
    expect(fn).toMatch(/Terminal session cannot be updated/);
    expect(fn).toMatch(/before start/);
  });

  it("join gate enforces window and returns safe metadata only", () => {
    const fn = stripSqlComments(
      fnBody(sql, "get_learning_live_session_join_gate")
    );
    expect(fn).toMatch(/learning_live_in_join_window/);
    expect(fn).toMatch(/sfu_room_name/);
    expect(fn).toMatch(/identity/);
    expect(fn).toMatch(/media_token_issuance/);
    expect(fn).not.toMatch(/api_key|api_secret|LIVEKIT_API/i);
    expect(LEARNING_LIVE_EARLY_JOIN_MINUTES).toBe(15);
  });

  it("attendance is idempotent upsert with server timestamps", () => {
    const fn = stripSqlComments(
      fnBody(sql, "upsert_learning_live_attendance")
    );
    expect(fn).toMatch(/on conflict \(session_id, user_id\)/);
    expect(fn).toMatch(/joined_at/);
    expect(fn).toMatch(/last_seen_at/);
    expect(fn).toMatch(/left_at/);
    expect(fn).toMatch(/duration_seconds/);
    expect(fn).toMatch(/auth\.uid\(\)/);
  });

  it("calendar aggregates live sessions and assignment dues", () => {
    const mine = stripSqlComments(fnBody(sql, "get_my_learning_calendar"));
    expect(mine).toMatch(/live_session/);
    expect(mine).toMatch(/assignment_due/);
    expect(mine).toMatch(/learning_assignment_specs/);
    expect(mine).toMatch(/assessment_due_supported/);
    // Foundation V1 shipped false; Assessment Due Dates V1 (20260905) flips true.
    expect(mine).toMatch(/false/);

    const instr = stripSqlComments(
      fnBody(sql, "get_instructor_learning_calendar")
    );
    expect(instr).toMatch(/learning_live_assert_manage/);
    expect(instr).toMatch(/assignment_due/);
  });

  it("exposes calendar kinds including assessment_due", () => {
    expect(LEARNING_CALENDAR_KINDS).toEqual([
      "live_session",
      "assignment_due",
      "assessment_due",
    ]);
  });

  it("does not introduce Zoom/Teams/recording/email/push", () => {
    expect(body).not.toMatch(/\bzoom\b|\bteams\b|\brecording\b|\bemail\b|\bpush\b/i);
  });
});

describe("Live Learning & Calendar Foundation V1 — adapter", () => {
  it("validates UUIDs and sanitizes errors", () => {
    expect(isLiveCalendarUuid("11111111-1111-4111-8111-111111111111")).toBe(
      true
    );
    expect(isLiveCalendarUuid("x")).toBe(false);
    expect(sanitizeLiveCalendarError("Authentication required")).toMatch(
      /not allowed/i
    );
  });

  it("adapter is RPC-only and does not use service role", () => {
    const src = read("lib/learning/liveCalendarFoundation.ts");
    expect(src).toMatch(/\.rpc\(/);
    expect(src).not.toMatch(/\.from\(/);
    expect(src).not.toMatch(/SERVICE_ROLE|service_role/);
    expect(src).toMatch(/mintLiveMediaToken/);
    expect(src).toMatch(/isLiveKitConfigured/);
  });
});
