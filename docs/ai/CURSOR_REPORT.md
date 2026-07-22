# Cursor Report

## Summary

Implemented **UM Learning OS Sections Foundation V1** on branch
`office/learning-sections-foundation-v1` (created from `alpha-0.2` tip).

Hierarchy **Space -> Program -> Course -> Section**. A Section is an organizational
educational module under exactly one Course (RESTRICT) -- it is **not** a Lesson.
`course_id` is immutable. **Authority is inherited from the parent Course**:
there is no section staff table and no staff-assignment RPCs. Space remains the
hard authority boundary, and Course authority stays membership-revalidated (a
stale Course staff row grants no Section authority).

Delivered: migration (table + 1:1 inert settings, helpers, FORCE RLS, validators,
RPCs, grants), TS constants/types, contract tests, implementation doc, and AI
handoff updates.

**No commit, push, merge, or remote Supabase migration apply.**

> **Verification COMPLETE (this session).** The shell environment is functional.
> All mandatory checks were executed and passed: `tsc --noEmit`, the four
> foundation `vitest` suites, `npm run build`, and `git diff --check`. The feature
> branch `office/learning-sections-foundation-v1` was created from the `alpha-0.2`
> tip (HEAD == origin/alpha-0.2, 0 ahead / 0 behind). No fixes were required.

## Exact files changed

| Path | Action |
| --- | --- |
| `supabase/migrations/20260831_learning_sections_foundation_v1.sql` | created |
| `lib/learning/sectionsFoundation.ts` | created |
| `lib/learning/sectionsFoundation.test.ts` | created |
| `docs/learning/implementation/SECTIONS_FOUNDATION_V1.md` | created |
| `docs/ai/CURRENT_TASK.md` | updated |
| `docs/ai/CURSOR_REPORT.md` | updated |

## Migrations created

- `supabase/migrations/20260831_learning_sections_foundation_v1.sql`
  - Ordered **after** Courses (`20260830`). Depends on Courses -> Programs -> Spaces.
  - **Not applied** to remote Supabase in this phase.

### Schema summary

- `learning_sections` -- `course_id` RESTRICT + **immutable**; slug unique per
  course (3-64 kebab); name 1-160; status; visibility; **position >= 0**;
  `default_language`; foundation scalars (`category`, `difficulty`,
  `estimated_duration_minutes`, `target_audience`, `supported_languages`);
  **section-appropriate flags only** (`ai_ready`, `live_ready`) -- **no
  `marketplace_ready` / `certification_ready`**; JSON metadata (`branding`,
  `seo`, `ai`); timestamps (`published_at` / `suspended_at` / `archived_at`).
  Indexes: `(course_id, status)`, `(course_id, position, id)`,
  `(status, visibility)`, `(created_by)`.
- `learning_section_settings` -- 1:1, **ENABLE (not FORCE) RLS**; reserved inert
  flags `is_required=true`, `enforce_lesson_order=false`, `visible_when_locked=true`.

### Helpers

- `can_manage_learning_section` -> platform admin **or** `can_manage_learning_course`.
- `can_create_learning_section` -> `can_manage_learning_course` **or** active course
  staff rank >= instructor (mirrors `can_create_learning_course` one level down).
- `learning_section_require_mutable_status`,
  `learning_section_require_parent_program_status`,
  `learning_section_require_parent_course_status`,
  `learning_section_validate_supported_languages`,
  `learning_section_validate_metadata_object`.

### RPCs

| RPC | Purpose |
| --- | --- |
| `create_learning_section` | draft create; append position; locks parent course row |
| `update_learning_section` | metadata update (draft\|published only); no `course_id` change |
| `publish_learning_section` | draft->published; fail-closed on parent chain |
| `archive_learning_section` | lifecycle; blocked while suspended |
| `moderate_learning_section` | platform admin suspended\|published\|archived |
| `reorder_learning_sections` | transactional positions `0..n-1` within course (two-phase) |

**No staff-assignment RPCs.**

## Security review

- FORCE RLS on `learning_sections`; ENABLE on `learning_section_settings`; no
  client INSERT/UPDATE/DELETE on either (RPC-only writes); SELECT granted.
- Public/anon SELECT: section published+public AND course published+public AND
  program published+public AND space active+public; **never** calls
  `is_platform_admin`. Separate authenticated platform-admin read policy.
- Authority inherited from Course; delegated course staff require active parent-space
  membership (revalidated by the Course helpers on every check) -- stale staff row
  grants no authority.
- Normal mutations only for draft\|published; suspended/archived -> moderate only.
  Owner/lead cannot bypass suspended/archived gates.
- Parent gates on every mutation: space active; program draft\|published; course
  draft\|published. Publishing fail-closed when any parent not allowed.
- `course_id` immutable -- no RPC assigns `course_id`; reorder cannot move rows
  across courses (every id constrained to the requested course; full unique set required).
- Metadata validators: 8192-byte cap + allowlists (section-prefixed duplicates of
  the Courses pattern). Validators revoked from public/anon/authenticated.
- All functions SECURITY DEFINER with `search_path = public`.
- Immutable, append-only audit via `learning_audit_write` with actor/space/course/section
  attribution: `section.create|update|publish|archive|moderation|reorder`.

## Tests

Contract tests added: `lib/learning/sectionsFoundation.test.ts` (files/ordering,
constants<->SQL, identity/schema, inherited authority + no staff table, parent
gates + lifecycle + timestamp normalization, ordering + cross-course safety,
visibility/public-read, security hardening, audit + inert settings, exclusions,
documentation).

```
npx vitest run lib/learning/spacesFoundation.test.ts \
  lib/learning/programsFoundation.test.ts \
  lib/learning/coursesFoundation.test.ts \
  lib/learning/sectionsFoundation.test.ts
```

- **PASS** -- 4 test files passed, **121 tests passed** (0 failed).
  - `coursesFoundation.test.ts` (28 tests)
  - `sectionsFoundation.test.ts` (33 tests)
  - `spacesFoundation.test.ts` (35 tests)
  - `programsFoundation.test.ts` (25 tests)
  - vitest v3.2.7, duration ~2.7s.

## TypeScript

```
npx tsc --noEmit
```

- **PASS** -- no type errors (exit 0).

## Build

```
npm run build
```

- **PASS** -- Next.js 16.2.10 (Turbopack) compiled successfully; TypeScript step
  passed; 59/59 static pages generated; exit 0.

## git diff --check

- **PASS** -- no whitespace/conflict errors (exit 0).

## git status --short

```
 M docs/ai/CURRENT_TASK.md
 M docs/ai/CURSOR_REPORT.md
?? docs/learning/implementation/SECTIONS_FOUNDATION_V1.md
?? lib/learning/sectionsFoundation.test.ts
?? lib/learning/sectionsFoundation.ts
?? supabase/migrations/20260831_learning_sections_foundation_v1.sql
```

Branch: `office/learning-sections-foundation-v1` (created from `alpha-0.2` tip).

## Open issues

- Migration not applied to remote Supabase (intentional; pending human approval).
- No commit/push performed; changes remain uncommitted pending human approval.
- Next Learning slice = **Lessons** (content within a Section) -- not started.

## Verdict

**READY FOR REVIEW -- implementation complete; all mandatory automated verification
passed (`tsc`, four foundation `vitest` suites = 121 passed, `npm run build`,
`git diff --check`).** No fixes were required. Awaiting human review before any
commit/push and before applying the migration to remote Supabase.
