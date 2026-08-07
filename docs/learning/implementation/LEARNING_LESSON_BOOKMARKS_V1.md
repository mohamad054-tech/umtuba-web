# UM Learning — Lesson Bookmarks / Saved Lessons V1

Status: **implemented locally** (Git-only; **no remote apply**)

Branch: `office/learning-lesson-bookmarks-v1`

Migration: `supabase/migrations/20260915_learning_lesson_bookmarks_v1.sql`

Capability: `learning.learner.lesson_bookmarks_v1`

## Purpose

Let learners intentionally save lessons for later return via a private Saved
Lessons hub with deep links to the Lesson Viewer.

## Distinction

| Capability | Role |
| --- | --- |
| Resume / Continue Learning | Automatic progress continuity (last accessible lesson / media pointer) |
| Personal Notes | Private text attached to a lesson |
| Lesson Bookmarks | Explicit save/unsave presence for a lesson (this milestone) |

Not social `/saved`, Store Favorites, folders, tags, sharing, or AI metadata.

## Data model

`public.learning_lesson_bookmarks`

| Column | Notes |
| --- | --- |
| `user_id` | FK `profiles(id)` ON DELETE CASCADE |
| `lesson_id` | FK `learning_lessons(id)` ON DELETE CASCADE |
| `created_at` | First save time; preserved on idempotent re-save |

Primary key: `(user_id, lesson_id)` — no separate `id`, no `updated_at`.

Index: `learning_lesson_bookmarks_user_created_idx (user_id, created_at desc)`.

## Privacy / RLS

- ENABLE + FORCE RLS
- Owner-only SELECT / INSERT / DELETE (`auth.uid() = user_id`)
- INSERT also requires live `has_learning_course_access` via lesson→section→course
- No UPDATE grant
- No instructor/admin browse-all policy
- Mutations via SECURITY DEFINER RPCs; identity from `auth.uid()` only

## Stale entitlement

- Bookmark **rows are preserved** after entitlement loss
- Hub / list **omit** bookmarks whose courses are no longer accessible
- State RPC **fail-closed** when lesson is inaccessible
- Delete RPC allows **owner cleanup without live access**

## RPCs

| RPC | Behavior |
| --- | --- |
| `save_my_learning_lesson_bookmark(uuid)` | Access required; insert ON CONFLICT DO NOTHING; returns `saved: true` + actual `created_at` |
| `delete_my_learning_lesson_bookmark(uuid)` | Owner-only; no access required; idempotent `saved: false` |
| `get_my_learning_lesson_bookmark_state(uuid)` | Access required; `{ lesson_id, saved }` |
| `list_my_learning_lesson_bookmarks(uuid, integer)` | Owner + live access filter; optional course filter; newest first; limit 1..100 + `has_more` |

Helper: `learning_lesson_bookmarks_assert_lesson_access`.

## Routes / UI

- Lesson Viewer: Save lesson / Remove from saved when `canRender`
- Hub: `/learning/saved` (`LEARNING_LEARNER_ROUTES.saved`)
- Learning hub link: “Saved lessons”
- Optional `?course=<uuid>` filter (invalid UUID ignored)

## Explicitly out of scope

- Remote apply / migration repair
- Commerce / Translation / Collaboration / Billing / UEOS / Guardian
- Social `/saved` or Store Favorites coupling
- Personal Notes changes
- Lesson completion / progress semantics
- Instructor bookmark browsing
- Folders / tags / sharing / AI

## Deferred

- Browser smoke (trusted runtime env + entitled learner fixture)
- Remote apply of `20260915` (separate GO)

## Migration ownership note

- `20260905`–`20260907` Commerce / Learning / Commerce as previously aligned
- `20260908` Learning Personal Notes Hub
- `20260909` Learning Assessment Due UX
- `20260910`–`20260914` Translation (incl. memory identity contract on `20260914`)
- **`20260915`** this milestone (reallocated after `20260914` Translation collision)
