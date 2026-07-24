# UM Learning — Learning Completion Foundation V1

Status: **implemented** (migration created, **not applied**)

Branch: `office/learning-completion-foundation-v1`

Migration: `supabase/migrations/20260855_learning_completion_foundation_v1.sql`

## Scope

Certificates (metadata) · Transcript · Completion events · In-platform notifications

## Out of scope

Badges, rewards, analytics, AI, PDF, email/push, blockchain, exports

## Certificate rules

Issued once per `(user_id, course_id)` when:
1. `learning_course_progress.status = completed`
2. Assessment gate: every published `completion_mode=score` activity has a progress application
3. Idempotent re-finalize returns existing certificate

## Events

Extends `learning_progress_events` with `course_completed` / `certificate_issued` (deduped).

## Notifications

Adds `learning_course_completed` notification type; uses `create_notification` with null actor + dedupe key.

## RPCs / hooks

- `finalize_my_learning_course_completion(course_id)`
- `get_my_learning_transcript()`
- `get_my_learning_certificates()`
- Trigger on `learning_course_progress` when status becomes `completed`
- Re-try finalize from `apply_my_learning_assessment_progress` when progress recorded (gate may become satisfied after rollup)

## No remote apply

Git-only until explicitly applied.
