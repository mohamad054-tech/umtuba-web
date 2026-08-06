# UM Learning — Assessment Due Dates on Calendar V1

Status: **implemented** (migration created, **not applied remotely**)

Branch: `office/learning-assessment-due-dates-calendar-v1`

Migration: `supabase/migrations/20260906_learning_assessment_due_dates_calendar_v1.sql`

Capability: `learning.calendar.assessment_due_dates_v1`

## Purpose

Allow instructors to set an optional due instant on quiz assessments and surface
those dues on learner and instructor Learning calendars alongside live sessions
and assignment dues.

## Storage model

- Column: `learning_activity_settings.due_at timestamptz NULL`
- Partial index: `learning_activity_settings_due_at_idx` where `due_at is not null`
- No `learning_assessment_specs` table
- Assignments continue to use `learning_assignment_specs.due_at`

## Timezone convention

Stored and compared as UTC `timestamptz` (same as assignment dues and live
session timestamps). UI `datetime-local` values are normalized to ISO/UTC via
the adapter before RPC write.

## Authorization

- `set_learning_assessment_due_at` — SECURITY DEFINER, `search_path = public`
- Requires authenticated user and course manage/staff/admin (same family as live
  manage asserts)
- Activity must exist and `type = 'quiz'`
- Revoked from `public`/`anon`; execute granted to `authenticated` (+ service_role)

## Set / clear semantics

- Set: `p_due_at` required when `p_clear_due` is false
- Clear: `p_clear_due = true` sets `due_at` to NULL (event disappears from calendar)
- Overdue is **derived** at read/display time (`now() > due_at`); never persisted
- **No** attempt start/submit/answer/score/completion enforcement in V1

## Calendar event contract

`kind = assessment_due`

| Field | Value |
| --- | --- |
| `item_id` | activity id |
| `course_id` | owning course |
| `title` | activity name, fallback `Assessment` |
| `occurs_at` | settings.due_at |
| `ends_at` | null |
| `status` | `due` |

Payload flag: `assessment_due_supported: true`

Existing `live_session` and `assignment_due` events are preserved.

## UI

- Instructor: due control on quiz questions authoring page
- Learner calendar: assessment due label + link to `/learning/activities/{id}/assessment`
- Instructor calendar: assessment due link to questions authoring route
- Assignment due hrefs corrected while touching calendar pages

## Optional learner delivery due display

**Skipped in V1.** `get_my_learning_activity_assessment` does not expose `due_at`;
widening that delivery RPC is out of scope for this calendar milestone.

## Deferred

- Remote apply of `20260906` (explicit GO required; reallocated off collided `20260905`)
- Browser runtime smoke (env/fixture debt; not a product blocker)

## Tests

See `lib/learning/assessmentDueDates.test.ts` and updated live calendar suite.
