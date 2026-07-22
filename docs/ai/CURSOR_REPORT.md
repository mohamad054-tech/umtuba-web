# Cursor Report

## Summary

Implemented **UM Learning OS Courses Foundation V1** on branch
`office/learning-courses-foundation-v1` (from `alpha-0.2`).

Hierarchy **Space → Program → Course**. Course is a reusable educational unit
under exactly one Program (RESTRICT). No course format column (format stays on
Program). Space remains hard authority — no ownership transfer.

Delivered: migration (tables, helpers, FORCE RLS, validators, RPCs, grants),
TS constants/types, contract tests, implementation doc, and AI handoff updates.

**No commit, push, merge, or remote Supabase migration apply.**

## Exact files changed

| Path | Action |
| --- | --- |
| `supabase/migrations/20260830_learning_courses_foundation_v1.sql` | created |
| `lib/learning/coursesFoundation.ts` | created |
| `lib/learning/coursesFoundation.test.ts` | created |
| `docs/learning/implementation/COURSES_FOUNDATION_V1.md` | created |
| `docs/ai/CURRENT_TASK.md` | updated |
| `docs/ai/CURSOR_REPORT.md` | updated |

## Migrations created

- `supabase/migrations/20260830_learning_courses_foundation_v1.sql`
  - **Not applied** to remote Supabase in this phase.

### Schema summary

- `learning_courses` — `program_id` RESTRICT; slug unique per program; status;
  visibility; **position ≥ 0**; languages; foundation scalars/flags; JSON metadata;
  timestamps (`published_at` / `suspended_at` / `archived_at`). **No format column.**
- `learning_course_staff` — roles: lead_instructor / instructor / teaching_assistant /
  content_editor; status active|removed; unique (course_id, user_id).
- `learning_course_settings` — 1:1; `allow_self_enroll=false`,
  `require_program_enrollment=true`, `public_syllabus=false`.

### RPCs

| RPC | Purpose |
| --- | --- |
| `create_learning_course` | draft create; append position; auto lead for non-managers |
| `update_learning_course` | metadata update (draft\|published only) |
| `assign_learning_course_staff` / `remove_learning_course_staff` | staff + peer protection |
| `publish_learning_course` / `archive_learning_course` | lifecycle |
| `moderate_learning_course` | platform admin suspended\|published\|archived |
| `reorder_learning_courses` | transactional positions `0..n-1` within program |

### Security review

- FORCE RLS on `learning_courses` + `learning_course_staff`; no client writes.
- Public/anon SELECT: course published+public ∩ program published+public ∩
  space active+public; **never** calls `is_platform_admin`.
- Staff authority requires active course staff row **and** active space membership
  (revalidated every check).
- Peer-rank protection on staff removal; space owner/admin overrides.
- Normal mutations only for draft\|published; suspended/archived → moderate only.
- Parent gates: space active; program draft\|published.
- Metadata validators: 8192-byte cap + allowlists (course-prefixed duplicates of
  Programs pattern).
- Validators revoked from public/anon/authenticated; RPCs granted authenticated +
  service_role.

## Tests

```
npx vitest run lib/learning/spacesFoundation.test.ts \
  lib/learning/programsFoundation.test.ts \
  lib/learning/coursesFoundation.test.ts
```

- **Test Files:** 3 passed
- **Tests:** 88 passed (spaces 35 + programs 25 + courses 28)
- vitest.config already includes `lib/learning/**/*.test.ts` — unchanged

## TypeScript

```
npx tsc --noEmit
```

- **PASS** (exit 0)

## Build

```
npm run build
```

- **PASS** (exit 0) — Next.js 16.2.10 compiled successfully

## git diff --check

- **PASS** (exit 0; no whitespace errors)

## git status --short

```
 M docs/ai/CURRENT_TASK.md
 M docs/ai/CURSOR_REPORT.md
?? docs/learning/implementation/COURSES_FOUNDATION_V1.md
?? lib/learning/coursesFoundation.test.ts
?? lib/learning/coursesFoundation.ts
?? supabase/migrations/20260830_learning_courses_foundation_v1.sql
```

Branch: `office/learning-courses-foundation-v1` (ahead of nothing committed locally)

## Open issues

- Migration not applied to remote Supabase (intentional).
- No commit/push pending human approval.
- Next Learning slice (sections/lessons or enrollments) not started.

## Verdict

**READY FOR REVIEW**
