# Current Task

## Task title

UM Learning OS — Enrollments Foundation V1

## Goal

DB-authoritative Enrollments foundation: an enrollment is an **ENTITLEMENT to
participate** in a Program **XOR** a Course. It is **NOT** payment, progress,
completion percentage, certificate, attempt, submission, grade, seat/capacity,
or space membership. Its lifecycle
(`pending | active | suspended | expired | cancelled | completed`) is **distinct
from content lifecycle** and **independent of space membership**.

Delivered: the `learning_enrollments` table (Program XOR Course via nullable hard
FKs + `target_type` + denormalized `space_id`), an append-only
`learning_enrollment_events` log + `learning_audit_write` summary, immutable
provenance (10-source allowlist; `self_enrollment` reserved for learner RPCs),
soft references for payments/UEOS (no cross-product FKs), one live enrollment per
learner per target (partial unique on `pending|active|suspended`), **no anon
SELECT**, entitlement helpers evaluated **live**
(`has_learning_program_access` / `has_learning_course_access`), manage/enroll
helpers (`can_manage_learning_enrollment`, `can_enroll_in_learning_program` /
`_course`) that reuse the existing settings flags (`allow_self_enroll`,
`require_space_membership`, `require_program_enrollment`), SECURITY DEFINER RPCs,
FORCE RLS, TypeScript contracts, contract tests, and an implementation doc.

Target model: Space → Program (`target_type='program'`) or
Space → Program → Course (`target_type='course'`). Membership and enrollment stay
independent; `require_*` gate only the act of enrolling.

## Allowed scope

- `supabase/migrations/20260834_learning_enrollments_foundation_v1.sql`
- `lib/learning/enrollmentsFoundation.ts`
- `lib/learning/enrollmentsFoundation.test.ts`
- `docs/learning/implementation/ENROLLMENTS_FOUNDATION_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Payments / pricing / checkout / refunds / marketplace
- Progress / completion tracking / certificates
- Attempts / submissions / grades / rubrics / auto-evaluation engines
- Seats / capacity / waitlists / booking / calendar / live-session behavior
- Auto-creating space membership from an enrollment (membership stays independent)
- Any cross-product foreign keys into Store/UEOS/payments (soft refs only)
- Any anonymous/public SELECT policy or `anon` table grant
- Reviving terminal enrollment rows (re-enroll creates a NEW row)
- Making `complete` read/write progress/grade/certificate data (it is inert)
- Changing `space_id`/`target_type`/`program_id`/`course_id`/`user_id`/`source`
  after creation (all immutable)
- Modifying Spaces/Programs/Courses/Sections/Lessons/Activities migrations or
  modules outside the Enrollments handoff
- Commit, push, merge, remote migration apply without approval

## Branch

`office/learning-enrollments-foundation-v1`

## Status

`implemented locally — awaiting final review; no commit/push/migration apply.`
