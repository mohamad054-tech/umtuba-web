# Cursor Report

## Summary

Implemented **UM Learning OS Lessons Foundation V1** on branch
`office/learning-lessons-foundation-v1` (created from `alpha-0.2` tip, which
already contains Sections Foundation V1 at `20260831`).

Hierarchy **Space -> Program -> Course -> Section -> Lesson**. A Lesson is an
educational **container** under exactly one Section (RESTRICT) -- it is **not**
content body, an Activity, Progress, or a Live Session. `section_id` is
immutable. **Authority is inherited from the parent Section -> Course**: there is
no lesson staff table and no staff-assignment RPCs. Space remains the hard
authority boundary, and Course authority stays membership-revalidated (a stale
Course staff row grants no Lesson authority).

Delivered: migration (container table + 1:1 inert settings, helpers, FORCE RLS,
validators, RPCs, grants), a descriptive-only `content_type` allowlist, TS
constants/types, contract tests, implementation doc, and AI handoff updates.

**No commit, push, merge, or remote Supabase migration apply.**

> **Verification COMPLETE (this session).** The shell environment is functional.
> All mandatory checks were executed and passed: `tsc --noEmit`, the five
> foundation `vitest` suites, `npm run build`, and `git diff --check`. The feature
> branch `office/learning-lessons-foundation-v1` was created from the `alpha-0.2`
> tip (HEAD == origin/alpha-0.2, 0 ahead / 0 behind). No fixes were required.

## Exact files changed

| Path | Action |
| --- | --- |
| `supabase/migrations/20260832_learning_lessons_foundation_v1.sql` | created |
| `lib/learning/lessonsFoundation.ts` | created |
| `lib/learning/lessonsFoundation.test.ts` | created |
| `docs/learning/implementation/LESSONS_FOUNDATION_V1.md` | created |
| `docs/ai/CURRENT_TASK.md` | updated |
| `docs/ai/CURSOR_REPORT.md` | updated |

## Migrations created

- `supabase/migrations/20260832_learning_lessons_foundation_v1.sql`
  - Ordered **after** Sections (`20260831`). Depends on Sections -> Courses ->
    Programs -> Spaces.
  - **Not applied** to remote Supabase in this phase.

### Schema summary

- `learning_lessons` -- `section_id` RESTRICT + **immutable**; slug unique per
  section (3-64 kebab); name 1-160; status; visibility; **position >= 0**;
  **descriptive-only `content_type`** nullable allowlist
  (`video|text|audio|document|interactive|live`) that activates nothing;
  `default_language`; lesson-trimmed scalars (`difficulty`,
  `estimated_duration_minutes`, `supported_languages`); **lesson-appropriate
  flags only** (`ai_ready`, `live_ready`) -- **no `category` / `target_audience`
  / `marketplace_ready` / `certification_ready`**; JSON metadata (`branding`,
  `seo`, `ai`); timestamps (`published_at` / `suspended_at` / `archived_at`).
  Indexes: `(section_id, status)`, `(section_id, position, id)`,
  `(status, visibility)`, `(created_by)`. Container only -- **no large content
  payloads**; the reserved future table `learning_lesson_content_blocks` is named
  only and **not implemented**.
- `learning_lesson_settings` -- 1:1, **ENABLE (not FORCE) RLS**; reserved inert
  flags `is_required=true`, `is_previewable=false`, `allow_comments=false`,
  `min_completion_seconds=null` (no completion/preview/comments/progress behavior).

### Helpers

- `can_manage_learning_lesson` -> platform admin **or** `can_manage_learning_section`.
- `can_create_learning_lesson` -> `can_manage_learning_section` **or** active course
  staff rank >= instructor (course resolved through the parent section; mirrors
  `can_create_learning_section` one level down).
- `learning_lesson_require_mutable_status`,
  `learning_lesson_require_parent_program_status`,
  `learning_lesson_require_parent_course_status`,
  `learning_lesson_require_parent_section_status`,
  `learning_lesson_validate_supported_languages`,
  `learning_lesson_validate_metadata_object`.

### RPCs

| RPC | Purpose |
| --- | --- |
| `create_learning_lesson` | draft create; append position; locks parent section row; optional descriptive `content_type` |
| `update_learning_lesson` | metadata update (draft\|published only); no `section_id` change |
| `publish_learning_lesson` | draft->published; fail-closed on full parent chain |
| `archive_learning_lesson` | lifecycle; blocked while suspended |
| `moderate_learning_lesson` | platform admin suspended\|published\|archived |
| `reorder_learning_lessons` | transactional positions `0..n-1` within section (two-phase) |

**No staff-assignment RPCs. No content-block RPCs.**

## Security review

- FORCE RLS on `learning_lessons`; ENABLE on `learning_lesson_settings`; no
  client INSERT/UPDATE/DELETE on either (RPC-only writes); SELECT granted.
- Public/anon SELECT: lesson published+public AND section published+public AND
  course published+public AND program published+public AND space active+public;
  **never** calls `is_platform_admin`. Separate authenticated platform-admin read
  policy.
- Authority inherited from Section/Course; delegated course staff require active
  parent-space membership (revalidated by the Course helpers on every check) --
  stale staff row grants no authority.
- Normal mutations only for draft\|published; suspended/archived -> moderate only.
  Section managers / course leads cannot bypass suspended/archived gates.
- Full 5-level parent gates on every mutation: space active; program
  draft\|published; course draft\|published; section draft\|published. Publishing
  fail-closed when any parent not allowed.
- `section_id` immutable -- no RPC assigns `section_id`; reorder cannot move rows
  across sections (every id constrained to the requested section; full unique set
  required).
- `content_type` is descriptive-only (nullable allowlist) and activates no
  behavior; validated fail-closed on create/update.
- Metadata validators: 8192-byte cap + allowlists (lesson-prefixed duplicates of
  the Sections pattern). Validators revoked from public/anon/authenticated.
- All functions SECURITY DEFINER with `search_path = public`.
- Immutable, append-only audit via `learning_audit_write` with
  actor/space/course/section/lesson attribution:
  `lesson.create|update|publish|archive|moderation|reorder`.

## Tests

Contract tests added: `lib/learning/lessonsFoundation.test.ts` (files/ordering,
constants<->SQL, content_type allowlist, identity/schema + reserved content-block
absence, inherited authority + no staff table, full 5-level parent gates +
lifecycle + timestamp normalization, ordering + cross-section safety,
visibility/public-read, security hardening, audit + inert settings, exclusions,
documentation).

```
npx vitest run lib/learning/spacesFoundation.test.ts \
  lib/learning/programsFoundation.test.ts \
  lib/learning/coursesFoundation.test.ts \
  lib/learning/sectionsFoundation.test.ts \
  lib/learning/lessonsFoundation.test.ts
```

- **PASS** -- 5 test files passed, **156 tests passed** (0 failed).
  - `spacesFoundation.test.ts` (35 tests)
  - `programsFoundation.test.ts` (25 tests)
  - `coursesFoundation.test.ts` (28 tests)
  - `sectionsFoundation.test.ts` (33 tests)
  - `lessonsFoundation.test.ts` (35 tests)
  - vitest v3.2.7, duration ~2.8s.

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
?? docs/learning/implementation/LESSONS_FOUNDATION_V1.md
?? lib/learning/lessonsFoundation.test.ts
?? lib/learning/lessonsFoundation.ts
?? supabase/migrations/20260832_learning_lessons_foundation_v1.sql
```

(Plus modified `docs/ai/CURRENT_TASK.md` and `docs/ai/CURSOR_REPORT.md`; `.next/`
build artifacts are untracked and ignored for review.)

Branch: `office/learning-lessons-foundation-v1` (created from `alpha-0.2` tip).

## Open issues

- Migration not applied to remote Supabase (intentional; pending human approval).
- No commit/push performed; changes remain uncommitted pending human approval.
- Next Learning slice = **Lesson Content / Progress** (content blocks & activities
  within a Lesson) -- not started.

## Verdict

**READY FOR REVIEW -- implementation complete; all mandatory automated verification
passed (`tsc`, five foundation `vitest` suites = 156 passed, `npm run build`,
`git diff --check`).** No fixes were required. No commit, push, merge, or remote
Supabase migration apply was performed. Awaiting human review before any
commit/push and before applying the migration to remote Supabase.
