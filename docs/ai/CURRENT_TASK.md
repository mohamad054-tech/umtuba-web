# Current Task

## Task title

UM Learning OS — Sections Foundation V1

## Goal

DB-authoritative Sections foundation under Courses: table + 1:1 reserved
settings, permission helpers (authority inherited from Course, no section staff
table), FORCE RLS, SECURITY DEFINER RPCs, deterministic ordering within a course,
parent-chain lifecycle gates (space active; program + course draft|published),
metadata validators (section-appropriate surface — `ai_ready` / `live_ready`
only), audit integration, TypeScript contracts, contract tests, and
implementation doc.

Hierarchy: Space → Program → Course → Section. A Section is an organizational
educational module under exactly one Course (NOT a Lesson). `course_id` is
immutable.

## Allowed scope

- `supabase/migrations/20260831_learning_sections_foundation_v1.sql`
- `lib/learning/sectionsFoundation.ts`
- `lib/learning/sectionsFoundation.test.ts`
- `docs/learning/implementation/SECTIONS_FOUNDATION_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Lessons / Activities / Assessments / Assignments / Quizzes / Homework /
  Progress / Enrollments / Certificates / Payments / Marketplace / Booking /
  Calendar / Live-session behavior / AI-tutor behavior / UI / Search /
  Notifications
- Any `learning_section_staff` table or staff-assignment RPCs (authority inherits
  from Course)
- `marketplace_ready` / `certification_ready` on sections (stay on Course)
- Changing `course_id` after creation (immutable)
- Modifying Spaces/Programs/Courses migrations or modules outside the Sections handoff
- Commit, push, merge, remote migration apply without approval

## Branch

`office/learning-sections-foundation-v1` (from `alpha-0.2`)

## Status

`implemented locally — awaiting final review; no commit/push/migration apply.`
