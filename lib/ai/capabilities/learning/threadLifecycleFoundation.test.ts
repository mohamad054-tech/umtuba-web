/**
 * Learning AI Tutor — Thread Lifecycle Foundation V1
 * Static SQL + foundation/bridge unit coverage (no live DB).
 */

import { describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  LEARNING_AI_TUTOR_LIFECYCLE_STATUSES,
  LEARNING_AI_TUTOR_RPCS,
  archiveMyAiTutorThread,
  createMyAiTutorThread,
  ensureMyAiTutorActiveThread,
  resumeMyAiTutorThread,
} from "../../../learning/aiTutorFoundation";
import {
  ensureLearningTutorActiveThread,
  serializeJsonObjectWithinLimit,
} from "./threadPersistenceBridge";

const ROOT = join(__dirname, "../../../..");
const OVERSIZE_BRIDGE =
  "lib/ai/capabilities/learning/threadPersistenceBridge.ts";
const BINDING_MIGRATION =
  "supabase/migrations/20260874_learning_ai_tutor_thread_lesson_binding_v1.sql";
const RESUME_MIGRATION =
  "supabase/migrations/20260875_learning_ai_tutor_thread_resume_history_read_v1.sql";
const LIFECYCLE_MIGRATION =
  "supabase/migrations/20260876_learning_ai_tutor_thread_lifecycle_foundation_v1.sql";

const COURSE = "22222222-2222-4222-8222-222222222222";
const COURSE_B = "22222222-2222-4222-8222-222222222223";
const LESSON = "33333333-3333-4333-8333-333333333333";
const LESSON_B = "33333333-3333-4333-8333-333333333334";
const THREAD = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const THREAD_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

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

function activeThreadPayload(overrides: Record<string, unknown> = {}) {
  return {
    thread_id: THREAD,
    course_id: COURSE,
    lesson_id: LESSON,
    title: "AI Tutor",
    lifecycle_status: "active",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    created: true,
    ...overrides,
  };
}

describe("Thread Lifecycle Foundation — migration SQL", () => {
  const sql = read(LIFECYCLE_MIGRATION);
  const body = stripSqlComments(sql);
  const ensure = stripSqlComments(
    fnBody(sql, "ensure_my_learning_ai_tutor_active_thread")
  );
  const archive = stripSqlComments(
    fnBody(sql, "archive_my_learning_ai_tutor_thread")
  );
  const create = stripSqlComments(
    fnBody(sql, "create_my_learning_ai_tutor_thread")
  );

  it("ships after resume/history and is listed in migrations", () => {
    expect(existsSync(join(ROOT, BINDING_MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, RESUME_MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, LIFECYCLE_MIGRATION))).toBe(true);
    expect(readdirSync(join(ROOT, "supabase/migrations"))).toContain(
      "20260876_learning_ai_tutor_thread_lifecycle_foundation_v1.sql"
    );
  });

  it("adds lifecycle_status active|archived with backfill", () => {
    expect(body).toMatch(/add column if not exists lifecycle_status text/i);
    expect(body).toMatch(/lifecycle_status = 'active'/);
    expect(body).toMatch(
      /check \(lifecycle_status in \('active', 'archived'\)\)/
    );
    expect([...LEARNING_AI_TUTOR_LIFECYCLE_STATUSES]).toEqual([
      "active",
      "archived",
    ]);
  });

  it("prevents duplicate active threads per learner+course+lesson", () => {
    expect(body).toMatch(
      /learning_ai_tutor_threads_one_active_per_lesson_idx/
    );
    expect(body).toMatch(
      /unique index[\s\S]*\(user_id, course_id, lesson_id\)[\s\S]*lifecycle_status = 'active'[\s\S]*lesson_id is not null/i
    );
  });

  it("ensure is get-or-create with auth, entitlement, lesson∈course", () => {
    expect(ensure).toMatch(/security definer/i);
    expect(ensure).toMatch(/set search_path\s*=\s*public/i);
    expect(ensure).toMatch(/auth\.uid\(\)/);
    expect(ensure).toMatch(/Authentication required/);
    expect(ensure).toMatch(/has_learning_course_access/);
    expect(ensure).toMatch(/Not entitled to this course/);
    expect(ensure).toMatch(/lesson_id is not in this course/);
    expect(ensure).toMatch(/lifecycle_status = 'active'/);
    expect(ensure).toMatch(/'created'/);
  });

  it("handles concurrent create via unique_violation retry", () => {
    expect(ensure).toMatch(/when unique_violation/i);
    expect(ensure).toMatch(/v_created := false/);
  });

  it("never reuses archived threads in ensure select", () => {
    expect(ensure).toMatch(/lifecycle_status = 'active'/);
    expect(ensure).not.toMatch(/lifecycle_status = 'archived'/);
  });

  it("scopes ensure to same user_id + course_id + lesson_id", () => {
    expect(ensure).toMatch(/user_id = v_uid/);
    expect(ensure).toMatch(/course_id = p_course_id/);
    expect(ensure).toMatch(/lesson_id = p_lesson_id/);
  });

  it("archive is owner + entitlement, idempotent, non-destructive", () => {
    expect(archive).toMatch(/user_id is distinct from v_uid/);
    expect(archive).toMatch(/has_learning_course_access/);
    expect(archive).toMatch(/lifecycle_status = 'archived'/);
    expect(archive).toMatch(/'archived', false/);
    expect(archive).not.toMatch(/delete from/i);
  });

  it("create with lesson delegates to ensure; null lesson inserts active", () => {
    expect(create).toMatch(/ensure_my_learning_ai_tutor_active_thread/);
    expect(create).toMatch(/p_lesson_id is not null/);
    expect(create).toMatch(/lesson_id, user_id, title, lifecycle_status/);
    expect(create).toMatch(/values \(p_course_id, null, v_uid/);
  });

  it("revokes public/anon on ensure + archive", () => {
    expect(body).toMatch(
      /revoke all on function public\.ensure_my_learning_ai_tutor_active_thread\(uuid, uuid, text\)\s+from public, anon/i
    );
    expect(body).toMatch(
      /revoke all on function public\.archive_my_learning_ai_tutor_thread\(uuid\)\s+from public, anon/i
    );
  });

  it("surfaces lifecycle_status on get + resume without dropping bounds", () => {
    const get = stripSqlComments(
      fnBody(sql, "get_my_learning_ai_tutor_thread")
    );
    const resume = stripSqlComments(
      fnBody(sql, "resume_my_learning_ai_tutor_thread")
    );
    expect(get).toMatch(/'lifecycle_status'/);
    expect(resume).toMatch(/'lifecycle_status'/);
    expect(resume).toMatch(/Thread lesson mismatch/);
    expect(resume).toMatch(/limit v_limit/i);
    expect(resume).toMatch(/order by m\.created_at asc, m\.id asc/i);
  });

  it("does not truncate or delete thread/message rows", () => {
    expect(body).not.toMatch(/truncate/i);
    expect(body).not.toMatch(/delete from/i);
  });
});

describe("Thread Lifecycle Foundation — foundation + bridge behavior", () => {
  it("exposes ensure/archive RPC constants", () => {
    expect(LEARNING_AI_TUTOR_RPCS.ensureActiveThread).toBe(
      "ensure_my_learning_ai_tutor_active_thread"
    );
    expect(LEARNING_AI_TUTOR_RPCS.archiveThread).toBe(
      "archive_my_learning_ai_tutor_thread"
    );
  });

  it("creates first active thread", async () => {
    const rpc = vi.fn(async () => ({
      data: activeThreadPayload({ created: true }),
      error: null,
    }));
    const ok = await ensureMyAiTutorActiveThread({ rpc } as never, {
      courseId: COURSE,
      lessonId: LESSON,
    });
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.data.thread_id).toBe(THREAD);
    expect(ok.data.lifecycle_status).toBe("active");
    expect(ok.data.created).toBe(true);
    expect(rpc).toHaveBeenCalledWith(
      "ensure_my_learning_ai_tutor_active_thread",
      expect.objectContaining({
        p_course_id: COURSE,
        p_lesson_id: LESSON,
      })
    );
  });

  it("reuses existing active thread", async () => {
    const rpc = vi.fn(async () => ({
      data: activeThreadPayload({ created: false }),
      error: null,
    }));
    const ok = await ensureMyAiTutorActiveThread({ rpc } as never, {
      courseId: COURSE,
      lessonId: LESSON,
    });
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.data.created).toBe(false);
    expect(ok.data.thread_id).toBe(THREAD);
  });

  it("different lesson creates a new thread (distinct lesson_id arg)", async () => {
    const rpc = vi.fn(async (_n: string, args: Record<string, unknown>) => ({
      data: activeThreadPayload({
        thread_id:
          String(args.p_lesson_id) === LESSON ? THREAD : THREAD_B,
        lesson_id: args.p_lesson_id,
        created: true,
      }),
      error: null,
    }));
    const a = await ensureMyAiTutorActiveThread({ rpc } as never, {
      courseId: COURSE,
      lessonId: LESSON,
    });
    const b = await ensureMyAiTutorActiveThread({ rpc } as never, {
      courseId: COURSE,
      lessonId: LESSON_B,
    });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.data.lesson_id).toBe(LESSON);
    expect(b.data.lesson_id).toBe(LESSON_B);
    expect(a.data.thread_id).not.toBe(b.data.thread_id);
    expect(rpc).toHaveBeenNthCalledWith(
      1,
      "ensure_my_learning_ai_tutor_active_thread",
      expect.objectContaining({ p_lesson_id: LESSON })
    );
    expect(rpc).toHaveBeenNthCalledWith(
      2,
      "ensure_my_learning_ai_tutor_active_thread",
      expect.objectContaining({ p_lesson_id: LESSON_B })
    );
  });

  it("different course creates a new thread (distinct course_id arg)", async () => {
    const rpc = vi.fn(async (_n: string, args: Record<string, unknown>) => ({
      data: activeThreadPayload({
        thread_id: String(args.p_course_id) === COURSE ? THREAD : THREAD_B,
        course_id: args.p_course_id,
        created: true,
      }),
      error: null,
    }));
    const a = await ensureMyAiTutorActiveThread({ rpc } as never, {
      courseId: COURSE,
      lessonId: LESSON,
    });
    const b = await ensureMyAiTutorActiveThread({ rpc } as never, {
      courseId: COURSE_B,
      lessonId: LESSON,
    });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.data.course_id).toBe(COURSE);
    expect(b.data.course_id).toBe(COURSE_B);
    expect(a.data.thread_id).not.toBe(b.data.thread_id);
  });

  it("different learner isolation is enforced in SQL (auth.uid + user_id)", () => {
    const ensure = stripSqlComments(
      fnBody(read(LIFECYCLE_MIGRATION), "ensure_my_learning_ai_tutor_active_thread")
    );
    expect(ensure).toMatch(/v_uid uuid := auth\.uid\(\)/);
    expect(ensure).toMatch(/user_id = v_uid/);
    expect(ensure).toMatch(/values \(p_course_id, p_lesson_id, v_uid/);
  });

  it("archived thread creates replacement (ensure after archive)", async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === "archive_my_learning_ai_tutor_thread") {
        return {
          data: activeThreadPayload({
            lifecycle_status: "archived",
            archived: true,
          }),
          error: null,
        };
      }
      return {
        data: activeThreadPayload({
          thread_id: THREAD_B,
          created: true,
        }),
        error: null,
      };
    });
    const archived = await archiveMyAiTutorThread({ rpc } as never, THREAD);
    expect(archived.ok).toBe(true);
    if (!archived.ok) return;
    expect(archived.data.lifecycle_status).toBe("archived");

    const next = await ensureMyAiTutorActiveThread({ rpc } as never, {
      courseId: COURSE,
      lessonId: LESSON,
    });
    expect(next.ok).toBe(true);
    if (!next.ok) return;
    expect(next.data.thread_id).toBe(THREAD_B);
    expect(next.data.created).toBe(true);
    expect(next.data.lifecycle_status).toBe("active");
  });

  it("createMyAiTutorThread with lesson uses ensure (duplicate-active prevention path)", async () => {
    const rpc = vi.fn(async () => ({
      data: activeThreadPayload({ created: false }),
      error: null,
    }));
    const ok = await createMyAiTutorThread({ rpc } as never, {
      courseId: COURSE,
      lessonId: LESSON,
    });
    expect(ok.ok).toBe(true);
    expect(rpc).toHaveBeenCalledWith(
      "ensure_my_learning_ai_tutor_active_thread",
      expect.objectContaining({
        p_course_id: COURSE,
        p_lesson_id: LESSON,
      })
    );
  });

  it("concurrent creation safety is encoded as unique_violation retry in SQL", () => {
    const ensure = stripSqlComments(
      fnBody(read(LIFECYCLE_MIGRATION), "ensure_my_learning_ai_tutor_active_thread")
    );
    expect(ensure).toMatch(/begin[\s\S]*insert into[\s\S]*exception[\s\S]*unique_violation/i);
  });

  it("authorization failures are fail-closed", async () => {
    const rpc = vi.fn(async () => ({
      data: null,
      error: { message: "Not entitled to this course" },
    }));
    const denied = await ensureMyAiTutorActiveThread({ rpc } as never, {
      courseId: COURSE,
      lessonId: LESSON,
    });
    expect(denied.ok).toBe(false);
    if (denied.ok) return;
    expect(denied.message).toMatch(/not allowed/i);

    const bridge = await ensureLearningTutorActiveThread({ rpc } as never, {
      courseId: COURSE,
      lessonId: LESSON,
    });
    expect(bridge.ok).toBe(false);
    if (bridge.ok) return;
    expect(bridge.error.code).toBe("permission_denied");

    const badIds = await ensureLearningTutorActiveThread({} as never, {
      courseId: "bad",
      lessonId: LESSON,
    });
    expect(badIds.ok).toBe(false);
    if (badIds.ok) return;
    expect(badIds.error.code).toBe("invalid_input");
  });

  it("regression: resume still requires course+lesson and returns messages", async () => {
    const rpc = vi.fn(async (name: string) => {
      expect(name).toBe("resume_my_learning_ai_tutor_thread");
      return {
        data: {
          thread_id: THREAD,
          course_id: COURSE,
          lesson_id: LESSON,
          title: "Tutor",
          lifecycle_status: "active",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
          messages: [
            {
              id: "m1",
              role: "user",
              message_kind: "ask_question",
              content: "Q",
              created_at: "2026-01-01T00:00:01Z",
            },
          ],
          limit: 50,
          returned_count: 1,
        },
        error: null,
      };
    });
    const ok = await resumeMyAiTutorThread({ rpc } as never, {
      threadId: THREAD,
      courseId: COURSE,
      lessonId: LESSON,
    });
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.data.lifecycle_status).toBe("active");
    expect((ok.data.messages as unknown[]).length).toBe(1);
  });

  it("regression: structured oversize serialization still available", () => {
    expect(existsSync(join(ROOT, OVERSIZE_BRIDGE))).toBe(true);
    expect(typeof serializeJsonObjectWithinLimit).toBe("function");
    expect(serializeJsonObjectWithinLimit({ answer: "hello" }, 50)).toBe(
      '{"answer":"hello"}'
    );
    expect(
      serializeJsonObjectWithinLimit(
        { answer: "x", keyPoints: ["y".repeat(100)] },
        30
      )
    ).toBe('{"answer":"x"}');
  });
});
