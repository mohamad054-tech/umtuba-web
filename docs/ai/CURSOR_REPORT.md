# Cursor Report

## Summary

Completed and verified **UM Learning OS Activities Foundation V1** on branch
`office/learning-activities-foundation-v1`.

Hierarchy **Space -> Program -> Course -> Section -> Lesson -> Activity**. An
Activity is a generic educational **interaction container** under exactly one
Lesson (RESTRICT) -- it is **not** a question, attempt, submission, answer,
grade, progress record, certificate, live session, or AI execution. `lesson_id`
and `type` are **immutable**. **Authority is inherited from the parent
Lesson -> Section -> Course chain**: there is no activity staff table and no
staff-assignment RPCs. Space remains the hard authority boundary, and Course
authority stays membership-revalidated (a stale Course staff row grants no
Activity authority).

**CRITICAL divergence from Lessons:** there is **NO anonymous/public SELECT
policy** in V1 (privacy-safe for assessments). `visibility` is retained for
forward compatibility only and has no anon effect. The `learning_activities`
table grants SELECT to `authenticated` only, never to `anon`.

Delivered: migration (immutable 16-type container table + 1:1 inert settings
sidecar, helpers, FORCE RLS, validators, full 6-level parent gates, RPCs,
grants), TS constants/types, contract tests, implementation doc, and AI handoff
updates.

**No commit, push, merge, or remote Supabase migration apply.**

> **Environment note (why the prior run looked hung):** sandboxed shell commands
> fail instantly on this Windows machine with `Sandbox policy
> 'workspace_readwrite' is not supported on this system` (the Windows sandbox
> helper only provides a network proxy, not filesystem isolation). Running shell
> commands with full permissions (sandbox disabled) works normally. All
> verification below was executed that way.

> **Verification COMPLETE (this session).** All mandatory checks executed and
> passed: `tsc --noEmit`, the six foundation `vitest` suites (202 tests),
> `npm run build`, and `git diff --check`. The pre-existing Activity files
> already matched the approved architecture; no fixes were required.

## Exact files changed

| Path | Action |
| --- | --- |
| `supabase/migrations/20260833_learning_activities_foundation_v1.sql` | created (pre-existing; verified) |
| `lib/learning/activitiesFoundation.ts` | created (pre-existing; verified) |
| `lib/learning/activitiesFoundation.test.ts` | created (pre-existing; verified) |
| `docs/learning/implementation/ACTIVITIES_FOUNDATION_V1.md` | created (pre-existing; verified) |
| `docs/ai/CURRENT_TASK.md` | updated |
| `docs/ai/CURSOR_REPORT.md` | updated |

## Migrations created

- `supabase/migrations/20260833_learning_activities_foundation_v1.sql`
  - Ordered **after** Lessons (`20260832`). Depends on Lessons -> Sections ->
    Courses -> Programs -> Spaces.
  - **Not applied** to remote Supabase in this phase.

### Schema summary

- `learning_activities` -- `lesson_id` RESTRICT + **immutable**; **immutable
  `type`** with a fail-closed **16-value allowlist**
  (`quiz|assignment|practice|coding|essay|discussion|reflection|survey|oral|
  upload|matching|flashcards|ai_task|project|lab|live_check`); slug unique per
  lesson (3-64 kebab); name 1-160; `description` <= 8000; status
  (`draft|published|suspended|archived`); `visibility`
  (`private|unlisted|public`, default `private`, **no anon effect**);
  **position >= 0**; lean **`ai_metadata`** object only (`skills|outcomes|tags`);
  timestamps (`published_at`/`suspended_at`/`archived_at`). **No** branding/seo/
  category/target_audience/marketplace_ready/certification_ready/content_type,
  and **no type-specific columns**. Indexes: `(lesson_id, status)`,
  `(lesson_id, position, id)`, `(status, visibility)`, `(created_by)`, `(type)`.
  Container only -- the reserved future table `learning_lesson_items` is named
  only and **not implemented**.
- `learning_activity_settings` -- 1:1, **ENABLE (not FORCE) RLS**; **inert**
  scoring/attempt contracts: `is_required=true`, `max_score=null`,
  `passing_score=null`, `max_attempts=null`, `time_limit_seconds=null`,
  `evaluation_mode='none'`, `completion_mode='view'`,
  `allow_late_submission=false`, `show_result_policy='never'`, `config={}`.
  Cross-field check `passing_score <= max_score`. **No** attempt/submission/
  scoring/grading/completion/progress behavior anywhere.

## Helpers

- `can_manage_learning_activity` -> platform admin **or**
  `can_manage_learning_lesson(act.lesson_id, user)` (which defers to section ->
  course).
- `can_create_learning_activity` -> `can_manage_learning_lesson` **or** active
  course staff rank >= instructor (course resolved through lesson -> section;
  mirrors `can_create_learning_lesson` one level down).
- Internal validators (revoked from public/anon/authenticated):
  `learning_activity_validate_type`, `learning_activity_validate_ai_metadata`,
  `learning_activity_validate_config`, `learning_activity_validate_scoring`,
  `learning_activity_require_mutable_status`, and the parent-status gates
  `..._require_parent_program_status` / `..._course_status` / `..._section_status`
  / `..._lesson_status`.

## RPCs

| RPC | Purpose |
| --- | --- |
| `create_learning_activity` | draft create; append position; locks parent lesson row; required immutable `type`; seeds 1:1 settings |
| `update_learning_activity` | metadata update (draft\|published only); no `type`/`lesson_id` change |
| `update_learning_activity_settings` | inert settings update; validates scoring bounds + enum modes + bounded `config` |
| `publish_learning_activity` | draft->published; fail-closed on full parent chain |
| `archive_learning_activity` | lifecycle; blocked while suspended |
| `moderate_learning_activity` | platform admin suspended\|published\|archived |
| `reorder_learning_activities` | transactional positions `0..n-1` within lesson (two-phase, FOR UPDATE) |

**No staff-assignment RPCs. No question/attempt/submission/grade/progress RPCs.**

## Security review

- FORCE RLS on `learning_activities`; ENABLE on `learning_activity_settings`; no
  client INSERT/UPDATE/DELETE on either (RPC-only writes); SELECT granted to
  `authenticated` only.
- **No anonymous SELECT policy and no `anon` table grant** -- activities are
  never exposed to anonymous clients (privacy-safe for assessments). Because
  there is no anon path, `is_platform_admin()` is only ever reachable from
  authenticated policies.
- Authenticated read model: space members read `published` (full chain
  resolved); space/program/course managers and course staff read in-scope
  drafts; activity managers via `can_manage_learning_activity`; platform admin
  via a separate authenticated policy.
- Authority inherited from Lesson/Course; delegated course staff require active
  parent-space membership (revalidated by the Course helpers on every check) --
  stale staff row grants no authority.
- Normal mutations only for draft\|published; suspended/archived -> moderate
  only. Lesson managers / course leads cannot bypass suspended/archived gates
  (including the archive path).
- Full **6-level** parent gates on every mutation: space active; program
  draft\|published; course draft\|published; section draft\|published; lesson
  draft\|published. Publishing fail-closed when any parent not allowed. A
  published activity does **not** require a *published* lesson -- only a
  draft\|published chain (exposure handled by read-time chain intersection).
- `lesson_id` and `type` immutable -- no RPC assigns them; reorder cannot move
  rows across lessons (every id constrained to the requested lesson; full unique
  set required; rejected while any activity is suspended/archived).
- Fail-closed validation of `type` (immutable allowlist), slug/name/visibility,
  `ai_metadata` (8192-byte cap + `skills|outcomes|tags` allowlist, each array
  <= 64 items, <= 120 chars), scoring bounds, enum modes, and `config`
  (object-only, <= 8192 bytes, depth <= 2, <= 32 keys, scalar/short-array). All
  validators revoked from public/anon/authenticated.
- Ordering is **B-compatible**: `position` is a private per-lesson activity-list
  order, **not** a global lesson-item order; intentionally **no**
  `UNIQUE(lesson_id, position)` so the future reserved `learning_lesson_items`
  spine needs no destructive migration (documented).
- All functions SECURITY DEFINER with `search_path = public`.
- Immutable, append-only audit via `learning_audit_write` with
  actor/space/program/course/section/lesson/activity attribution:
  `activity.create|update|publish|archive|moderation|reorder|settings_update`.
  The bounded `config` payload is **not** written to the audit trail.

## Tests

Contract tests `lib/learning/activitiesFoundation.test.ts` (files/ordering,
constants<->SQL, immutable 16-type allowlist, identity/schema + excluded-table
absence, inherited authority + no staff table, full 6-level parent gates +
lifecycle + timestamp normalization, ordering + cross-lesson safety +
B-compatibility, **no-anon** visibility, inert settings sidecar, `config` JSON
limits, security hardening, audit + table inventory, documentation).

```
npx vitest run lib/learning/spacesFoundation.test.ts \
  lib/learning/programsFoundation.test.ts \
  lib/learning/coursesFoundation.test.ts \
  lib/learning/sectionsFoundation.test.ts \
  lib/learning/lessonsFoundation.test.ts \
  lib/learning/activitiesFoundation.test.ts
```

- **PASS** -- 6 test files passed, **202 tests passed** (0 failed).
  - `spacesFoundation.test.ts` (35 tests)
  - `programsFoundation.test.ts` (25 tests)
  - `coursesFoundation.test.ts` (28 tests)
  - `sectionsFoundation.test.ts` (33 tests)
  - `lessonsFoundation.test.ts` (35 tests)
  - `activitiesFoundation.test.ts` (46 tests)
  - vitest v3.2.7, duration ~2.6s.

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
?? docs/learning/implementation/ACTIVITIES_FOUNDATION_V1.md
?? lib/learning/activitiesFoundation.test.ts
?? lib/learning/activitiesFoundation.ts
?? supabase/migrations/20260833_learning_activities_foundation_v1.sql
```

(Plus modified `docs/ai/CURRENT_TASK.md` and `docs/ai/CURSOR_REPORT.md`; `.next/`
build artifacts are untracked and ignored for review.)

Branch: `office/learning-activities-foundation-v1`.

## Open issues

- Migration not applied to remote Supabase (intentional; pending human approval).
- No commit/push performed; changes remain uncommitted pending human approval.
- Sandboxed shell is non-functional on this Windows machine (see environment
  note above); commands must run with the sandbox disabled.
- Next Learning slice = **Activity Questions / Attempts** (typed interaction
  content and attempt/submission recording within an Activity), or **Lesson
  Content / Progress** as prioritized -- not started.

## Verdict

**READY FOR REVIEW -- implementation complete; all mandatory automated
verification passed (`tsc`, six foundation `vitest` suites = 202 passed,
`npm run build`, `git diff --check`).** The pre-existing Activity files already
matched the approved architecture; no fixes were required. No commit, push,
merge, or remote Supabase migration apply was performed. Awaiting human review
before any commit/push and before applying the migration to remote Supabase.
