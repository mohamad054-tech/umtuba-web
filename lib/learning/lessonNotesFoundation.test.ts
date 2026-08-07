import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  LEARNING_LESSON_NOTES_RPCS,
  LEARNING_LESSON_NOTE_BODY_MAX,
  clampLearningNotesHubLimit,
  createMyLessonNote,
  deleteMyLessonNote,
  listMyLearningNotesHub,
  listMyLessonNotes,
  sanitizeLessonNotesError,
  updateMyLessonNote,
  validateLessonNoteBody,
  validateLessonPositionSeconds,
} from "./lessonNotesFoundation";
import { LEARNING_LEARNER_ROUTES } from "./learnerDelivery";

const ROOT = join(__dirname, "../..");
const MIGRATION =
  "supabase/migrations/20260901_learning_lesson_notes_foundation_v1.sql";
const HUB_MIGRATION =
  "supabase/migrations/20260908_learning_personal_notes_hub_v1.sql";
const PANEL = "app/components/learning/LessonNotesPanel.tsx";
const VIEWER = "app/components/learning/LessonViewer.tsx";
const ACTIONS = "app/learning/lessonNotesActions.ts";
const ADAPTER = "lib/learning/lessonNotesFoundation.ts";
const NOTES_PAGE = "app/learning/notes/page.tsx";
const LEARNING_HUB_PAGE = "app/learning/page.tsx";

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

  it("resolves lesson course access via section→course join (not learning_lessons.course_id)", () => {
    expect(body).not.toMatch(/learning_lessons\.course_id/);
    expect(body).not.toMatch(/l\.course_id/);
    expect(body).toMatch(
      /from public\.learning_lessons l\s+join public\.learning_sections s on s\.id = l\.section_id/
    );
    expect(body).toMatch(
      /has_learning_course_access\(s\.course_id, \(select auth\.uid\(\)\)\)/
    );

    const assertAccess = fnBody(sql, "learning_lesson_notes_assert_lesson_access");
    expect(assertAccess).toMatch(
      /join public\.learning_sections s on s\.id = l\.section_id/
    );
    expect(assertAccess).toMatch(/select s\.course_id/);
    expect(assertAccess).toMatch(/has_learning_course_access\(v_course_id, p_user_id\)/);
    expect(assertAccess).not.toMatch(/l\.course_id/);
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
      "list_my_learning_notes_hub",
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
    expect(actions).toMatch(/listMyLearningNotesHub/);
    expect(actions).not.toMatch(/user_id|userId:/);
    expect(actions).not.toMatch(/service_role|SERVICE_ROLE/);
    expect(actions).not.toMatch(/localStorage/);
  });
});

describe("Personal Notes Hub V1 — migration + privacy", () => {
  const hubSql = read(HUB_MIGRATION);
  const hubBody = stripSqlComments(hubSql);
  const foundationSql = read(MIGRATION);

  it("ships unique 20260908 hub migration with supporting index", () => {
    expect(existsSync(join(ROOT, HUB_MIGRATION))).toBe(true);
    const migrations = readdirSync(join(ROOT, "supabase/migrations"));
    expect(migrations).toContain(
      "20260908_learning_personal_notes_hub_v1.sql"
    );
    expect(migrations.filter((f) => f.startsWith("20260907_"))).toEqual([]);
    const sameVersion = migrations.filter((f) => f.startsWith("20260908_"));
    expect(sameVersion).toEqual([
      "20260908_learning_personal_notes_hub_v1.sql",
    ]);
    expect(hubBody).toMatch(/learning_lesson_notes_user_updated_idx/);
    expect(hubBody).toMatch(
      /on public\.learning_lesson_notes \(user_id, updated_at desc\)/
    );
  });

  it("defines list_my_learning_notes_hub with auth, ownership, access, limit, has_more", () => {
    const hub = fnBody(hubSql, "list_my_learning_notes_hub");
    expect(hub).toMatch(/v_uid uuid := auth\.uid\(\)/);
    expect(hub).toMatch(/raise exception 'Authentication required'/);
    expect(hub).toMatch(/n\.user_id = v_uid/);
    expect(hub).toMatch(/has_learning_course_access\(c\.id, v_uid\)/);
    expect(hub).toMatch(/p_course_id is null or c\.id = p_course_id/);
    expect(hub).toMatch(/least\(greatest\(coalesce\(p_limit, 50\), 1\), 100\)/);
    expect(hub).toMatch(/v_fetch := v_limit \+ 1/);
    expect(hub).toMatch(/v_has_more := v_count > v_limit/);
    expect(hub).toMatch(/order by n\.updated_at desc, n\.id desc/);
    expect(hub).toMatch(/'course_name'/);
    expect(hub).toMatch(/'lesson_name'/);
    expect(hub).toMatch(/'has_more'/);
    expect(hub).not.toMatch(/p_user_id/);
    expect(hub).not.toMatch(/ilike|to_tsvector|plainto_tsquery/i);
    expect(hub).not.toMatch(/offset /i);
    expect(hub).not.toMatch(/is_platform_admin/);
    expect(hub).not.toMatch(/can_manage_learning_course/);
    expect(hub).toMatch(
      /join public\.learning_lessons l on l\.id = n\.lesson_id/
    );
    expect(hub).toMatch(
      /join public\.learning_sections s on s\.id = l\.section_id/
    );
    expect(hub).toMatch(
      /join public\.learning_courses c on c\.id = s\.course_id/
    );
    expect(hub).not.toMatch(/learning_lessons\.course_id|l\.course_id/);
  });

  it("revokes anon/public and does not weaken foundation RLS policies", () => {
    expect(hubBody).toMatch(
      /revoke all on function public\.list_my_learning_notes_hub\(uuid, integer\)\s+from public, anon/
    );
    expect(hubBody).toMatch(
      /grant execute on function public\.list_my_learning_notes_hub\(uuid, integer\)\s+to authenticated, service_role/
    );
    expect(hubBody).toMatch(/set search_path = public/);
    expect(hubBody).not.toMatch(/create policy/i);
    expect(hubBody).not.toMatch(/alter table public\.learning_lesson_notes/);
    expect(foundationSql).toMatch(
      /create policy "Learners read own lesson notes"/
    );
    expect(foundationSql).not.toMatch(
      /create policy "[^"]*(instructor|staff|admin)[^"]*"/i
    );
  });

  it("does not alter existing CRUD RPC definitions", () => {
    expect(hubBody).not.toMatch(/create or replace function public\.list_my_learning_lesson_notes/);
    expect(hubBody).not.toMatch(/create or replace function public\.create_my_learning_lesson_note/);
    expect(hubBody).not.toMatch(/create or replace function public\.update_my_learning_lesson_note/);
    expect(hubBody).not.toMatch(/create or replace function public\.delete_my_learning_lesson_note/);
  });
});

describe("Personal Notes Hub V1 — adapter", () => {
  const COURSE_ID = "55555555-5555-4555-8555-555555555555";

  it("listMyLearningNotesHub maps metadata, course filter, and has_more", async () => {
    const calls: RpcCall[] = [];
    const client = fakeClient((call) => {
      calls.push(call);
      return {
        data: {
          notes: [
            {
              id: NOTE_ID,
              lesson_id: LESSON_ID,
              course_id: COURSE_ID,
              course_name: "Course A",
              lesson_name: "Lesson 1",
              body: "hub note",
              lesson_position_seconds: 30,
              created_at: "2026-01-01T00:00:00Z",
              updated_at: "2026-01-03T00:00:00Z",
            },
          ],
          limit: 50,
          has_more: true,
        },
        error: null,
      };
    });
    const result = await listMyLearningNotesHub(client, {
      courseId: COURSE_ID,
      limit: 50,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.has_more).toBe(true);
      expect(result.data.limit).toBe(50);
      expect(result.data.notes[0]?.course_name).toBe("Course A");
      expect(result.data.notes[0]?.lesson_name).toBe("Lesson 1");
      expect(result.data.notes[0]?.body).toBe("hub note");
    }
    expect(calls[0]?.name).toBe(LEARNING_LESSON_NOTES_RPCS.listHub);
    expect(calls[0]?.args).toEqual({
      p_course_id: COURSE_ID,
      p_limit: 50,
    });
  });

  it("clamps hub limit and rejects invalid course UUID without RPC", async () => {
    expect(clampLearningNotesHubLimit(0)).toBe(1);
    expect(clampLearningNotesHubLimit(999)).toBe(100);
    expect(clampLearningNotesHubLimit(null)).toBe(50);

    let called = false;
    const bad = await listMyLearningNotesHub(
      fakeClient(() => {
        called = true;
        return { data: null, error: null };
      }),
      { courseId: "bad" }
    );
    expect(bad.ok).toBe(false);
    expect(called).toBe(false);
  });

  it("rejects malformed hub payloads", async () => {
    const result = await listMyLearningNotesHub(
      fakeClient(() => ({
        data: {
          notes: [
            {
              id: NOTE_ID,
              lesson_id: LESSON_ID,
              body: "missing course fields",
              created_at: "2026-01-01T00:00:00Z",
              updated_at: "2026-01-01T00:00:00Z",
            },
          ],
          limit: 50,
          has_more: false,
        },
        error: null,
      }))
    );
    expect(result.ok).toBe(false);
  });
});

describe("Personal Notes Hub V1 — UI contracts", () => {
  const page = read(NOTES_PAGE);
  const hubPage = read(LEARNING_HUB_PAGE);

  it("notes hub page lists context, empty state, and lesson deep links", () => {
    expect(existsSync(join(ROOT, NOTES_PAGE))).toBe(true);
    expect(page).toMatch(/listMyLearningNotesHub/);
    expect(page).toMatch(/LEARNING_LEARNER_ROUTES\.notes/);
    expect(page).toMatch(/LEARNING_LEARNER_ROUTES\.lesson/);
    expect(page).toMatch(/data-testid="learning-notes-hub"/);
    expect(page).toMatch(/data-testid="learning-notes-hub-empty"/);
    expect(page).toMatch(/data-testid="learning-notes-hub-item"/);
    expect(page).toMatch(/data-testid="learning-notes-hub-open-lesson"/);
    expect(page).toMatch(/course_name/);
    expect(page).toMatch(/lesson_name/);
    expect(page).not.toMatch(/createLessonNoteAction|updateLessonNoteAction|deleteLessonNoteAction/);
    expect(page).not.toMatch(/instructor|share|collaborat|summariz/i);
    expect(page).not.toMatch(/service_role|SERVICE_ROLE/);
    expect(page).not.toMatch(/dangerouslySetInnerHTML/);
  });

  it("Learning hub links to /learning/notes and no instructor notes route exists", () => {
    expect(hubPage).toMatch(/LEARNING_LEARNER_ROUTES\.notes/);
    expect(hubPage).toMatch(/data-testid="learning-hub-notes-link"/);
    expect(LEARNING_LEARNER_ROUTES.notes).toBe("/learning/notes");
    expect(existsSync(join(ROOT, "app/learning/instructor/notes"))).toBe(false);
    expect(
      existsSync(join(ROOT, "app/learning/instructor/notes/page.tsx"))
    ).toBe(false);
  });
});
