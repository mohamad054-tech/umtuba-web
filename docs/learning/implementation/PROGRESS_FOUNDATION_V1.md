# UM Learning OS — Progress Foundation V1

Status: implemented locally (migration not applied remotely in this phase)

Migration: `supabase/migrations/20260835_learning_progress_foundation_v1.sql`

Depends on: `20260828`–`20260834` (Spaces → … → Enrollments).

Constants / types: `lib/learning/progressFoundation.ts`

## Purpose

DB-authoritative **Progress** foundation: records a learner's learning state in a
**Course** and its **Lessons**. Progress answers *"how far has this learner
gone?"* — not entitlement, payment, certificate, attempt, or grade.

## Access gate (expanded)

`has_learning_course_access` (replaced in this migration) grants access when any
of the following hold:

1. Platform admin
2. Course manager
3. Active **course** enrollment (within start/expiry window)
4. Active **parent program** enrollment (course belongs to that program; within
   window)

Progress **writes** require this live gate. Historical progress rows are **not**
deleted when enrollment later suspends / expires / cancels.

## Scope

| Included | Notes |
| --- | --- |
| `learning_lesson_progress` | Per `(user, lesson)` source of truth |
| `learning_course_progress` | Server rollup: counts + `percent_complete` |
| `learning_progress_events` | Append-only event log |
| RPCs | start / touch / complete / reopen / get / recompute |

## Exclusions

Activity progress, Attempts, Submissions, Certificates, AI grading, Payments, UI,
Client authority over percent/timestamps/`user_id`, draft activity settings reads.

## Course rollup (DB-only)

`learning_course_progress` stores:

- `completed_lessons_count`
- `total_lessons_count` (published lessons in the course)
- `percent_complete` = `floor(100 * completed / total)` when `total > 0`, else `0`

Clients **cannot** supply these values. `last_activity_id` is reserved null in V1.

## Lesson statuses

`not_started | in_progress | completed`

- `started_at` set once
- `first_completed_at` set once; retained across reopen
- `completed_at` set on complete; cleared on reopen
- V1 completion source: `manual` only
- Optional `min_completion_seconds` from `learning_lesson_settings` enforced when set

## RPCs

| RPC | Notes |
| --- | --- |
| `start_learning_lesson` | → `in_progress`; idempotent resume |
| `touch_learning_lesson` | heartbeat `last_activity_at` |
| `complete_learning_lesson` | idempotent complete + rollup |
| `reopen_learning_lesson` | completed → in_progress |
| `get_learning_course_progress` | own rollup (recomputed) |
| `recompute_learning_course_progress` | self or manager/admin for another user |

All: `SECURITY DEFINER`, `search_path = public`, revoke `public`/`anon`, grant
`authenticated, service_role`. No anon SELECT on progress tables.

## Security summary

- FORCE RLS; authenticated SELECT only (learner-own / course managers / admin)
- RPC-only writes; identity columns immutable
- Course/lesson derived server-side from `lesson_id` (no forged `course_id`)
- Does not expand Activities draft settings read policy

## Next slice (not decided)

Likely Lesson Content Blocks, Questions/Attempts, or Certificates.
