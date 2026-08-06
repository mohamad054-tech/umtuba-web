import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  LEARNING_LESSON_NOTES_RPCS,
  LEARNING_LESSON_NOTE_BODY_MAX,
  createMyLessonNote,
  deleteMyLessonNote,
  listMyLessonNotes,
  sanitizeLessonNotesError,
  updateMyLessonNote,
  validateLessonNoteBody,
  validateLessonPositionSeconds,
} from "./lessonNotesFoundation";

const ROOT = join(__dirname, "../..");
const MIGRATION =
  "supabase/migrations/20260901_learning_lesson_notes_foundation_v1.sql";
const PANEL = "app/components/learning/LessonNotesPanel.tsx";
const VIEWER = "app/components/learning/LessonViewer.tsx";
const ACTIONS = "app/learning/lessonNotesActions.ts";
const ADAPTER = "lib/learning/lessonNotesFoundation.ts";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
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

const LESSON_ID = "33333333-3333-4333-8333-333333333333";
const NOTE_ID = "44444444-4444-4444-8444-444444444444";

type RpcCall = { name: string; args?: Record<string, unknown> };

function fakeClient(handler: (call: RpcCall) => { data: unknown; error: { message: string } | null }) {
  return {
    rpc: async (name: string, args?: Record<string, unknown>) =>
      handler({ name, args }),
  } as never;
}

describe("Lesson Notes Foundation — files", () => {
  it("ships migration, adapter, actions, and panel without version collision", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, ADAPTER))).toBe(true);
    expect(existsSync(join(ROOT, ACTIONS))).toBe(true);
    expect(existsSync(join(ROOT, PANEL))).toBe(true);

    const migrations = readdirSync(join(ROOT, "supabase/migrations"));
    expect(migrations).toContain(
      "20260901_learning_lesson_notes_foundation_v1.sql"
    );
    const sameVersion = migrations.filter((f) => f.startsWith("20260901_"));
    expect(sameVersion).toEqual([
      "20260901_learning_lesson_notes_foundation_v1.sql",
    ]);
  });
});

describe("Lesson Notes Foundation — SQL schema and RLS", () => {
  const sql = read(MIGRATION);
  const body = stripSqlComments(sql);

  it("creates learning_lesson_notes with required fields and checks", () => {
    expect(sql).toMatch(
      /create table if not exists public\.learning_lesson_notes/
    );
    expect(body).toMatch(/user_id uuid not null/);
    expect(body).toMatch(/lesson_id uuid not null/);
    expect(body).toMatch(/body text not null/);
    expect(body).toMatch(/lesson_position_seconds integer/);
    expect(body).toMatch(/created_at timestamptz not null/);
    expect(body).toMatch(/updated_at timestamptz not null/);
    expect(body).toMatch(
      /char_length\(btrim\(body\)\) between 1 and 20000/
    );
    expect(body).toMatch(
      /lesson_position_seconds is null\s+or lesson_position_seconds >= 0/
    );
    expect(body).toMatch(
      /learning_lesson_notes_user_lesson_updated_idx/
    );
    expect(body).toMatch(/set_row_updated_at/);
  });

  it("enables FORCE RLS with owner-only CRUD policies and no staff read", () => {
    expect(body).toMatch(
      /alter table public\.learning_lesson_notes enable row level security/
    );
    expect(body).toMatch(
      /alter table public\.learning_lesson_notes force row level security/
    );
    expect(body).toMatch(/for select[\s\S]*user_id = \(select auth\.uid\(\)\)/);
    expect(body).toMatch(/for insert[\s\S]*user_id = \(select auth\.uid\(\)\)/);
    expect(body).toMatch(/for update[\s\S]*user_id = \(select auth\.uid\(\)\)/);
    expect(body).toMatch(/for delete[\s\S]*user_id = \(select auth\.uid\(\)\)/);
    expect(body).toMatch(/has_learning_course_access/);
    expect(body).not.toMatch(/can_manage_learning_course/);
    expect(body).not.toMatch(/is_platform_admin/);
    expect(body).not.toMatch(/for select\s+to anon/);
    expect(body).not.toMatch(/for select[\s\S]{0,80}to public/);
    expect(body).not.toMatch(
      /create policy "[^"]*(instructor|staff|admin)[^"]*"/i
    );
  });

  it("exposes list/create/update/delete RPCs that bind identity to auth.uid()", () => {
    for (const name of [
      "list_my_learning_lesson_notes",
      "create_my_learning_lesson_note",
      "update_my_learning_lesson_note",
      "delete_my_learning_lesson_note",
      "learning_lesson_notes_assert_lesson_access",
    ]) {
      expect(body).toMatch(
        new RegExp(`create or replace function public\\.${name}`)
      );
    }

    const create = fnBody(sql, "create_my_learning_lesson_note");
    expect(create).toMatch(/v_uid uuid := auth\.uid\(\)/);
    expect(create).toMatch(/learning_lesson_notes_assert_lesson_access/);
    expect(create).not.toMatch(/p_user_id/);
    expect(create).toMatch(/body must be 1\.\.20000 chars/);
    expect(create).toMatch(/lesson_position_seconds must be nonnegative/);
    expect(create).toMatch(/learning_lesson_content_block_assert_safe_text/);

    const update = fnBody(sql, "update_my_learning_lesson_note");
    expect(update).toMatch(/v_row\.user_id is distinct from v_uid/);
    expect(update).toMatch(/raise exception 'Note not found'/);
    expect(update).toMatch(/learning_lesson_notes_assert_lesson_access/);

    const del = fnBody(sql, "delete_my_learning_lesson_note");
    expect(del).toMatch(/v_row\.user_id is distinct from v_uid/);
    expect(del).toMatch(/raise exception 'Note not found'/);

    const list = fnBody(sql, "list_my_learning_lesson_notes");
    expect(list).toMatch(/order by n\.updated_at desc, n\.id desc/);
    expect(list).toMatch(/n\.user_id = v_uid/);
  });
});

describe("Lesson Notes Foundation — validators", () => {
  it("rejects empty and oversized bodies", () => {
    expect(validateLessonNoteBody("").ok).toBe(false);
    expect(validateLessonNoteBody("   ").ok).toBe(false);
    expect(validateLessonNoteBody("ok").ok).toBe(true);
    expect(
      validateLessonNoteBody("x".repeat(LEARNING_LESSON_NOTE_BODY_MAX + 1)).ok
    ).toBe(false);
    expect(
      validateLessonNoteBody("x".repeat(LEARNING_LESSON_NOTE_BODY_MAX)).ok
    ).toBe(true);
  });

  it("rejects negative or non-integer positions", () => {
    expect(validateLessonPositionSeconds(null)).toEqual({
      ok: true,
      data: null,
    });
    expect(validateLessonPositionSeconds(0)).toEqual({ ok: true, data: 0 });
    expect(validateLessonPositionSeconds(-1).ok).toBe(false);
    expect(validateLessonPositionSeconds(1.5).ok).toBe(false);
  });

  it("sanitizes entitlement and ownership errors", () => {
    expect(sanitizeLessonNotesError("Not entitled to this lesson")).toMatch(
      /not allowed/i
    );
    expect(sanitizeLessonNotesError("Note not found")).toMatch(/not found/i);
    expect(sanitizeLessonNotesError("body must be 1..20000 chars")).toMatch(
      /1 and 20000/
    );
    expect(
      sanitizeLessonNotesError("lesson_position_seconds must be nonnegative")
    ).toMatch(/seconds/i);
  });
});

describe("Lesson Notes Foundation — adapter RPC surface", () => {
  it("adapter only calls RPC surface (no table writes)", () => {
    const src = read(ADAPTER);
    expect(src).toMatch(/\.rpc\(/);
    expect(src).not.toMatch(/\.from\(/);
    expect(src).not.toMatch(/service_role|SERVICE_ROLE/);
    expect(src).not.toMatch(/localStorage/);
    expect(Object.values(LEARNING_LESSON_NOTES_RPCS)).toEqual([
      "list_my_learning_lesson_notes",
      "create_my_learning_lesson_note",
      "update_my_learning_lesson_note",
      "delete_my_learning_lesson_note",
    ]);
  });

  it("listMyLessonNotes calls list RPC and parses notes", async () => {
    const calls: RpcCall[] = [];
    const client = fakeClient((call) => {
      calls.push(call);
      return {
        data: {
          lesson_id: LESSON_ID,
          notes: [
            {
              id: NOTE_ID,
              lesson_id: LESSON_ID,
              body: "hello",
              lesson_position_seconds: 12,
              created_at: "2026-01-01T00:00:00Z",
              updated_at: "2026-01-02T00:00:00Z",
            },
          ],
        },
        error: null,
      };
    });
    const result = await listMyLessonNotes(client, LESSON_ID);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.body).toBe("hello");
    }
    expect(calls[0]?.name).toBe(LEARNING_LESSON_NOTES_RPCS.list);
    expect(calls[0]?.args).toEqual({ p_lesson_id: LESSON_ID });
  });

  it("createMyLessonNote validates body/position before RPC", async () => {
    const empty = await createMyLessonNote(fakeClient(() => ({ data: null, error: null })), {
      lessonId: LESSON_ID,
      body: "  ",
    });
    expect(empty.ok).toBe(false);

    const neg = await createMyLessonNote(fakeClient(() => ({ data: null, error: null })), {
      lessonId: LESSON_ID,
      body: "note",
      lessonPositionSeconds: -3,
    });
    expect(neg.ok).toBe(false);

    const calls: RpcCall[] = [];
    const ok = await createMyLessonNote(
      fakeClient((call) => {
        calls.push(call);
        return {
          data: {
            note: {
              id: NOTE_ID,
              lesson_id: LESSON_ID,
              body: "note",
              lesson_position_seconds: null,
              created_at: "2026-01-01T00:00:00Z",
              updated_at: "2026-01-01T00:00:00Z",
            },
          },
          error: null,
        };
      }),
      { lessonId: LESSON_ID, body: "  note  " }
    );
    expect(ok.ok).toBe(true);
    expect(calls[0]?.args?.p_body).toBe("note");
  });

  it("update/delete fail closed on ownership/not-found RPC errors", async () => {
    const updated = await updateMyLessonNote(
      fakeClient(() => ({
        data: null,
        error: { message: "Note not found" },
      })),
      { noteId: NOTE_ID, body: "x" }
    );
    expect(updated.ok).toBe(false);
    if (!updated.ok) expect(updated.message).toMatch(/not found/i);

    const deleted = await deleteMyLessonNote(
      fakeClient(() => ({
        data: null,
        error: { message: "Note not found" },
      })),
      NOTE_ID
    );
    expect(deleted.ok).toBe(false);
    if (!deleted.ok) expect(deleted.message).toMatch(/not found/i);
  });

  it("rejects inaccessible lesson errors without leaking internals", async () => {
    const result = await listMyLessonNotes(
      fakeClient(() => ({
        data: null,
        error: {
          message:
            "Not entitled to this lesson detail=course_id=abc internal stack",
        },
      })),
      LESSON_ID
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/not allowed/i);
      expect(result.message).not.toMatch(/stack|course_id=abc/i);
    }
  });

  it("rejects invalid UUID inputs without calling RPC", async () => {
    let called = false;
    const client = fakeClient(() => {
      called = true;
      return { data: null, error: null };
    });
    const result = await listMyLessonNotes(client, "not-a-uuid");
    expect(result.ok).toBe(false);
    expect(called).toBe(false);
  });
});

describe("Lesson Notes Foundation — UI contracts", () => {
  const panel = read(PANEL);
  const viewer = read(VIEWER);
  const actions = read(ACTIONS);

  it("LessonViewer mounts notes panel only inside canRender path", () => {
    expect(viewer).toMatch(/import LessonNotesPanel from "\.\/LessonNotesPanel"/);
    expect(viewer).toMatch(/<LessonNotesPanel lessonId=\{delivery\.lesson\.id\} \/>/);
    expect(viewer).toMatch(/canRender \? \([\s\S]*LessonNotesPanel/);
    expect(viewer).not.toMatch(/dangerouslySetInnerHTML/);
  });

  it("panel exposes list/create/edit/delete/empty/status testids and labels", () => {
    expect(panel).toMatch(/data-testid="learning-lesson-notes"/);
    expect(panel).toMatch(/data-testid="learning-lesson-notes-list"/);
    expect(panel).toMatch(/data-testid="learning-lesson-notes-create"/);
    expect(panel).toMatch(/data-testid="learning-lesson-notes-empty"/);
    expect(panel).toMatch(/data-testid="learning-lesson-notes-error"/);
    expect(panel).toMatch(/data-testid="learning-lesson-notes-status"/);
    expect(panel).toMatch(/aria-label="Personal lesson notes"/);
    expect(panel).toMatch(/aria-label="New note text"/);
    expect(panel).toMatch(/aria-label="Edit note text"/);
    expect(panel).toMatch(/Confirm delete/);
    expect(panel).not.toMatch(/dangerouslySetInnerHTML/);
    expect(panel).not.toMatch(/innerHTML/);
    expect(panel).toMatch(/whitespace-pre-wrap/);
    expect(panel).not.toMatch(/localStorage/);
    expect(panel).not.toMatch(/instructor|share|collaborat|summariz/i);
  });

  it("server actions require authenticated session and never accept user_id", () => {
    expect(actions).toMatch(/getServerUser/);
    expect(actions).toMatch(/createMyLessonNote/);
    expect(actions).toMatch(/updateMyLessonNote/);
    expect(actions).toMatch(/deleteMyLessonNote/);
    expect(actions).toMatch(/listMyLessonNotes/);
    expect(actions).not.toMatch(/user_id|userId:/);
    expect(actions).not.toMatch(/service_role|SERVICE_ROLE/);
    expect(actions).not.toMatch(/localStorage/);
  });
});
