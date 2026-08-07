# UM Learning — Personal Notes Hub V1

Status: **implemented** (schema live remotely; history reallocated to `20260908`)

Branch: `office/learning-personal-notes-hub-v1`

Migration: `supabase/migrations/20260908_learning_personal_notes_hub_v1.sql`

Capability: `learning.learner.personal_notes_hub_v1`

## Version reservation / history note

- Active Learning Hub migration version: **`20260908`**
- Previously drafted as `20260907`; remote `20260907` is owned by Commerce
  (`store_partial_refund_ledger_compensate_committed_v1`). Learning Git was
  reallocated to `20260908` without changing Hub SQL semantics.
- **`20260909`**: reserved next candidate for Learner Assessment Due UX
  Follow-through (not created in this correction).
- **`20260910–12`**: Translation — untouched.
- **`20260907`**: Commerce — untouched.

## Purpose

Give learners a cross-lesson index of their private personal notes with
course/lesson context and deep links back to the Lesson Viewer.

## Route

`/learning/notes` (`LEARNING_LEARNER_ROUTES.notes`)

- Auth-required LearningShell page
- Linked from `/learning` (“My notes”)
- Optional `?course=<uuid>` filter (invalid UUID ignored safely)
- No create/edit/delete on the hub — CRUD remains in Lesson Viewer

## RPC

`list_my_learning_notes_hub(p_course_id uuid default null, p_limit integer default 50)`

- SECURITY DEFINER, `search_path = public`
- Identity from `auth.uid()` only
- Returns only the caller’s notes (`n.user_id = auth.uid()`)
- Requires live `has_learning_course_access` for each returned note
- Joins `learning_lesson_notes` → `learning_lessons` → `learning_sections` → `learning_courses`
- Order: `updated_at desc, id desc`
- Limit clamped to `1..100`; fetches `limit+1` to set `has_more`
- No offset/cursor
- No DB free-text search in V1
- Supporting index: `learning_lesson_notes_user_updated_idx (user_id, updated_at desc)`

Existing per-lesson CRUD RPCs are unchanged.

## Privacy model

- Owner-only; no instructor/admin SELECT of other learners’ notes
- Course managers/admins only see their own notes (if any)
- Existing table RLS policies are not weakened
- No instructor Notes Hub route

## Access behavior

| Case | Hub behavior |
| --- | --- |
| Unauthenticated | RPC raises; page redirects to login |
| Own note + course access | Included |
| Own note + lost entitlement | Excluded |
| Foreign user’s note | Never returned |
| Deleted lesson | Note cascade-deleted (absent) |

## Pagination / search

- Hard limit + `has_more` only
- Optional course filter via RPC / `?course=`
- No DB free-text search in V1

## Deferred

- Remote `schema_migrations` registration of `20260908` via migration repair
  (explicit GO; do **not** re-run Hub SQL — objects already live)
- Browser runtime smoke (env/fixture debt; not a product blocker)

## Tests

- `lib/learning/lessonNotesFoundation.test.ts` — foundation + Hub SQL/adapter/UI contracts
- Learner route constant coverage in `learnerDelivery.test.ts`
