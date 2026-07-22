# Current Task

## Task title

UM Learning OS — Activities Foundation V1

## Goal

DB-authoritative Activities foundation under Lessons: an Activity as a generic
educational **interaction container** (table + 1:1 reserved/inert settings
sidecar), permission helpers (authority inherited from Lesson → Section → Course,
no activity staff table), FORCE RLS on the activity table, SECURITY DEFINER RPCs,
deterministic ordering within a Lesson, full **6-level** parent-chain lifecycle
gates (space active; program + course + section + lesson draft|published), an
**immutable 16-type allowlist**, a lean `ai_metadata` surface, a bounded shallow
`config` JSON, audit integration, TypeScript contracts, contract tests, and an
implementation doc.

Hierarchy: Space → Program → Course → Section → Lesson → Activity. An Activity is
an interaction container under exactly one Lesson — it is NOT a question,
attempt, submission, answer, grade, progress record, certificate, live session,
or AI execution. `lesson_id` and `type` are immutable.

**CRITICAL divergence from Lessons:** there is **NO anonymous/public SELECT
policy** in V1 (privacy-safe for assessments). `visibility` is retained for
forward compatibility only and has no anon effect.

## Allowed scope

- `supabase/migrations/20260833_learning_activities_foundation_v1.sql`
- `lib/learning/activitiesFoundation.ts`
- `lib/learning/activitiesFoundation.test.ts`
- `docs/learning/implementation/ACTIVITIES_FOUNDATION_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Questions / question banks / answers / attempts / submissions / grades /
  rubrics / auto-evaluation engines / teacher workflows / coding execution /
  file storage / AI execution / progress / completion / certificates /
  enrollments / payments / marketplace / booking / calendar / live-session
  behavior / AI-tutor behavior / comments / UI / search / notifications
- Any `learning_lesson_items` table (reserved contract only — not implemented)
- Any type-specific engines or type-specific columns on the activity row
- Any `learning_activity_staff` table or staff-assignment RPCs (authority
  inherits from Lesson/Section/Course)
- `category` / `target_audience` / `marketplace_ready` / `certification_ready` /
  descriptive `content_type` on activities (stay on their owning entities)
- Changing `lesson_id` or `type` after creation (both immutable)
- Making `type` activate any behavior (immutable typed slot only)
- Adding an anonymous/public SELECT policy or `anon` table grant
- Modifying Spaces/Programs/Courses/Sections/Lessons migrations or modules
  outside the Activities handoff
- Commit, push, merge, remote migration apply without approval

## Branch

`office/learning-activities-foundation-v1`

## Status

`implemented locally — awaiting final review; no commit/push/migration apply.`
