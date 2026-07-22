# UM Learning OS — Lesson Content Blocks Foundation V1

Status: implemented locally (migration **not** applied remotely in this phase)

Migration: `supabase/migrations/20260836_learning_lesson_content_blocks_foundation_v1.sql`

Depends on: `20260832_learning_lessons_foundation_v1.sql` (Lessons),
`20260833_learning_activities_foundation_v1.sql` (ordering / no-anon pattern),
`20260835_learning_progress_foundation_v1.sql` (`has_learning_course_access`).

Constants / types: `lib/learning/lessonContentBlocksFoundation.ts`

## Purpose

DB-authoritative foundation for **lesson content blocks** — the display **content
body** of a Lesson. A block is a single, ordered, typed unit of display data
(text, headings, opaque media references, code, callouts, links) under exactly
one Lesson, with a block-level draft/published lifecycle, RPC-only writes, RLS,
bounded per-type payload validation, and audit — **without** any
`learning_lesson_items`, activity/block progress, questions, attempts,
assignments, grades, certificates, AI execution, analytics, media
upload/storage buckets, signed URLs, offline sync, or UI/routes/React
components.

A **Content Block is a display body unit**, not an interaction. It is **not** an
activity, an interaction result, progress, a question, an attempt, a
certificate, or media storage.

## Hierarchy

```
Space → Program → Course → Section → Lesson → Content Block
```

- Every block has a required `lesson_id` (`ON DELETE RESTRICT`).
- `lesson_id`, `block_type`, and `created_by` are **immutable** — enforced by a
  guard trigger and never assigned by any RPC.
- **Course/space scope is derived DB-authoritatively** from the parent chain and
  is never stored on the block or trusted from the client. Only `lesson_id` is
  stored (matching the Lessons/Activities parent-FK-only pattern — no
  denormalized `course_id`/`space_id`).
- **Authority is inherited** from the Lesson → Section → Course chain. There is
  **no** content-block staff table.
- **Space remains the hard authority boundary.** Course authority stays
  membership-revalidated (a stale course staff row grants nothing).

## Block types

### V1 creatable (10)

```
rich_text | heading | image | video | audio | quote | divider | callout |
external_link | code_block
```

### Reserved (enum-only; create REJECTED in V1) (2)

```
ai_block | interactive_block
```

These are in the DB allowlist/`CHECK` constraint (12 total) so a later slice can
enable them without a destructive migration, but `create` **rejects** them today
(`... is reserved and cannot be created in V1`).

### Fully deferred (fail closed — NOT in the allowlist)

```
gallery | pdf | downloadable_file | table | embed | html / raw HTML
```

These are intentionally **absent** from the allowlist, so they fail closed at
both the `CHECK` constraint and the type validator (`Invalid content block
type`).

## Payload validation (bounded, per type)

`content` is object-only, `≤ 16384` bytes serialized, with a **strict per-type
key allowlist** and length/enum/URL/level checks. All text fields are scanned by
`learning_lesson_content_block_assert_safe_text`, which **rejects raw
HTML/JS/iframe**, `javascript:`/`vbscript:` schemes, `data:text/html`, and inline
event handlers (`on…=`). Only display data is stored.

| Type | Keys (allowlist) | Key rules |
| --- | --- | --- |
| `rich_text` | `text`, `format?` | `text` ≤ 10000 chars, safe-text; `format ∈ {plain, markdown}` |
| `heading` | `text`, `level` | `text` 1–300 chars, safe-text; `level` integer 1–6 |
| `image` | `url`, `alt?`, `caption?` | `url` http(s) opaque ref; `alt` ≤ 500; `caption` ≤ 1000 |
| `video` | `url`, `provider?`, `caption?` | `url` http(s); `provider ∈ {file, url, youtube, vimeo}`; `caption` ≤ 1000 |
| `audio` | `url`, `caption?` | `url` http(s); `caption` ≤ 1000 |
| `quote` | `text`, `attribution?` | `text` 1–2000; `attribution` ≤ 300 |
| `divider` | `style?` | `style ∈ {solid, dashed, dotted}` |
| `callout` | `text`, `variant` | `text` 1–4000; `variant ∈ {info, note, tip, success, warning, danger}` |
| `external_link` | `url`, `label?`, `description?` | `url` http(s); `label` ≤ 300; `description` ≤ 1000 |
| `code_block` | `code`, `language?` | `code` ≤ 20000 (display, rendered escaped); `language` matches `^[a-z0-9+#.-]{1,32}$` |

Any unexpected key for a type is rejected (`content contains unexpected key …`).

## Media

**No storage buckets, uploads, or signed URLs.** `image`/`video`/`audio` carry
only **opaque, validated http(s) reference strings** inside `content`
(`learning_lesson_content_block_assert_safe_url`: http(s) only, `≤ 2048` chars,
no `javascript:`/`vbscript:`/`data:` schemes). Rendering/players are out of
scope.

## Publishing

- **Block-level draft/published lifecycle.** New blocks are created `draft`.
- **Lesson publish does NOT auto-publish blocks** — each block is published
  explicitly.
- Explicit, **idempotent** `publish` / `unpublish` RPCs:
  - `publish` on an already-`published` block → no-op success.
  - `unpublish` on an already-`draft` block → no-op success; otherwise
    `published → draft` (clears `published_at`).
  - Both refuse `suspended`/`archived` blocks (platform moderation only).

## Read model (RLS)

`learning_lesson_content_blocks` has **FORCE + ENABLE** RLS, `SELECT` granted to
`authenticated` only, and **no anon policy or anon grant** (privacy-safe,
consistent with Activities). `is_platform_admin()` is only ever evaluated on
authenticated policies.

| Reader | Can read | Policy |
| --- | --- | --- |
| Entitled learner | **published** block under a **published** lesson in a course they have live access to | `Entitled learners read published content blocks` — `status='published'` + `lesson.status='published'` + `has_learning_course_access(course_id)` |
| Space/Program/Course manager or course staff | blocks (incl. drafts) in scope | `Course staff read scoped content blocks` |
| Content block manager | via `can_manage_learning_lesson_content_block` | `Content block managers read blocks` |
| Platform admin | all | `Platform admins read all content blocks` |

### Learner access divergence (deliberate)

Learner content-body reads gate on **`has_learning_course_access(course_id)`**
(platform admin OR course manager OR active course enrollment OR active parent
**program** enrollment — including program-enrollment inheritance), **not** plain
space membership. This intentionally **does not** copy the Lessons "any space
member" SELECT for the content body, and **does not widen** the Activities M1
draft-visibility surface: plain space members without entitlement or a staff role
cannot read the content body (draft or published). There is deliberately **no
anonymous SELECT** for content blocks in V1.

## Writes — RPC-only

No client `INSERT`/`UPDATE`/`DELETE` (revoked). All writes go through
`SECURITY DEFINER` RPCs with `SET search_path = public`, server-authoritative
identity (`auth.uid()`), full parent-chain revalidation, and audit.

| RPC | Who | Notes |
| --- | --- | --- |
| `create_learning_lesson_content_block(lesson_id, block_type, content)` | lesson manage / course staff ≥ instructor | space active; program+course+section+lesson `draft\|published`; `block_type` validated (reserved rejected); content validated; appends at `max(position)+1`; created `draft` |
| `update_learning_lesson_content_block(block_id, content)` | block manage or course editor/instructor/lead | content only; re-validated against immutable `block_type`; sets `updated_by`; no ownership/type/lesson change |
| `publish_learning_lesson_content_block(block_id)` | `can_manage_…` | idempotent draft→published |
| `unpublish_learning_lesson_content_block(block_id)` | `can_manage_…` | idempotent published→draft |
| `archive_learning_lesson_content_block(block_id)` | `can_manage_…` | idempotent; blocked while suspended |
| `moderate_learning_lesson_content_block(block_id, status)` | platform admin only | `suspended\|published\|archived` |
| `reorder_learning_lesson_content_blocks(lesson_id, block_ids[])` | lesson manage or space manage | two-phase, locks parent lesson, full unique id set |

### Parent gates (full 5-level chain)

Every mutation revalidates: **Space** `active`; **Program**, **Course**,
**Section**, **Lesson** each `draft|published` (not suspended/archived); plus
actor authority inherited from Lesson/Course (delegated course staff need active
space membership). A **published block does not require a *published* lesson** —
only a mutable (`draft|published`) chain; learner exposure is still gated on a
published lesson at read time.

## Ordering — A→B compatibility

- `position` is a **non-negative** integer, **order within the parent lesson's
  content-block list for V1** — not a global lesson-item order.
- There is intentionally **no `UNIQUE(lesson_id, position)`**: the reserved
  future table **`learning_lesson_items`** (Plan **B**, *not implemented*) will
  own the authoritative cross-content ordering (blocks + activities) under a
  Lesson. Keeping `position` non-unique and per-lesson makes V1 B-compatible with
  no destructive migration later.
- `reorder_learning_lesson_content_blocks` rewrites positions to `0..n-1`
  transactionally: it locks the parent lesson `FOR UPDATE`, requires the full
  **unique** set of the lesson's block ids, rejects cross-lesson ids, rejects
  reorder while any block is suspended/archived, and uses a **two-phase offset**
  update to avoid the non-negative check conflict during the swap.

## Immutability

- Identity columns `lesson_id`, `block_type`, `created_by`, `created_at` are
  guarded by `learning_lesson_content_block_guard_immutable` (raises on change).
- No RPC assigns `lesson_id`, `block_type`, or `created_by`.
- Publish timestamps and status transitions are server-managed; clients cannot
  write the table directly (RLS revokes I/U/D).

## Audit actions

`content_block.create`, `content_block.update`, `content_block.publish`,
`content_block.unpublish`, `content_block.archive`, `content_block.moderation`,
`content_block.reorder` — all via `learning_audit_write` with actor / space /
program / course / section / lesson / block attribution. Bounded `content`
payloads are **not** copied into the audit trail.

## Exclusions (out of scope for V1)

Does **not** include `learning_lesson_items`, activity progress, block-level
progress, questions, question banks, answers, attempts, submissions,
assignments, grades, rubrics, certificates, AI execution, analytics, media
upload/storage buckets, signed URLs, offline sync, Learning UI / routes / React
components, search indexing, or notifications.

The reserved future table `learning_lesson_items` is **named only** as a
forward-compatibility contract; it is **not implemented** here.

**Next slice = `learning_lesson_items` (the unified ordered lesson spine across
blocks + activities), or enabling the reserved `ai_block` / `interactive_block`
types, as prioritized.**

## Security summary

- FORCE + ENABLE RLS on `learning_lesson_content_blocks`; client I/U/D revoked
  (RPC-only writes).
- **No anonymous SELECT policy and no `anon` table grant.**
  `is_platform_admin()` only ever called from authenticated policies.
- SECURITY DEFINER + `search_path = public` on all functions; EXECUTE revoked
  from `public`/`anon` and granted to `authenticated`/`service_role`; internal
  validators revoked from all clients.
- Server-authoritative identity (`auth.uid()`); `created_by`/`updated_by` never
  client-supplied.
- Learner reads gated on `has_learning_course_access` (incl. program-enrollment
  inheritance) + published lesson + published block; no space-member draft leak.
- Authority inherited from Lesson/Course with active space-membership
  revalidation (stale course staff row grants nothing).
- Fail-closed validation of `block_type` (immutable allowlist; reserved rejected;
  deferred not in allowlist), per-type `content` (object-only, ≤ 16384 bytes,
  key allowlist, length/enum/level/language bounds), safe-text (no raw
  HTML/JS/iframe), and safe-url (http(s)-only opaque refs; no upload/buckets/
  signed URLs).
- `lesson_id`/`block_type`/`created_by` immutable (guard trigger + no RPC
  assignment); reorder cannot move rows across lessons (full unique set required)
  and there is no `UNIQUE(lesson_id, position)` (Plan-B compatible).
- Append-only audit trail via `learning_audit_write`.
