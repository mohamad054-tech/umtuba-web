import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  LEARNING_LESSON_BOOKMARKS_RPCS,
  clampLearningBookmarksHubLimit,
  deleteMyLearningLessonBookmark,
  getMyLearningLessonBookmarkState,
  listMyLearningLessonBookmarks,
  sanitizeLessonBookmarksError,
  saveMyLearningLessonBookmark,
} from "./lessonBookmarksFoundation";
import { LEARNING_LEARNER_ROUTES } from "./learnerDelivery";

const ROOT = join(__dirname, "../..");
const MIGRATION =
  "supabase/migrations/20260914_learning_lesson_bookmarks_v1.sql";
const ADAPTER = "lib/learning/lessonBookmarksFoundation.ts";
const ACTIONS = "app/learning/lessonBookmarkActions.ts";
const CONTROL = "app/components/learning/LessonBookmarkControl.tsx";
const VIEWER = "app/components/learning/LessonViewer.tsx";
const SAVED_PAGE = "app/learning/saved/page.tsx";
const LEARNING_HUB_PAGE = "app/learning/page.tsx";
const LESSON_PAGE = "app/learning/lessons/[lessonId]/page.tsx";
const SOCIAL_SAVED = "app/saved/page.tsx";
const DOCS = "docs/learning/implementation/LEARNING_LESSON_BOOKMARKS_V1.md";

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
const COURSE_ID = "22222222-2222-4222-8222-222222222222";
const CREATED = "2026-08-07T12:00:00.000Z";

type RpcCall = { name: string; args?: Record<string, unknown> };

function fakeClient(
  handler: (call: RpcCall) => {
    data: unknown;
    error: { message: string } | null;
  }
) {
  return {
    rpc: async (name: string, args?: Record<string, unknown>) =>
      handler({ name, args }),
  } as never;
}

describe("Lesson Bookmarks Foundation — files", () => {
  it("ships migration, adapter, actions, control, hub, and unique 20260914", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, ADAPTER))).toBe(true);
    expect(existsSync(join(ROOT, ACTIONS))).toBe(true);
    expect(existsSync(join(ROOT, CONTROL))).toBe(true);
    expect(existsSync(join(ROOT, SAVED_PAGE))).toBe(true);
    expect(existsSync(join(ROOT, DOCS))).toBe(true);

    const migrations = readdirSync(join(ROOT, "supabase/migrations"));
    const sameVersion = migrations.filter((f) => f.startsWith("20260914_"));
    expect(sameVersion).toEqual([
      "20260914_learning_lesson_bookmarks_v1.sql",
    ]);
  });
});

describe("Lesson Bookmarks Foundation — SQL schema and RLS", () => {
  const sql = read(MIGRATION);
  const body = stripSqlComments(sql);

  it("creates composite PK table without separate id or updated_at", () => {
    expect(sql).toMatch(
      /create table if not exists public\.learning_lesson_bookmarks/
    );
    expect(body).toMatch(/user_id uuid not null/);
    expect(body).toMatch(/lesson_id uuid not null/);
    expect(body).toMatch(/created_at timestamptz not null/);
    expect(body).toMatch(/primary key \(user_id, lesson_id\)/);
    expect(body).not.toMatch(/updated_at/);
    expect(body).toMatch(/learning_lesson_bookmarks_user_created_idx/);
    expect(body).toMatch(/on delete cascade/);
  });

  it("enables FORCE RLS with owner SELECT/INSERT/DELETE and no UPDATE grant", () => {
    expect(body).toMatch(
      /alter table public\.learning_lesson_bookmarks enable row level security/
    );
    expect(body).toMatch(
      /alter table public\.learning_lesson_bookmarks force row level security/
    );
    expect(body).toMatch(
      /grant select, insert, delete on table public\.learning_lesson_bookmarks to authenticated/
    );
    expect(body).not.toMatch(
      /grant[^;]*update[^;]*learning_lesson_bookmarks/i
    );
    expect(body).toMatch(/for select[\s\S]*user_id = \(select auth\.uid\(\)\)/);
    expect(body).toMatch(/for insert[\s\S]*user_id = \(select auth\.uid\(\)\)/);
    expect(body).toMatch(/for delete[\s\S]*user_id = \(select auth\.uid\(\)\)/);
    expect(body).toMatch(/has_learning_course_access/);
    expect(body).not.toMatch(/can_manage_learning_course/);
    expect(body).not.toMatch(/is_platform_admin/);
    expect(body).not.toMatch(
      /create policy "[^"]*(instructor|staff|admin)[^"]*"/i
    );
  });

  it("resolves course via section join in assert helper", () => {
    const assertAccess = fnBody(
      sql,
      "learning_lesson_bookmarks_assert_lesson_access"
    );
    expect(assertAccess).toMatch(
      /join public\.learning_sections s on s\.id = l\.section_id/
    );
    expect(assertAccess).toMatch(/has_learning_course_access\(v_course_id, p_user_id\)/);
    expect(assertAccess).not.toMatch(/l\.course_id/);
  });
});

describe("Lesson Bookmarks Foundation — RPCs", () => {
  const sql = read(MIGRATION);

  it("save is idempotent and preserves existing created_at", () => {
    const save = fnBody(sql, "save_my_learning_lesson_bookmark");
    expect(save).toMatch(/auth\.uid\(\)/);
    expect(save).toMatch(/learning_lesson_bookmarks_assert_lesson_access/);
    expect(save).toMatch(/on conflict \(user_id, lesson_id\) do nothing/);
    expect(save).toMatch(/'saved', true/);
    expect(save).toMatch(/'created_at', v_created_at/);
    expect(save).not.toMatch(/p_user_id/);
  });

  it("delete is owner-only, access-free, and idempotent", () => {
    const del = fnBody(sql, "delete_my_learning_lesson_bookmark");
    expect(del).toMatch(/auth\.uid\(\)/);
    expect(del).not.toMatch(/learning_lesson_bookmarks_assert_lesson_access/);
    expect(del).not.toMatch(/has_learning_course_access/);
    expect(del).toMatch(/'saved', false/);
  });

  it("state requires access and returns only caller saved flag", () => {
    const state = fnBody(sql, "get_my_learning_lesson_bookmark_state");
    expect(state).toMatch(/learning_lesson_bookmarks_assert_lesson_access/);
    expect(state).toMatch(/'saved', coalesce\(v_saved, false\)/);
    expect(state).toMatch(/b\.user_id = v_uid/);
  });

  it("list filters by live access, optional course, order, and has_more", () => {
    const list = fnBody(sql, "list_my_learning_lesson_bookmarks");
    expect(list).toMatch(/b\.user_id = v_uid/);
    expect(list).toMatch(/has_learning_course_access\(c\.id, v_uid\)/);
    expect(list).toMatch(/p_course_id is null or c\.id = p_course_id/);
    expect(list).toMatch(/order by b\.created_at desc, b\.lesson_id desc/);
    expect(list).toMatch(/least\(greatest\(coalesce\(p_limit, 50\), 1\), 100\)/);
    expect(list).toMatch(/v_fetch := v_limit \+ 1/);
    expect(list).toMatch(/'has_more', v_has_more/);
    expect(list).not.toMatch(/body/);
    expect(list).not.toMatch(/progress/);
  });

  it("revokes public/anon execute on all bookmark RPCs", () => {
    for (const name of Object.values(LEARNING_LESSON_BOOKMARKS_RPCS)) {
      expect(sql).toMatch(
        new RegExp(
          `revoke all on function public\\.${name}\\([^)]*\\)\\s+from public, anon`
        )
      );
      expect(sql).toMatch(
        new RegExp(
          `grant execute on function public\\.${name}\\([^)]*\\)\\s+to authenticated`
        )
      );
    }
  });
});

describe("Lesson Bookmarks Foundation — adapter", () => {
  it("maps RPC constants and clamps hub limit", () => {
    expect(Object.values(LEARNING_LESSON_BOOKMARKS_RPCS)).toEqual([
      "save_my_learning_lesson_bookmark",
      "delete_my_learning_lesson_bookmark",
      "get_my_learning_lesson_bookmark_state",
      "list_my_learning_lesson_bookmarks",
    ]);
    expect(clampLearningBookmarksHubLimit(null)).toBe(50);
    expect(clampLearningBookmarksHubLimit(0)).toBe(1);
    expect(clampLearningBookmarksHubLimit(101)).toBe(100);
  });

  it("save / delete / state parse fail-closed JSON", async () => {
    const client = fakeClient((call) => {
      if (call.name === LEARNING_LESSON_BOOKMARKS_RPCS.save) {
        return {
          data: {
            lesson_id: LESSON_ID,
            saved: true,
            created_at: CREATED,
          },
          error: null,
        };
      }
      if (call.name === LEARNING_LESSON_BOOKMARKS_RPCS.delete) {
        return {
          data: { lesson_id: LESSON_ID, saved: false },
          error: null,
        };
      }
      if (call.name === LEARNING_LESSON_BOOKMARKS_RPCS.state) {
        return {
          data: { lesson_id: LESSON_ID, saved: true },
          error: null,
        };
      }
      return { data: null, error: { message: "unexpected" } };
    });

    const saved = await saveMyLearningLessonBookmark(client, LESSON_ID);
    expect(saved).toEqual({
      ok: true,
      data: { lesson_id: LESSON_ID, saved: true, created_at: CREATED },
    });

    const removed = await deleteMyLearningLessonBookmark(client, LESSON_ID);
    expect(removed).toEqual({
      ok: true,
      data: { lesson_id: LESSON_ID, saved: false },
    });

    const state = await getMyLearningLessonBookmarkState(client, LESSON_ID);
    expect(state).toEqual({
      ok: true,
      data: { lesson_id: LESSON_ID, saved: true },
    });
  });

  it("list parses hub payload and rejects invalid rows", async () => {
    const client = fakeClient(() => ({
      data: {
        bookmarks: [
          {
            lesson_id: LESSON_ID,
            lesson_name: "Lesson A",
            course_id: COURSE_ID,
            course_name: "Course A",
            created_at: CREATED,
          },
        ],
        limit: 50,
        has_more: false,
      },
      error: null,
    }));
    const listed = await listMyLearningLessonBookmarks(client, {
      courseId: COURSE_ID,
    });
    expect(listed.ok).toBe(true);
    if (listed.ok) {
      expect(listed.data.bookmarks).toHaveLength(1);
      expect(listed.data.bookmarks[0].lesson_name).toBe("Lesson A");
    }

    const bad = await listMyLearningLessonBookmarks(
      fakeClient(() => ({
        data: { bookmarks: [{ lesson_id: LESSON_ID }], limit: 50, has_more: false },
        error: null,
      }))
    );
    expect(bad.ok).toBe(false);
  });

  it("sanitizes entitlement errors", () => {
    expect(sanitizeLessonBookmarksError("Not entitled to this lesson")).toMatch(
      /not allowed/i
    );
  });
});

describe("Lesson Bookmarks Foundation — UI contracts", () => {
  it("wires control only under canRender and preserves notes", () => {
    const viewer = read(VIEWER);
    expect(viewer).toMatch(/LessonBookmarkControl/);
    expect(viewer).toMatch(/canRender \? \(/);
    expect(viewer).toMatch(/initialSaved=\{initialBookmarkSaved\}/);
    expect(viewer).toMatch(/LessonNotesPanel/);
    expect(viewer).toMatch(/completeLearningLessonAction/);
  });

  it("control waits for server result and avoids lying optimism", () => {
    const control = read(CONTROL);
    expect(control).toMatch(/Save lesson/);
    expect(control).toMatch(/Remove from saved/);
    expect(control).toMatch(/saveLessonBookmarkAction/);
    expect(control).toMatch(/removeLessonBookmarkAction/);
    expect(control).toMatch(/if \(!result\.ok\)/);
    expect(control).toMatch(/setSaved\(result\.data\.saved\)/);
    expect(control).not.toMatch(/setSaved\(!saved\)/);
  });

  it("Saved Lessons route and hub navigation exist without social coupling", () => {
    expect(LEARNING_LEARNER_ROUTES.saved).toBe("/learning/saved");
    const page = read(SAVED_PAGE);
    expect(page).toMatch(/Saved Lessons/);
    expect(page).toMatch(/learning-saved-hub-empty/);
    expect(page).toMatch(/learning-saved-hub-item/);
    expect(page).toMatch(/LEARNING_LEARNER_ROUTES\.lesson/);
    expect(page).not.toMatch(/app\/saved/);
    expect(page).not.toMatch(/Wishlist|Favorites/);

    const hub = read(LEARNING_HUB_PAGE);
    expect(hub).toMatch(/learning-hub-saved-link/);
    expect(hub).toMatch(/Saved lessons/);
    expect(hub).toMatch(/learning-hub-notes-link/);

    const lessonPage = read(LESSON_PAGE);
    expect(lessonPage).toMatch(/getMyLearningLessonBookmarkState/);
    expect(lessonPage).toMatch(/initialBookmarkSaved/);

    const social = read(SOCIAL_SAVED);
    expect(social).not.toMatch(/learning_lesson_bookmarks/);
    expect(social).not.toMatch(/LEARNING_LEARNER_ROUTES\.saved/);
  });

  it("server actions require session and never accept user_id", () => {
    const actions = read(ACTIONS);
    expect(actions).toMatch(/getServerUser/);
    expect(actions).toMatch(/createClient/);
    expect(actions).not.toMatch(/service_role|SERVICE_ROLE|createServiceClient/);
    expect(actions).not.toMatch(/p_user_id|userId:/);
  });

  it("docs capture stale entitlement and no social/Store coupling", () => {
    const docs = read(DOCS);
    expect(docs).toMatch(/20260914/);
    expect(docs).toMatch(/preserved/i);
    expect(docs).toMatch(/omit/i);
    expect(docs).toMatch(/Resume/);
    expect(docs).toMatch(/Personal Notes/);
    expect(docs).toMatch(/social/);
    expect(docs).toMatch(/Store Favorites/);
    expect(docs).toMatch(/no remote apply/i);
  });
});
