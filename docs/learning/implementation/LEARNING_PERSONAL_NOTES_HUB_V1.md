# UM Learning — Personal Notes Hub V1

Status: **implemented** (migration created, **not applied remotely**)

Branch: `office/learning-personal-notes-hub-v1`

Migration: `supabase/migrations/20260907_learning_personal_notes_hub_v1.sql`

Capability: `learning.learner.personal_notes_hub_v1`

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

- Remote apply of `20260907` (explicit GO required)
- Browser runtime smoke (env/fixture debt; not a product blocker)

## Tests

- `lib/learning/lessonNotesFoundation.test.ts` — foundation + Hub SQL/adapter/UI contracts
- Learner route constant coverage in `learnerDelivery.test.ts`
