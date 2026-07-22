# UM Learning OS — Activities Foundation V1

Status: implemented locally (migration not applied remotely in this phase)

Migration: `supabase/migrations/20260833_learning_activities_foundation_v1.sql`

Depends on: `20260832_learning_lessons_foundation_v1.sql` (and Sections/Courses/Programs/Spaces via Lessons)

Constants / types: `lib/learning/activitiesFoundation.ts`

## Purpose

DB-authoritative foundation for **Activities** as generic educational
**interaction containers** under a Lesson: an immutable typed slot, lifecycle,
visibility (no anon effect), ordering within the lesson, a lean `ai_metadata`
surface, an inert scoring/attempt **settings sidecar**, RPC writes, RLS, and
audit — without any questions, banks, answers, attempts, submissions, grades,
rubrics, evaluation engines, progress, completion behavior, live behavior, AI
execution, or UI.

An **Activity is a container**, not an interaction result. It is **not** a
question, attempt, submission, answer, grade, progress record, certificate, live
session, or AI execution. It only names a typed interaction slot under exactly
one Lesson; all behavior is deferred to later normalized child tables.

## Hierarchy

```
Space → Program → Course → Section → Lesson → Activity
```

- Every activity has required `lesson_id` (`ON DELETE RESTRICT`).
- `lesson_id` is **immutable** — it cannot change via `update` or `reorder`.
- `type` is **immutable** — set once at create; no RPC accepts a new type.
- Activity is a **container** under exactly one Lesson — not questions/attempts/
  submissions/answers/grades/progress/certificate/live/AI execution.
- **Authority is inherited from the Lesson → Section → Course chain.** There is
  **no** activity staff table.
- **Space remains the hard authority boundary.** Course authority stays
  membership-revalidated (a stale course staff row grants nothing).

## Scope

| Included | Notes |
| --- | --- |
| `learning_activities` | Belong to exactly one lesson; immutable `type`; lifecycle; `ai_metadata`; `position` |
| `learning_activity_settings` | 1:1 inert scoring/attempt fields + bounded `config` |
| Helpers + RPCs | SECURITY DEFINER; client writes only via RPCs |
| Audit | Via existing `learning_audit_write` |

## Exclusions (out of scope for V1)

Does not include questions, question banks, answers, attempts, submissions,
grades, rubrics, auto-evaluation engines, teacher workflows, coding execution,
file storage, AI execution, progress, completion behavior, certificates,
enrollments, payments, marketplace, booking, calendar, live-session behavior,
Learning UI, search indexing, notifications, `learning_lesson_items`, or any
type-specific engines.

The reserved future table `learning_lesson_items` is **named only** as a
contract; it is **not implemented** here.

**Next slice = Activity Questions / Attempts (typed interaction content and
attempt/submission recording within an Activity), or Lesson Content / Progress
as prioritized.**

## Immutable activity type

`type` is **required** at create and drawn from an immutable allowlist of **16**
values; unknown values **fail closed**:

```
quiz | assignment | practice | coding | essay | discussion | reflection |
survey | oral | upload | matching | flashcards | ai_task | project | lab |
live_check
```

- There are **no type engines** and **no type-specific columns** on the table.
- No questions/rubrics/answers/attempts are stored on the activity row.
- `type` is validated on create (`learning_activity_validate_type`) and **never**
  mutated afterward (no RPC assigns `type`).

## Authority model (inherited, no staff table)

- There is **no `learning_activity_staff`** and **no staff-assignment RPCs**.
- `can_manage_learning_activity(activity_id, user)` → platform admin **or**
  `can_manage_learning_lesson(lesson_id, user)` (which defers to
  `can_manage_learning_section` → `can_manage_learning_course`).
- `can_create_learning_activity(lesson_id, user)` → `can_manage_learning_lesson`
  **or** active course staff with rank ≥ instructor (resolved via
  lesson → section → course).
- The course helpers (`is_learning_course_staff`, `learning_course_staff_role`,
  and the lead path of `can_manage_learning_course`) revalidate **active
  parent-space membership** on every check. A stale/active course staff row whose
  owner has lost active space membership therefore grants **no** activity
  authority.

## Parent gates (full 6-level chain)

Every activity mutation revalidates the full chain:

| Parent | Required for normal activity mutations |
| --- | --- |
| Space | `status = 'active'` |
| Program | `status in ('draft', 'published')` — not suspended/archived |
| Course | `status in ('draft', 'published')` — not suspended/archived |
| Section | `status in ('draft', 'published')` — not suspended/archived |
| Lesson | `status in ('draft', 'published')` — not suspended/archived |
| Actor | authority inherited from Lesson/Course/Space (delegated staff needs active space membership) |

No mutation is allowed under a suspended/archived Lesson, Section, Course,
Program, or Space. **Publishing fails closed** when any parent is not in an
allowed state.

**A published activity does NOT require a *published* lesson** — it only requires
the lesson (and rest of the chain) to be `draft|published`. Actual exposure is
handled by chain intersection at read time (the same rule Lessons apply to
Sections).

## Lifecycle

```
create → draft
draft --publish_learning_activity--> published
published|draft --archive_learning_activity--> archived
* --moderate_learning_activity--> suspended | published | archived  (platform_admin)
```

| Status | Normal mutations (update / settings / archive / reorder) |
| --- | --- |
| `draft` | Allowed for authorized actors |
| `published` | Metadata/settings allowed for authorized actors |
| `suspended` | **Rejected** — platform `moderate_learning_activity` only |
| `archived` | **Rejected** — platform moderate only |

Lesson managers / course leads cannot bypass suspended/archived gates.

### Timestamp normalization

- **publish:** `published_at` set; `suspended_at` and `archived_at` cleared
- **archive (RPC):** `archived_at` set; `suspended_at` cleared (blocked if currently suspended)
- **moderate → suspended:** `suspended_at` set; `archived_at` cleared
- **moderate → published:** `published_at` coalesce; `suspended_at` and `archived_at` cleared
- **moderate → archived:** `archived_at` coalesce; `suspended_at` cleared

## Create permission

Allowed when, for the target lesson:

- `can_manage_learning_lesson` (lesson/section/course manage / platform admin), **or**
- active course staff with rank ≥ instructor (space membership revalidated).

## Ordering (within the lesson) — A→B compatibility decision

- `position` is an integer **order within the parent lesson's activity list for
  V1** — non-negative; deterministic (`position`, then `id`).
- New activities append at `max(position)+1`.
- `reorder_learning_activities(lesson_id, activity_ids[])` rewrites positions to
  `0..n-1` transactionally; requires the full **unique** set of activity ids for
  that lesson.
- The parent lesson row is locked `FOR UPDATE`; a **two-phase offset** update
  avoids the non-negative check conflict during the swap.
- **Cross-lesson reorder is prevented:** every id must belong to the lesson, and
  only that lesson's rows are touched. `lesson_id` is never changed.
- Reorder is rejected while any activity in the lesson is suspended/archived.

### Why "order within the lesson's activity list", not a global order

`position` here is **NOT** a global lesson-item order across mixed content
(future lesson content blocks + activities). There is intentionally **no**
`UNIQUE(lesson_id, position)` constraint, because a later reserved table,
**`learning_lesson_items`** (Plan **B**, *not implemented* in V1), will own the
authoritative cross-content ordering of everything under a Lesson.

- **Plan A (this slice):** activities keep a private, per-lesson `position`
  scoped to the activities list only. This is enough to render and reorder the
  activity list today.
- **Plan B (future):** `learning_lesson_items` becomes the single ordered spine
  for all lesson children; activity `position` remains valid as a stable
  intra-type ordering input and does not conflict with the item spine.

Keeping `position` non-unique and per-lesson makes the V1 model **B-compatible**:
introducing `learning_lesson_items` later requires no rewrite of activity
positions and no destructive migration of existing rows.

## Foundation metadata (lean container)

- `ai_metadata` JSON object only. Allowlisted keys: `skills`, `outcomes`, `tags`
  (each an array ≤ 64 strings, each ≤ 120 chars). Serialized ≤ **8192** bytes.
- **No** `branding_metadata` / `seo_metadata` / `category` / `target_audience` /
  `marketplace_ready` / `certification_ready` and **no** descriptive
  `content_type` — activities are a lean container; those surfaces stay on their
  owning entities.

## Settings sidecar (reserved / inert)

`learning_activity_settings` is 1:1 and created with defaults on activity create.
Every field is a **contract only** in V1 — **no** attempt, submission, scoring,
grading, completion, or progress behavior is implemented anywhere. Updated only
through the dedicated `update_learning_activity_settings` RPC.

| Field | Default | Constraint (inert) |
| --- | --- | --- |
| `is_required` | `true` | — |
| `max_score` | `null` | numeric ≥ 0 when set |
| `passing_score` | `null` | ≥ 0; and `0 ≤ passing_score ≤ max_score` when both set |
| `max_attempts` | `null` | ≥ 1 when set; `null` = unbounded (reserved) |
| `time_limit_seconds` | `null` | 1..1,000,000 when set |
| `evaluation_mode` | `'none'` | `none | auto | manual | hybrid` |
| `completion_mode` | `'view'` | `view | submit | score | manual` |
| `allow_late_submission` | `false` | — |
| `show_result_policy` | `'never'` | `never | immediately | after_submit | after_close | manual` |
| `config` | `{}` | bounded shallow object (see below) |

Scoring bounds are enforced both by DB **check constraints** (including the
cross-field `passing_score ≤ max_score`) and by the
`learning_activity_validate_scoring` validator (explicit, fail-closed messages)
invoked by the settings RPC against the **effective** post-update values.

### `config` JSON limits

`config` is a bounded, shallow settings blob — **not** a content store. Validated
fail-closed by `learning_activity_validate_config`:

| Limit | Value |
| --- | --- |
| Type | object only |
| Max serialized size | **8192** bytes |
| Max top-level keys | **32** |
| Max depth | **2** (top-level object + scalar or single-level array values) |
| Value types | scalar (`string`/`number`/`boolean`/`null`) **or** array of scalars |
| Max array items | **64** |
| Max string length | **512** chars (values and array string elements) |

Nested objects (depth > 2) and arrays-of-arrays/arrays-of-objects are rejected.
`config` **must NOT** store questions, answers, submissions, rubrics, files,
code, large content, or AI outputs, and is **not** a substitute for future
normalized child tables.

## Visibility — CRITICAL divergence from Lessons

**There is NO anonymous / public SELECT policy in V1** (privacy-safe for
assessments). This is a deliberate divergence from Lessons/Sections/Courses.

- The `visibility` column (`private | unlisted | public`, default `private`) is
  retained for **forward compatibility only** and has **no anon effect**.
- The `learning_activities` table grants `SELECT` to `authenticated` only —
  **never** to `anon`.
- Because there is no anon policy, `is_platform_admin()` is **never structurally
  reachable** from an anonymous path; it is only ever called from authenticated
  policies.

### Authenticated read model

| Reader | Can read |
| --- | --- |
| Space member | `published` activities in their space (full chain resolved) |
| Space/Program/Course manager or course staff | draft/etc activities in scope |
| Activity manager | via `can_manage_learning_activity` |
| Platform admin | all activities (separate authenticated policy) |

## RLS

| Table | RLS | SELECT |
| --- | --- | --- |
| `learning_activities` | FORCE | authenticated only: space members (published or manage/course-staff); activity managers; platform admin. **No anon policy.** |
| `learning_activity_settings` | ENABLE | authenticated: space members / activity managers / platform admin |

No client INSERT/UPDATE/DELETE — RPCs only.

## RPCs

| RPC | Who |
| --- | --- |
| `create_learning_activity` | lesson manage / course staff ≥ instructor; space active; program+course+section+lesson draft\|published; `type` required + immutable |
| `update_learning_activity` | activity manage or course staff editor/instructor/lead; parent gates; no `type`/`lesson_id` |
| `update_learning_activity_settings` | same as update; validates scoring bounds + modes + `config` |
| `publish_learning_activity` | `can_manage_learning_activity`; draft only; parent gates fail-closed |
| `archive_learning_activity` | `can_manage_learning_activity` |
| `moderate_learning_activity` | platform admin only |
| `reorder_learning_activities` | lesson manage or space manage |

No question/attempt/submission/answer/grading/progress/AI RPCs. No
staff-assignment RPCs.

## Audit actions

`activity.create`, `activity.update`, `activity.publish`, `activity.archive`,
`activity.moderation`, `activity.reorder`, `activity.settings_update` — all via
`learning_audit_write` with actor / space / program / course / section / lesson /
activity attribution. The bounded `config` payload is **not** written into the
audit trail.

## Security summary

- FORCE RLS on `learning_activities`; client I/U/D revoked (RPC-only writes).
- ENABLE (not FORCE) RLS on `learning_activity_settings`; client I/U/D revoked.
- **No anonymous SELECT policy and no `anon` table grant** — activities are never
  exposed to anonymous clients in V1 (privacy-safe for assessments).
- `is_platform_admin()` only ever called from authenticated policies.
- SECURITY DEFINER + `search_path = public` on all functions.
- Authority inherited from Lesson/Course with active space-membership revalidation.
- Fail-closed validation of `type` (immutable allowlist), slug/name/visibility,
  `ai_metadata` (8192-byte cap + allowlist), scoring bounds, enum modes, and
  `config` (object-only, ≤ 8192 bytes, depth ≤ 2, ≤ 32 keys, scalar/short-array).
- `lesson_id` and `type` immutable — no RPC assigns them; reorder cannot move
  rows across lessons (every id constrained to the requested lesson; full unique
  set required).
- Immutable, append-only audit trail via `learning_audit_write`.
