# UM Learning OS — Enrollments Foundation V1

Status: implemented locally (migration not applied remotely in this phase)

Migration: `supabase/migrations/20260834_learning_enrollments_foundation_v1.sql`

Depends on: `20260828`–`20260833` learning foundations (Spaces → Programs →
Courses → Sections → Lessons → Activities). Directly uses Programs/Courses,
their 1:1 settings, space membership, platform-admin, and audit helpers.

Constants / types: `lib/learning/enrollmentsFoundation.ts`

## Purpose

DB-authoritative foundation for **Enrollments** as **entitlements to
participate** in a Program **XOR** a Course. An enrollment answers exactly one
question — *"is this learner entitled to participate in this program/course right
now?"* — and nothing else.

An enrollment is **NOT** payment, progress, completion percentage, certificate,
attempt, submission, grade, seat/capacity, or space membership. Its lifecycle
(`pending | active | suspended | expired | cancelled | completed`) is **distinct
from content lifecycle** (`draft | published | …`) and **independent of space
membership**.

## Hierarchy / target model

```
Space → Program              (target_type = 'program')
Space → Program → Course     (target_type = 'course')
```

- **Program XOR Course** via two **nullable hard FKs** (`program_id`,
  `course_id`) + a `target_type` discriminator, enforced by the
  `learning_enrollments_target_xor` check (exactly one FK set, matching
  `target_type`).
- **Denormalized `space_id`** (`ON DELETE RESTRICT`) is the authority boundary
  and always equals the target's space.
- `space_id`, `target_type`, `program_id`, `course_id`, `user_id`, `source`, and
  `created_at` are **immutable** after creation (trigger-guarded).

## Scope

| Included | Notes |
| --- | --- |
| `learning_enrollments` | Entitlement row: XOR target, learner, lifecycle, source, soft refs, window, metadata |
| `learning_enrollment_events` | **Append-only** per-enrollment lifecycle log |
| Helpers + RPCs | SECURITY DEFINER; client writes only via RPCs |
| Audit | Via existing `learning_audit_write` |

## Exclusions (out of scope for V1)

Does **not** include payments, pricing, checkout, refunds, progress, completion
tracking, certificates, attempts, submissions, grades, seats/capacity, waitlists,
auto-membership creation, marketplace, booking, calendar, live-session behavior,
AI execution, Learning UI, search indexing, notifications, or any type-specific
engines. Payments/UEOS/bundles are referenced **only** via soft references
(`source` + `source_reference_type` / `source_reference_id`) — there are **no
cross-product foreign keys**.

**Next slice (NOT decided) — likely Progress / Lesson Content / Questions.**
Enrollments is complete; the next Learning slice is not yet chosen.

## Lifecycle

```
create (self)     → active            (enroll_in_learning_program / _course)
create (manager)  → pending | active  (create_learning_enrollment)
pending           → active            (activate)
pending | active  → suspended         (suspend)
suspended         → active            (reinstate)
pending|active|suspended → cancelled  (cancel — learner or manager)
active            → completed         (complete — INERT terminal state)
pending | active  → expired           (expire_due_learning_enrollments — sweep)
* (admin)         → active|suspended|cancelled (moderate — platform_admin)
```

- **Live (non-terminal):** `pending`, `active`, `suspended`.
- **Terminal:** `expired`, `cancelled`, `completed`. Re-enrolling after a
  terminal row creates a **new** row (terminal rows are never revived).
- `complete_learning_enrollment` is **inert**: it records a terminal entitlement
  state only. It does **not** read or write progress/attempt/grade/certificate
  data (none exists in V1).
- Lifecycle timestamps (`activated_at`, `suspended_at`, `expired_at`,
  `cancelled_at`, `completed_at`) are normalized by the RPCs.

## One live enrollment per learner per target

Two **partial unique indexes** enforce at most one live enrollment per learner
per target on the non-terminal set (`pending | active | suspended`):

- `learning_enrollments_one_live_program_uidx (user_id, program_id)`
- `learning_enrollments_one_live_course_uidx (user_id, course_id)`

Every RPC that creates or revives a live row (`enroll_*`, `create_*`,
`reinstate`, `moderate → active`) **also** guards this invariant defensively
before writing, so the error surfaces as a clear message rather than a raw
constraint violation.

## Sources (immutable provenance allowlist)

`source` is **required**, **immutable**, and drawn from a fail-closed allowlist
of **10** values:

```
self_enrollment | invitation | admin_assignment | institution_assignment |
corporate_assignment | scholarship | voucher | gift | bundle | migration
```

- `self_enrollment` is **reserved** for the learner-driven `enroll_in_*` RPCs.
- `create_learning_enrollment` (manager path) accepts any allowlisted source
  **except** `self_enrollment` (9 assignable sources).

## Soft references (no cross-product FKs)

Payments, UEOS, vouchers, and bundles are linked only through:

- `source` (provenance category), plus
- `source_reference_type` (≤ 80 chars) and `source_reference_id` (≤ 128 chars).

There are **no** foreign keys into Store/UEOS/payments tables. This keeps
Learning independent of other product schemas and avoids cross-product coupling.

## Entitlement helpers (evaluated LIVE)

Access is evaluated **live**, never cached:

- `has_learning_program_access(program_id, user)` → platform admin **or** program
  manager **or** an **`active`** enrollment currently **inside its start/expiry
  window**.
- `has_learning_course_access(course_id, user)` → platform admin **or** course
  manager **or** an `active` course enrollment inside its window.

Managers/admins implicitly have access (no enrollment row required).

## Enroll eligibility (uses existing settings flags)

Self-enrollment reuses the **existing** program/course settings flags — no new
flags are introduced:

- `can_enroll_in_learning_program` → program `published`, space `active`,
  `allow_self_enroll = true`; **`require_space_membership`** is an **enroll-time
  precondition** (revalidated live via `is_learning_space_member`), not an
  ongoing coupling.
- `can_enroll_in_learning_course` → course + program `published`, space `active`,
  `allow_self_enroll = true`; **`require_program_enrollment`** is satisfied by
  live `has_learning_program_access`.

Membership and enrollment stay **independent**: `require_*` gate the *act* of
enrolling, but an active enrollment never depends on continued membership.

## Manage authority

`can_manage_learning_enrollment(enrollment_id, user)` → platform admin **or**
manager of the target program (`can_manage_learning_program`) / course
(`can_manage_learning_course`). Delegated managers are membership-revalidated by
those underlying helpers, so a stale staff row grants no authority.

## RPCs

| RPC | Who | Notes |
| --- | --- | --- |
| `enroll_in_learning_program` | learner (self) | `self_enrollment`; requires eligibility; → `active` |
| `enroll_in_learning_course` | learner (self) | `self_enrollment`; requires eligibility; → `active` |
| `create_learning_enrollment` | program/course manager | assignable source (not `self_enrollment`); `pending`\|`active`; optional window + soft refs |
| `activate_learning_enrollment` | manager | `pending` → `active` |
| `suspend_learning_enrollment` | manager | `pending`\|`active` → `suspended` |
| `reinstate_learning_enrollment` | manager | `suspended` → `active` (guards live invariant) |
| `cancel_learning_enrollment` | learner or manager | live → `cancelled` |
| `complete_learning_enrollment` | manager | `active` → `completed` (inert) |
| `moderate_learning_enrollment` | platform admin | `active`\|`suspended`\|`cancelled` |
| `expire_due_learning_enrollments` | platform admin | bounded sweep of due `expires_at` → `expired` |

All RPCs are `SECURITY DEFINER` with `search_path = public`, revoke
`public`/`anon`, and grant execute to `authenticated, service_role`.

## RLS & visibility — NO anon

There is **NO anonymous / public SELECT policy** and **no `anon` table grant** —
enrollments (learner entitlements) are never exposed anonymously. Because there
is no anon path, `is_platform_admin()` is only ever reachable from authenticated
policies (consistent with the Activities hardening lesson).

| Table | RLS | SELECT (authenticated only) |
| --- | --- | --- |
| `learning_enrollments` | ENABLE + **FORCE** | learner reads own; program/course managers read in scope; platform admin reads all |
| `learning_enrollment_events` | ENABLE + **FORCE** | same read model (learner-own / scoped-manager / admin) |

No client `INSERT`/`UPDATE`/`DELETE` on either table — **RPC-only writes**.

## Append-only events

`learning_enrollment_events` records one row per transition
(`created | activated | suspended | reinstated | cancelled | completed |
moderated | expired`). `UPDATE`/`DELETE` are blocked by triggers
(`learning_enrollment_events_forbid_mutation`); inserts happen only through the
internal `learning_enrollment_event_write` (revoked from all clients).

## Metadata & bounds

- `metadata` — bounded JSON object: ≤ **4096** bytes, ≤ **32** top-level keys,
  depth ≤ **2**, arrays ≤ **64** scalar items, strings ≤ **512** chars
  (`learning_enrollment_validate_metadata`). Never store
  payments/progress/certificates/PII dumps.
- `source_reference_type` ≤ 80 chars; `source_reference_id` ≤ 128 chars.
- Window sanity: `expires_at > starts_at` when both present.

## Audit actions

Via `learning_audit_write` with actor / space / target attribution:
`enrollment.create`, `enrollment.activate`, `enrollment.suspend`,
`enrollment.reinstate`, `enrollment.cancel`, `enrollment.complete`,
`enrollment.moderation`, `enrollment.expire`.

## Security summary

- ENABLE + **FORCE RLS** on both tables; client I/U/D revoked (RPC-only writes);
  SELECT granted to `authenticated` only.
- **No anonymous SELECT policy and no `anon` grant** — entitlements are never
  exposed to anonymous clients. `is_platform_admin()` only ever called from
  authenticated policies.
- Program **XOR** Course enforced by check; soft refs only (no cross-product
  FKs). `space_id`/`target_type`/`program_id`/`course_id`/`user_id`/`source`/
  `created_at` immutable (trigger).
- One live enrollment per learner per target (partial unique indexes + defensive
  RPC guards).
- Entitlement evaluated **live** (`active` + within window); managers/admins
  implicit. Membership/enrollment independent; `require_*` are enroll-time
  preconditions only.
- All functions `SECURITY DEFINER` + `search_path = public`; internal validators
  and the event writer revoked from `public`/`anon`/`authenticated`.
- Append-only event log (update/delete blocked by trigger) plus immutable
  `learning_audit_write` audit trail.
- `complete` is inert (no progress/grade/certificate coupling); no payment,
  progress, or certificate tables/objects are created.
