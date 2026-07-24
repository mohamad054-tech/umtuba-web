# UM Learning — Instructor Experience Foundation V1

Status: **implemented** (migration created, **not applied**)

Branch: `office/learning-instructor-experience-foundation-v1`

Migration: `supabase/migrations/20260856_learning_instructor_experience_foundation_v1.sql`

## Surfaces

1. Instructor dashboard — courses, quick stats, pending work, recent activity
2. Manual review queue — course/status/search filters (links into existing review attempt UI)
3. Learner progress monitor — enrolled / active / completed / pending_review / failed / passed
4. Course overview — enrollments, completions, pending reviews, average progress, active learners
5. Learner details — lessons, activities, assessment/grading/completion (read-only)
6. Completion overview — completed / failed / waiting grading / inactive

## Rules

- Read-only staff RPCs
- Auth: `can_manage_learning_course` or platform admin
- Reuses progress, enrollments, attempts/results, manual review, certificates
- No grading / progress / certificate / notification mutations
- No UI table access (RPC adapters only)

## No remote apply

Git-only until explicitly applied.
