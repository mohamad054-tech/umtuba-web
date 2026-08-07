# UM Learning — Learner Assessment Due UX Follow-through V1

Status: **implemented** (Git-only until explicit remote apply GO)

Branch: `office/learning-assessment-due-ux-followthrough-v1`

Migration: `supabase/migrations/20260909_learning_assessment_due_ux_followthrough_v1.sql`

Capability: `learning.learner.assessment_due_ux_followthrough_v1`

## Purpose

Expose nullable assessment `due_at` on the learner assessment delivery payload
and show Due / Overdue on the assessment page. Completes the calendar due-dates
journey at the point of attempt start.

## Migration `20260909`

`CREATE OR REPLACE` of `public.get_my_learning_activity_assessment(uuid)` only.

Additive top-level field:

- `due_at` — from `learning_activity_settings.due_at` (nullable timestamptz → JSON null / ISO)

Preserved:

- `auth.uid()`, `has_learning_course_access`, published chain
- hints (`is_required`, `max_attempts`, `time_limit_seconds`)
- questions snapshot behavior
- SECURITY DEFINER + `search_path = public`
- revoke public/anon; grant authenticated + service_role

## Learner UX

On `/learning/activities/{id}/assessment`:

| `due_at` | UI |
| --- | --- |
| null / absent | no Due row |
| future | **Due** + formatted timestamp |
| past (or equal now) | **Overdue** + due timestamp |

## Explicit non-goals

- Overdue is **presentation-only** — does not gate start/save/submit/score
- No late penalties / completion changes
- Instructor due authoring unchanged (`set_learning_assessment_due_at`)
- Calendar aggregation unchanged
- Attempt player redesign out of scope

## Version map

- `20260906` — Assessment Due Dates Calendar
- `20260907` — Commerce (untouched)
- `20260908` — Personal Notes Hub (untouched)
- `20260909` — this milestone
- `20260910–12` — Translation (untouched)

## Deferred

- Remote apply of `20260909` (explicit GO)
- Browser smoke (env/fixture debt)

## Tests

- `lib/learning/assessmentDelivery.test.ts` — SQL + adapter + page contracts
- `lib/learning/assessmentDueDates.test.ts` — presentation helpers
- Regression: attempt foundation, runtime UI, calendar due dates
