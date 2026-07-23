# UM Learning — Learner Delivery V1

## Goal

Ship the first learner-facing experience on top of existing Learning foundations
(Spaces → Scoring + Read Model Hardening). Learners can browse entitled content,
complete lessons’ published body, and run immutable attempt sessions — without
seeing answer keys, scores, correctness, drafts, or staff metadata.

## Architecture (approved)

Server Components + user JWT Supabase client (`createClient` /
`getServerUser`) + existing Attempts / Progress RPCs + entitlement-filtered
catalog reads. Direct SELECT only where RLS already matches the product gate
(content blocks, own enrollments / progress / attempts). **No service role.**
**No TypeScript authorization substitute.**

Read Model Hardening V1 (`20260840`) aligns course-tree learner SELECT with
`has_learning_course_access` / `has_learning_program_access`.

## Routes

| Route | Role |
| --- | --- |
| `/learning` | My Learning hub |
| `/learning/courses/[courseId]` | Course outline + progress |
| `/learning/lessons/[lessonId]` | Published blocks + activities |
| `/learning/activities/[activityId]` | Start / resume attempt gate |
| `/learning/attempts/[attemptId]` | Attempt player |

## Components

Under `app/components/learning/`:

- `LearningShell`, `LearningHub`, `CourseOutline`, `ProgressSummary`
- `LessonViewer`, `ContentBlockRenderer`, `ActivityList`
- `AttemptPlayer` (client), `AttemptQuestion` (client), `AttemptStatusBanner`

## Data / mutations

| Concern | Strategy |
| --- | --- |
| Hub | Own `learning_enrollments` (active) → published programs/courses |
| Outline | Published sections/lessons + `get_learning_course_progress` |
| Lesson open | `start_learning_lesson` + `touch_learning_lesson`; published blocks/activities |
| Attempt start | `start_learning_attempt` (resume-safe) |
| Attempt load | `get_my_learning_attempt` (learner-safe snapshot) |
| Save / submit / cancel | `save_learning_attempt_answer` / `submit_learning_attempt` / `cancel_learning_attempt` |
| Autosave flush | Submit clears debounce timers and flushes pending answers first; failed flush blocks submit. Cancel discards pending autosave so no delayed save runs after terminal. |
| Settings to UI | Only `is_required`, `max_attempts`, `time_limit_seconds` |

## Security rules

- Do **not** expose: answer keys, scores, correctness, staff metadata, drafts.
- Do **not** call `score_learning_attempt` or SELECT result / question / key tables.
- Do **not** activate `show_result_policy` (remains inert / default `never`).
- Submitted state displays **only**:
  `Submitted — results are not available yet.`
- Content URLs: http(s) only; markdown rendered as escaped plain text (no raw HTML).
- Learning pages use `dynamic = "force-dynamic"` (private, no shared CDN cache).

## Out of scope

Instructor UI, authoring, manual/AI grading, certificates, assignments,
analytics, learner result delivery, offline, mobile app, applying migrations.

## No migrations

This slice is UI + helpers only. Learning migrations `20260828`–`20260840`
remain Git-only until explicitly applied.

## Files

- `lib/learning/learnerDelivery.ts`
- `lib/learning/learnerDelivery.test.ts`
- `lib/learning/contentBlockRender.ts`
- `app/learning/**`
- `app/components/learning/**`
- `docs/learning/implementation/LEARNER_DELIVERY_V1.md`
