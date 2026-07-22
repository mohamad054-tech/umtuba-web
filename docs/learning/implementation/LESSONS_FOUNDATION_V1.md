# UM Learning OS — Lessons Foundation V1

Status: implemented locally (migration not applied remotely in this phase)

Migration: `supabase/migrations/20260832_learning_lessons_foundation_v1.sql`

Depends on: `20260831_learning_sections_foundation_v1.sql` (and Courses/Programs/Spaces via Sections)

Constants / types: `lib/learning/lessonsFoundation.ts`

## Purpose

DB-authoritative foundation for **Lessons** as educational **containers** under a
Section: lifecycle, visibility, ordering, lesson-appropriate foundation metadata,
a descriptive-only `content_type`, RPC writes, RLS, and audit — without any
content body, activities, assessments, progress, completion, comments, live
behavior, or UI.

A **Lesson is a container**, not content. It is **not** a content body, an
Activity, Progress, or a Live Session. It groups future lesson content blocks and
activities under exactly one Section.

## Hierarchy

```
Space → Program → Course → Section → Lesson
```

- Every lesson has required `section_id` (`ON DELETE RESTRICT`).
- `section_id` is **immutable** — it cannot change via `update` or `reorder`.
- Lesson is a **container** under exactly one Section — not content/activity/progress/live.
- **Authority is inherited from the parent Section → Course.** There is **no** lesson staff table.
- **Space remains the hard authority boundary.** Course authority stays membership-revalidated.

## Scope

| Included | Notes |
| --- | --- |
| `learning_lessons` | Belong to exactly one section; lifecycle; metadata; `position`; descriptive `content_type` |
| `learning_lesson_settings` | 1:1 reserved (inert) flags |
| Helpers + RPCs | SECURITY DEFINER; client writes only via RPCs |
| Audit | Via existing `learning_audit_write` |

## Exclusions (out of scope for V1)

Does not include lesson content blocks, media, video processing, rich text,
audio/docs, activities, assessments, assignments, quizzes, homework, progress,
completion, certificates, enrollments, payments, marketplace, calendar, booking,
live-session behavior, AI-tutor behavior, comments, Learning UI, search indexing,
or notifications.

The reserved future table `learning_lesson_content_blocks` is **named only** as a
contract; it is **not implemented** here.

**Next slice = Lesson Content / Progress (content blocks & activities within a Lesson).**

## Container-only model

- `learning_lessons` carries **no large content payloads** — it is a container row.
- `content_type` is a **nullable, descriptive-only allowlist**:
  `video | text | audio | document | interactive | live`. It **activates nothing**
  — no players, storage, rendering, or delivery behavior exists in V1.

## Authority model (inherited, no staff table)

- There is **no `learning_lesson_staff`** and **no staff-assignment RPCs**.
- `can_manage_learning_lesson(lesson_id, user)` → platform admin **or**
  `can_manage_learning_section(section_id, user)` (which itself defers to
  `can_manage_learning_course`).
- `can_create_learning_lesson(section_id, user)` → `can_manage_learning_section`
  **or** active course staff with rank ≥ instructor.
- The course helpers (`is_learning_course_staff`, `learning_course_staff_role`,
  and the lead path of `can_manage_learning_course`) revalidate **active parent-space
  membership** on every check. A stale/active course staff row whose owner has lost
  active space membership therefore grants **no** lesson authority.

## Parent gates (full 5-level chain)

Every lesson mutation revalidates the full chain:

| Parent | Required for normal lesson mutations |
| --- | --- |
| Space | `status = 'active'` |
| Program | `status in ('draft', 'published')` — not suspended/archived |
| Course | `status in ('draft', 'published')` — not suspended/archived |
| Section | `status in ('draft', 'published')` — not suspended/archived |
| Actor | authority inherited from Section/Course/Space (delegated staff needs active space membership) |

No mutation is allowed under a suspended/archived Section, Course, Program, or
Space. **Publishing fails closed** when any parent is not in an allowed state.

## Lifecycle

```
create → draft
draft --publish_learning_lesson--> published
published|draft|* --archive_learning_lesson--> archived
* --moderate_learning_lesson--> suspended | published | archived  (platform_admin)
```

| Status | Normal mutations (update / archive / reorder) |
| --- | --- |
| `draft` | Allowed for authorized actors |
| `published` | Metadata allowed for authorized actors |
| `suspended` | **Rejected** — platform `moderate_learning_lesson` only |
| `archived` | **Rejected** — platform moderate only |

Section managers / course leads cannot bypass suspended/archived gates.

### Timestamp normalization

- **publish:** `published_at` set; `suspended_at` and `archived_at` cleared
- **archive (RPC):** `archived_at` set; `suspended_at` cleared (blocked if currently suspended)
- **moderate → suspended:** `suspended_at` set; `archived_at` cleared
- **moderate → published:** `published_at` coalesce; `suspended_at` and `archived_at` cleared
- **moderate → archived:** `archived_at` coalesce; `suspended_at` cleared

## Create permission

Allowed when, for the target section:

- `can_manage_learning_section` (section/course manage / platform admin), **or**
- active course staff with rank ≥ instructor (space membership revalidated).

## Ordering

- `position` integer within section; non-negative; deterministic (`position`, then `id`).
- New lessons append at `max(position)+1`.
- `reorder_learning_lessons(section_id, lesson_ids[])` rewrites positions to `0..n-1`
  transactionally; requires the full **unique** set of lesson ids for that section.
- The parent section row is locked `FOR UPDATE`; a **two-phase offset** update avoids
  the non-negative check conflict during the swap.
- **Cross-section reorder is prevented:** every id must belong to the section, and only
  that section's rows are touched. `section_id` is never changed.
- Reorder is rejected while any lesson in the section is suspended/archived.
- No drag-and-drop UI is included.

## Foundation metadata

Scalars / flags (no dependent features implemented):

- `content_type` (descriptive-only nullable allowlist), `difficulty`,
  `estimated_duration_minutes`
- `default_language`, `supported_languages` (`text[]`, BCP47-like `xx` / `xx-YY`)
- `ai_ready`, `live_ready`

**Lesson-trimmed surface:** there is **no** `category` / `target_audience` (those
remain on the Section) and **no** `marketplace_ready` / `certification_ready`
(those remain on the Course). The full Program/Course/Section metadata surface is
intentionally not copied.

JSON objects — validated fail-closed (same limits as Sections):

| Column | Allowlisted keys | Limits |
| --- | --- | --- |
| `branding_metadata` | `cover_url`, `thumbnail_url`, `intro_video_url`, `logo_url` | object; ≤ **8192** bytes serialized; values strings ≤ 2048 chars; no nesting; unknown keys rejected |
| `seo_metadata` | `title`, `description`, `keywords` | object; ≤ 8192 bytes; title ≤ 512; description ≤ 2000; keywords array ≤ 32 strings ≤ 80 chars |
| `ai_metadata` | `skills`, `outcomes`, `tags` | object; ≤ 8192 bytes; each key array ≤ 64 strings ≤ 120 chars |

Empty `{}` is allowed. Unexpected keys are rejected.

## Settings (reserved / inert)

`learning_lesson_settings` is 1:1 and created with defaults on lesson create. The
flags are **contracts only** in V1 — no completion, preview, comments, or progress
behavior is implemented anywhere.

| Flag | Default | Note (inert) |
| --- | --- | --- |
| `is_required` | true | Reserved for Progress/Completion |
| `is_previewable` | false | Reserved for Preview |
| `allow_comments` | false | Reserved for Comments |
| `min_completion_seconds` | null | Reserved for Completion |

## Public discovery

Lesson is publicly readable only when **all** hold:

- lesson `published` + `public`
- section `published` + `public`
- course `published` + `public`
- program `published` + `public`
- space `active` + `public`

Anon policies **never** call `is_platform_admin()`.

## RLS

| Table | RLS | SELECT |
| --- | --- | --- |
| `learning_lessons` | FORCE | anon+auth: published+public ∩ published+public section ∩ published+public course ∩ published+public program ∩ active+public space; space members (published or manage/course-staff); lesson managers; platform admin |
| `learning_lesson_settings` | ENABLE | space members / lesson managers / platform admin |

No client INSERT/UPDATE/DELETE — RPCs only.

## RPCs

| RPC | Who |
| --- | --- |
| `create_learning_lesson` | section manage / course staff ≥ instructor; space active; program+course+section draft\|published |
| `update_learning_lesson` | lesson manage or course staff editor/instructor/lead; parent gates |
| `publish_learning_lesson` | `can_manage_learning_lesson`; draft only; parent gates fail-closed |
| `archive_learning_lesson` | `can_manage_learning_lesson` |
| `moderate_learning_lesson` | platform admin only |
| `reorder_learning_lessons` | section manage or space manage |

No staff-assignment RPCs. No content-block RPCs.

## Audit actions

`lesson.create`, `lesson.update`, `lesson.publish`, `lesson.archive`,
`lesson.moderation`, `lesson.reorder` — all via `learning_audit_write` with
actor / space / course / section / lesson attribution.

## Security summary

- FORCE RLS on `learning_lessons`; client I/U/D revoked (RPC-only writes).
- ENABLE (not FORCE) RLS on `learning_lesson_settings`; client I/U/D revoked.
- SECURITY DEFINER + `search_path = public` on all functions.
- Public/anon SELECT never calls `is_platform_admin()`.
- Authority inherited from Section/Course with active space-membership revalidation.
- Fail-closed validation of slug/name/language/content_type/metadata; 8192-byte
  metadata cap + allowlists.
- `section_id` immutable — no RPC assigns `section_id`; reorder cannot move rows
  across sections (every id constrained to the requested section; full unique set required).
- Immutable, append-only audit trail via `learning_audit_write`.
