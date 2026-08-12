import { describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  LEARNING_AI_TUTOR_RESUME_HISTORY_DEFAULT_LIMIT,
  LEARNING_AI_TUTOR_RESUME_HISTORY_MAX_LIMIT,
  LEARNING_AI_TUTOR_RPCS,
  resumeMyAiTutorThread,
} from "../../../learning/aiTutorFoundation";
import { resumeLearningTutorThread } from "./threadPersistenceBridge";

const ROOT = join(__dirname, "../../../..");
const BINDING_MIGRATION =
  "supabase/migrations/20260874_learning_ai_tutor_thread_lesson_binding_v1.sql";
const RESUME_MIGRATION =
  "supabase/migrations/20260896_learning_ai_tutor_thread_resume_history_read_v1.sql";

const THREAD = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const COURSE = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const LESSON = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const OTHER = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

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

describe("Thread Resume / History Read — migration SQL", () => {
  const sql = read(RESUME_MIGRATION);
  const body = stripSqlComments(sql);
  const resume = stripSqlComments(
    fnBody(sql, "resume_my_learning_ai_tutor_thread")
  );

  it("ships after lesson binding migration", () => {
    expect(existsSync(join(ROOT, BINDING_MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, RESUME_MIGRATION))).toBe(true);
    expect(readdirSync(join(ROOT, "supabase/migrations"))).toContain(
      "20260896_learning_ai_tutor_thread_resume_history_read_v1.sql"
    );
  });

  it("drops unbounded get_my_learning_ai_tutor_thread_messages(uuid)", () => {
    expect(body).toMatch(
      /drop function if exists public\.get_my_learning_ai_tutor_thread_messages\(uuid\)/i
    );
  });

  it("creates resume RPC with course + lesson + limit", () => {
    expect(resume).toMatch(
      /create or replace function public\.resume_my_learning_ai_tutor_thread\(\s*p_thread_id uuid,\s*p_course_id uuid,\s*p_lesson_id uuid,\s*p_limit integer default 50\s*\)/i
    );
  });

  it("is security definer with fixed search_path and auth ownership", () => {
    expect(resume).toMatch(/security definer/i);
    expect(resume).toMatch(/set search_path\s*=\s*public/i);
    expect(resume).toMatch(/auth\.uid\(\)/);
    expect(resume).toMatch(/user_id is distinct from v_uid/);
    expect(resume).toMatch(/Thread not found/);
  });

  it("enforces entitlement and exact course + lesson binding", () => {
    expect(resume).toMatch(/has_learning_course_access/);
    expect(resume).toMatch(/Not entitled to this course/);
    expect(resume).toMatch(/v_thread\.course_id is distinct from p_course_id/);
    expect(resume).toMatch(/Thread course mismatch/);
    expect(resume).toMatch(/v_thread\.lesson_id is distinct from p_lesson_id/);
    expect(resume).toMatch(/Thread lesson mismatch/);
    expect(resume).toMatch(/sec\.course_id = v_thread\.course_id/);
    expect(resume).toMatch(/Thread lesson is invalid/);
  });

  it("orders messages deterministically and bounds history", () => {
    expect(resume).toMatch(/order by m\.created_at asc, m\.id asc/i);
    expect(resume).toMatch(/limit v_limit/i);
    expect(resume).toMatch(/v_limit > 100/);
    expect(resume).toMatch(/coalesce\(p_limit, 50\)/);
  });

  it("returns lean thread fields and never leaks user_id in SQL projection", () => {
    expect(resume).toMatch(/'thread_id'/);
    expect(resume).toMatch(/'course_id'/);
    expect(resume).toMatch(/'lesson_id'/);
    expect(resume).toMatch(/'messages'/);
    expect(resume).not.toMatch(/'user_id'/);
    expect(resume).not.toMatch(/to_jsonb\(v_thread\)/);
  });

  it("revokes public/anon and grants authenticated", () => {
    expect(body).toMatch(
      /revoke all on function public\.resume_my_learning_ai_tutor_thread\(uuid, uuid, uuid, integer\)\s+from public, anon/i
    );
    expect(body).toMatch(
      /grant execute on function public\.resume_my_learning_ai_tutor_thread\(uuid, uuid, uuid, integer\)\s+to authenticated, service_role/i
    );
  });

  it("creates no tables and is non-destructive to data", () => {
    expect(body).not.toMatch(/create table/i);
    expect(body).not.toMatch(/alter table/i);
    expect(body).not.toMatch(/truncate/i);
    expect(body).not.toMatch(/delete from/i);
  });
});

describe("Thread Resume / History Read — foundation + bridge", () => {
  it("exposes resume RPC constants and limits", () => {
    expect(LEARNING_AI_TUTOR_RPCS.resumeThread).toBe(
      "resume_my_learning_ai_tutor_thread"
    );
    expect(LEARNING_AI_TUTOR_RESUME_HISTORY_DEFAULT_LIMIT).toBe(50);
    expect(LEARNING_AI_TUTOR_RESUME_HISTORY_MAX_LIMIT).toBe(100);
  });

  it("valid owner resume returns ordered messages and clamps limit", async () => {
    const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
      expect(name).toBe("resume_my_learning_ai_tutor_thread");
      expect(args.p_thread_id).toBe(THREAD);
      expect(args.p_course_id).toBe(COURSE);
      expect(args.p_lesson_id).toBe(LESSON);
      expect(args.p_limit).toBe(100);
      return {
        data: {
          thread_id: THREAD,
          course_id: COURSE,
          lesson_id: LESSON,
          title: "Tutor",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:01:00Z",
          messages: [
            {
              id: "m1",
              role: "user",
              message_kind: "ask_question",
              content: "Q1",
              created_at: "2026-01-01T00:00:01Z",
            },
            {
              id: "m2",
              role: "assistant",
              message_kind: "ask_question",
              content: "A1",
              created_at: "2026-01-01T00:00:02Z",
            },
          ],
          limit: 100,
          returned_count: 2,
        },
        error: null,
      };
    });

    const ok = await resumeMyAiTutorThread({ rpc } as never, {
      threadId: THREAD,
      courseId: COURSE,
      lessonId: LESSON,
      limit: 999,
    });
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(Array.isArray(ok.data.messages)).toBe(true);
    expect((ok.data.messages as unknown[]).length).toBe(2);
    expect(ok.data.user_id).toBeUndefined();
  });

  it("rejects missing/invalid UUIDs fail-closed", async () => {
    const bad = await resumeMyAiTutorThread({} as never, {
      threadId: "bad",
      courseId: COURSE,
      lessonId: LESSON,
    });
    expect(bad.ok).toBe(false);

    const bridgeBad = await resumeLearningTutorThread({} as never, {
      threadId: THREAD,
      courseId: "",
      lessonId: LESSON,
    });
    expect(bridgeBad.ok).toBe(false);
    if (bridgeBad.ok) return;
    expect(bridgeBad.error.code).toBe("invalid_input");
  });

  it("rejects mismatched lesson and course", async () => {
    const lessonMismatch = await resumeLearningTutorThread(
      {
        rpc: vi.fn(async () => ({
          data: null,
          error: { message: "Thread lesson mismatch" },
        })),
      } as never,
      { threadId: THREAD, courseId: COURSE, lessonId: OTHER }
    );
    expect(lessonMismatch.ok).toBe(false);
    if (lessonMismatch.ok) return;
    expect(lessonMismatch.error.code).toBe("invalid_input");
    expect(lessonMismatch.error.message).toMatch(/lesson or course/i);

    const courseMismatch = await resumeLearningTutorThread(
      {
        rpc: vi.fn(async () => ({
          data: null,
          error: { message: "Thread course mismatch" },
        })),
      } as never,
      { threadId: THREAD, courseId: OTHER, lessonId: LESSON }
    );
    expect(courseMismatch.ok).toBe(false);
    if (courseMismatch.ok) return;
    expect(courseMismatch.error.code).toBe("invalid_input");
  });

  it("rejects unauthorized entitlement and non-owned threads", async () => {
    const entitled = await resumeLearningTutorThread(
      {
        rpc: vi.fn(async () => ({
          data: null,
          error: { message: "Not entitled to this course" },
        })),
      } as never,
      { threadId: THREAD, courseId: COURSE, lessonId: LESSON }
    );
    expect(entitled.ok).toBe(false);
    if (entitled.ok) return;
    expect(entitled.error.code).toBe("permission_denied");

    const missing = await resumeLearningTutorThread(
      {
        rpc: vi.fn(async () => ({
          data: null,
          error: { message: "Thread not found" },
        })),
      } as never,
      { threadId: THREAD, courseId: COURSE, lessonId: LESSON }
    );
    expect(missing.ok).toBe(false);
    if (missing.ok) return;
    expect(missing.error.code).toBe("permission_denied");
  });

  it("rejects lesson outside thread course and leaked internal fields", async () => {
    const invalidLesson = await resumeLearningTutorThread(
      {
        rpc: vi.fn(async () => ({
          data: null,
          error: { message: "Thread lesson is invalid" },
        })),
      } as never,
      { threadId: THREAD, courseId: COURSE, lessonId: LESSON }
    );
    expect(invalidLesson.ok).toBe(false);
    if (invalidLesson.ok) return;
    expect(invalidLesson.error.code).toBe("permission_denied");

    const leaked = await resumeMyAiTutorThread(
      {
        rpc: vi.fn(async () => ({
          data: {
            thread_id: THREAD,
            course_id: COURSE,
            lesson_id: LESSON,
            messages: [],
            user_id: OTHER,
          },
          error: null,
        })),
      } as never,
      { threadId: THREAD, courseId: COURSE, lessonId: LESSON }
    );
    expect(leaked.ok).toBe(false);
  });
});
