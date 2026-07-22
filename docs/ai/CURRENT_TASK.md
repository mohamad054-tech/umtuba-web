# Current Task

## Task title

UM Learning OS — Lessons Foundation V1

## Goal

DB-authoritative Lessons foundation under Sections: Lesson as an educational
**container** (table + 1:1 reserved settings), permission helpers (authority
inherited from Section → Course, no lesson staff table), FORCE RLS, SECURITY
DEFINER RPCs, deterministic ordering within a Section, full 5-level parent-chain
lifecycle gates (space active; program + course + section draft|published),
lesson-appropriate metadata validators (`ai_ready` / `live_ready` only) plus a
descriptive-only `content_type` allowlist, audit integration, TypeScript
contracts, contract tests, and implementation doc.

Hierarchy: Space → Program → Course → Section → Lesson. A Lesson is an
educational container under exactly one Section — it is NOT content body, an
Activity, Progress, or a Live Session. `section_id` is immutable.

## Allowed scope

- `supabase/migrations/20260832_learning_lessons_foundation_v1.sql`
- `lib/learning/lessonsFoundation.ts`
- `lib/learning/lessonsFoundation.test.ts`
- `docs/learning/implementation/LESSONS_FOUNDATION_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Lesson content blocks / media / video processing / rich text / audio / docs /
  Activities / Assessments / Assignments / Quizzes / Homework / Progress /
  Completion / Certificates / Enrollments / Payments / Marketplace / Booking /
  Calendar / Live-session behavior / AI-tutor behavior / Comments / UI / Search /
  Notifications
- Any `learning_lesson_content_blocks` table (reserved contract only — not implemented)
- Any `learning_lesson_staff` table or staff-assignment RPCs (authority inherits
  from Section/Course)
- `category` / `target_audience` on lessons (stay on Section);
  `marketplace_ready` / `certification_ready` (stay on Course)
- Changing `section_id` after creation (immutable)
- Making `content_type` activate any behavior (descriptive only)
- Modifying Spaces/Programs/Courses/Sections migrations or modules outside the Lessons handoff
- Commit, push, merge, remote migration apply without approval

## Branch

`office/learning-lessons-foundation-v1` (from `alpha-0.2`)

## Status

`implemented locally — awaiting final review; no commit/push/migration apply.`
