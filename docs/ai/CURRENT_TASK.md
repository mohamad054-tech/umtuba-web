# Current Task

## Task title

UM Learning - Assessment Due Dates on Calendar V1

## Status

`implementation-complete` — local commit pending validation; migration **not** applied remotely.

## Milestone

`learning.calendar.assessment_due_dates_v1`

## Scope landed

- Migration `20260906_learning_assessment_due_dates_calendar_v1.sql`
  - `learning_activity_settings.due_at`
  - `set_learning_assessment_due_at`
  - calendar RPCs include `assessment_due` + `assessment_due_supported: true`
- Adapter `lib/learning/assessmentDueDates.ts`
- Instructor due controls on quiz questions authoring
- Learner + instructor calendar routing for assessment/assignment/live

## Branch / worktree

`office/learning-assessment-due-dates-calendar-v1`  
`D:\umtuba-central\repos\umtuba-web-learning-assessment-due-dates-calendar-v1`  
Base: `17ce7e498757c8bd984b776bdde9fbf9a71dd36d`

## Explicitly out of scope

- Remote migration apply
- Attempt/scoring/answer/submission/completion enforcement
- Commerce / Translation / Collaboration / Billing / UEOS / Mobile / Guardian

## Recommended next

Optional remote apply GO for `20260906` (reallocated off collided `20260905`).
