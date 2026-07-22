# Cursor Report

## Summary

Completed, verified, committed, pushed, and **fast-forward merged into
`alpha-0.2`** the **UM Learning OS Enrollments Foundation V1** on branch
`office/learning-enrollments-foundation-v1`.

An enrollment is an **ENTITLEMENT to participate** in a Program **XOR** a Course.
It is **not** payment, progress, completion percentage, certificate, attempt,
submission, grade, seat/capacity, or space membership. Its lifecycle
(`pending | active | suspended | expired | cancelled | completed`) is **distinct
from content lifecycle** and **independent of space membership**.

Delivered: migration (`learning_enrollments` with Program XOR Course via nullable
hard FKs + `target_type` + denormalized `space_id`; append-only
`learning_enrollment_events`; immutable 10-source provenance allowlist; soft refs
for payments/UEOS with no cross-product FKs; one live enrollment per learner per
target via partial unique indexes; live entitlement helpers; enroll/manage
helpers reusing existing settings flags; SECURITY DEFINER RPCs; FORCE RLS; **no
anon**), TS constants/types, contract tests, implementation doc, and AI handoff
updates.

**CRITICAL:** there is **NO anonymous/public SELECT policy** and **no `anon`
table grant**. Both tables grant SELECT to `authenticated` only, so
`is_platform_admin()` is only ever reachable from authenticated policies.

> **Environment note:** the Windows sandbox helper is non-functional on this
> machine (`Sandbox policy 'workspace_readwrite' is not supported`). All shell
> commands were run with the sandbox disabled (full permissions), as authorized.

> **Verification COMPLETE (this session).** `tsc --noEmit`, the seven foundation
> `vitest` suites (**241 tests**), `npm run build`, and `git diff --check` all
> passed. The pre-existing migration + TS module already matched the approved
> architecture; the test, doc, and handoff files were added to complete the
> slice. No fixes to the migration were required.

## Exact files changed

| Path | Action |
| --- | --- |
| `supabase/migrations/20260834_learning_enrollments_foundation_v1.sql` | created (pre-existing; verified) |
| `lib/learning/enrollmentsFoundation.ts` | created (pre-existing; verified) |
| `lib/learning/enrollmentsFoundation.test.ts` | created (this session) |
| `docs/learning/implementation/ENROLLMENTS_FOUNDATION_V1.md` | created (this session) |
| `docs/ai/CURRENT_TASK.md` | updated |
| `docs/ai/CURSOR_REPORT.md` | updated |

## Migrations created

- `supabase/migrations/20260834_learning_enrollments_foundation_v1.sql`
  - Ordered **after** Activities (`20260833`). Depends on
    `20260828`–`20260833` (Spaces → Programs → Courses → Sections → Lessons →
    Activities); directly uses Programs/Courses + their 1:1 settings, space
    membership, platform-admin, and audit helpers.
  - **Not applied** to remote Supabase (Git-only; intentional).

### Schema summary

- `learning_enrollments` — **Program XOR Course** via nullable hard FKs
  (`program_id`/`course_id`, RESTRICT) + `target_type` + denormalized `space_id`
  (RESTRICT); `user_id` (RESTRICT); lifecycle
  (`pending|active|suspended|expired|cancelled|completed`); immutable `source`
  (10-value allowlist); soft refs `source_reference_type` (≤80) /
  `source_reference_id` (≤128); `starts_at`/`expires_at` window
  (`expires_at > starts_at`); lifecycle timestamps; bounded `metadata`
  (≤4096 bytes / ≤32 keys / depth ≤2). XOR check; window check. Immutability
  trigger guards `space_id`/`target_type`/`program_id`/`course_id`/`user_id`/
  `source`/`created_at`. **Two partial unique indexes** enforce one live
  enrollment per learner per target on `pending|active|suspended`.
- `learning_enrollment_events` — **append-only** lifecycle log
  (`created|activated|suspended|reinstated|cancelled|completed|moderated|
  expired`); update/delete blocked by trigger; inserts only via internal writer.

## Helpers

- `can_manage_learning_enrollment` → platform admin **or**
  `can_manage_learning_program` / `can_manage_learning_course` for the target
  (membership-revalidated by those helpers).
- `has_learning_program_access` / `has_learning_course_access` → live
  entitlement: platform admin **or** manager **or** an `active` enrollment inside
  its start/expiry window (never cached).
- `can_enroll_in_learning_program` / `_course` → published target + active space
  + `allow_self_enroll`; `require_space_membership` / `require_program_enrollment`
  are enroll-time preconditions (revalidated live).
- Internal (revoked from public/anon/authenticated):
  `learning_enrollment_validate_metadata`,
  `learning_enrollment_validate_source`, `learning_enrollment_event_write`.

## RPCs

| RPC | Purpose |
| --- | --- |
| `enroll_in_learning_program` / `enroll_in_learning_course` | learner self-enroll (`self_enrollment` → `active`) |
| `create_learning_enrollment` | manager assignment (assignable source, `pending`\|`active`, optional window + soft refs) |
| `activate_` / `suspend_` / `reinstate_` / `cancel_` / `complete_` | lifecycle transitions (cancel allowed to learner or manager; complete is **inert**) |
| `moderate_learning_enrollment` | platform admin (`active`\|`suspended`\|`cancelled`) |
| `expire_due_learning_enrollments` | platform-admin bounded sweep → `expired` |

**No payment/progress/certificate/attempt/submission/grade RPCs.**

## Security review

- ENABLE + **FORCE RLS** on both tables; no client INSERT/UPDATE/DELETE
  (RPC-only writes); SELECT granted to `authenticated` only.
- **No anonymous SELECT policy and no `anon` table grant** — entitlements are
  never exposed anonymously. `is_platform_admin()` only ever reached from
  authenticated policies.
- Read model (both tables): learner reads own; program/course managers read in
  scope; platform admin reads all.
- Program **XOR** Course enforced by check; **soft refs only** (no cross-product
  FKs into Store/UEOS/payments). Identity/provenance columns immutable (trigger).
- One live enrollment per learner per target (partial unique indexes + defensive
  RPC guards on every create/revive path).
- Entitlement evaluated **live** (`active` + within window); managers/admins
  implicit. Membership/enrollment independent; `require_*` are enroll-time
  preconditions only.
- All functions SECURITY DEFINER + `search_path = public`; validators + event
  writer revoked from `public`/`anon`/`authenticated`.
- Append-only event log (update/delete blocked) + immutable `learning_audit_write`
  trail: `enrollment.create|activate|suspend|reinstate|cancel|complete|
  moderation|expire`.
- `complete` is inert (no progress/grade/certificate coupling); no
  payment/progress/certificate tables or objects created.

## Tests

Contract tests `lib/learning/enrollmentsFoundation.test.ts` (files/ordering,
enums↔SQL, target XOR + soft refs, one-live-per-target, immutability +
append-only events, helpers + live entitlement, lifecycle RPCs, security
hardening/no-anon, RLS read model, metadata/bounds, audit + table inventory,
documentation).

```
npx vitest run lib/learning/spacesFoundation.test.ts \
  lib/learning/programsFoundation.test.ts \
  lib/learning/coursesFoundation.test.ts \
  lib/learning/sectionsFoundation.test.ts \
  lib/learning/lessonsFoundation.test.ts \
  lib/learning/activitiesFoundation.test.ts \
  lib/learning/enrollmentsFoundation.test.ts
```

- **PASS** — 7 test files passed, **241 tests passed** (0 failed).
  - `enrollmentsFoundation.test.ts` (39 tests) + the six prior foundation suites.
  - vitest v3.2.7.

## TypeScript

```
npx tsc --noEmit
```

- **PASS** — no type errors (exit 0).

## Build

```
npm run build
```

- **PASS** — Next.js 16.2.10 (Turbopack) compiled successfully; TypeScript step
  passed; 59/59 static pages generated; exit 0.

## git diff --check

- **PASS** — no whitespace/conflict errors (exit 0).

## git status --short

Clean after commit + fast-forward merge (see commit hashes in the delivery
report). Only the six enrollments files were staged into the commit.

Branch: `office/learning-enrollments-foundation-v1` → fast-forward merged into
`alpha-0.2`.

## Open issues

- Migration **not** applied to remote Supabase (intentional; Git-only —
  `20260828`–`20260834`). Pending human approval for any remote apply.
- Next Learning slice is **NOT decided** — likely **Progress**, **Lesson
  Content**, or **Questions**. Enrollments V1 is complete.

## Verdict

**COMPLETE — implemented, verified (`tsc`, 7 foundation `vitest` suites = 241
passed, `npm run build`, `git diff --check`), committed trailer-free, pushed, and
fast-forward merged into `alpha-0.2`.** No `--no-ff`/merge commit, no force push,
no remote Supabase migration apply.
