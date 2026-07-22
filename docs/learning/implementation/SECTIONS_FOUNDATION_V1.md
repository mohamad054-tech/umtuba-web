# UM Learning OS — Sections Foundation V1

Status: implemented locally (migration not applied remotely in this phase)

Migration: `supabase/migrations/20260831_learning_sections_foundation_v1.sql`

Depends on: `20260830_learning_courses_foundation_v1.sql` (and Programs/Spaces via Courses)

Constants / types: `lib/learning/sectionsFoundation.ts`

## Purpose

DB-authoritative foundation for **Sections** as organizational educational
modules under a Course: lifecycle, visibility, ordering, section-appropriate
foundation metadata, RPC writes, RLS, and audit — without lessons, activities,
assessments, enrollments, progress, payments, or UI.

A **Section is not a Lesson.** It is an organizational module that groups future
lesson content under exactly one Course.

## Hierarchy

```
Space → Program → Course → Section
```

- Every section has required `course_id` (`ON DELETE RESTRICT`).
- `course_id` is **immutable** — it cannot change via `update` or `reorder`.
- Section is **not** a lesson; it is an organizational module under exactly one Course.
- **Authority is inherited from the parent Course.** There is **no** section staff table.
- **Space remains the hard authority boundary.** Course authority stays membership-revalidated.

## Scope

| Included | Notes |
| --- | --- |
| `learning_sections` | Belong to exactly one course; lifecycle; metadata; `position` |
| `learning_section_settings` | 1:1 reserved (inert) flags |
| Helpers + RPCs | SECURITY DEFINER; client writes only via RPCs |
| Audit | Via existing `learning_audit_write` |

## Exclusions (out of scope for V1)

Does not include lessons, activities, assessments, assignments, quizzes,
homework, progress, enrollments, certificates, payments, marketplace, calendar,
booking, live-session behavior, AI-tutor behavior, Learning UI, search indexing,
or notifications.

**Next slice = Lessons (content within a Section).**

## Authority model (inherited, no staff table)

- There is **no `learning_section_staff`** and **no staff-assignment RPCs**.
- `can_manage_learning_section(section_id, user)` → platform admin **or**
  `can_manage_learning_course(course_id, user)`.
- `can_create_learning_section(course_id, user)` → `can_manage_learning_course`
  **or** active course staff with rank ≥ instructor.
- The course helpers (`is_learning_course_staff`, `learning_course_staff_role`,
  and the lead path of `can_manage_learning_course`) revalidate **active parent-space
  membership** on every check. A stale/active course staff row whose owner has lost
  active space membership therefore grants **no** section authority.

## Parent gates

Every section mutation revalidates the full chain:

| Parent | Required for normal section mutations |
| --- | --- |
| Space | `status = 'active'` |
| Program | `status in ('draft', 'published')` — not suspended/archived |
| Course | `status in ('draft', 'published')` — not suspended/archived |
| Actor | authority inherited from Course/Space (delegated staff needs active space membership) |

No mutation is allowed under a suspended/archived Course, Program, or Space.
**Publishing fails closed** when any parent is not in an allowed state.

## Lifecycle

```
create → draft
draft --publish_learning_section--> published
published|draft|* --archive_learning_section--> archived
* --moderate_learning_section--> suspended | published | archived  (platform_admin)
```

| Status | Normal mutations (update / archive / reorder) |
| --- | --- |
| `draft` | Allowed for authorized actors |
| `published` | Metadata allowed for authorized actors |
| `suspended` | **Rejected** — platform `moderate_learning_section` only |
| `archived` | **Rejected** — platform moderate only |

Course managers / leads cannot bypass suspended/archived gates.

### Timestamp normalization

- **publish:** `published_at` set; `suspended_at` and `archived_at` cleared
- **archive (RPC):** `archived_at` set; `suspended_at` cleared (blocked if currently suspended)
- **moderate → suspended:** `suspended_at` set; `archived_at` cleared
- **moderate → published:** `published_at` coalesce; `suspended_at` and `archived_at` cleared
- **moderate → archived:** `archived_at` coalesce; `suspended_at` cleared

## Create permission

Allowed when, for the target course:

- `can_manage_learning_course` (space manage / program manage / course lead / platform admin), **or**
- active course staff with rank ≥ instructor (space membership revalidated).

## Ordering

- `position` integer within course; non-negative; deterministic (`position`, then `id`).
- New sections append at `max(position)+1`.
- `reorder_learning_sections(course_id, section_ids[])` rewrites positions to `0..n-1`
  transactionally; requires the full **unique** set of section ids for that course.
- The parent course row is locked `FOR UPDATE`; a **two-phase offset** update avoids
  the non-negative check conflict during the swap.
- **Cross-course reorder is prevented:** every id must belong to the course, and only
  that course's rows are touched. `course_id` is never changed.
- Reorder is rejected while any section in the course is suspended/archived.
- No drag-and-drop UI is included.

## Foundation metadata

Scalars / flags (no dependent features implemented):

- `category`, `difficulty`, `estimated_duration_minutes`, `target_audience`
- `default_language`, `supported_languages` (`text[]`, BCP47-like `xx` / `xx-YY`)
- `ai_ready`, `live_ready`

**Section-appropriate surface only:** there is **no** `marketplace_ready` or
`certification_ready` (those remain on the Course). The full Program/Course
metadata surface is intentionally not copied.

JSON objects — validated fail-closed (same limits as Courses):

| Column | Allowlisted keys | Limits |
| --- | --- | --- |
| `branding_metadata` | `cover_url`, `thumbnail_url`, `intro_video_url`, `logo_url` | object; ≤ **8192** bytes serialized; values strings ≤ 2048 chars; no nesting; unknown keys rejected |
| `seo_metadata` | `title`, `description`, `keywords` | object; ≤ 8192 bytes; title ≤ 512; description ≤ 2000; keywords array ≤ 32 strings ≤ 80 chars |
| `ai_metadata` | `skills`, `outcomes`, `tags` | object; ≤ 8192 bytes; each key array ≤ 64 strings ≤ 120 chars |

Empty `{}` is allowed. Unexpected keys are rejected.

## Settings (reserved / inert)

`learning_section_settings` is 1:1 and created with defaults on section create.
The flags are **contracts only** in V1 — no lesson unlock, progress, or ordering
behavior is implemented anywhere.

| Flag | Default | Note (inert) |
| --- | --- | --- |
| `is_required` | true | Reserved for Lessons/Progress |
| `enforce_lesson_order` | false | Reserved for Lessons |
| `visible_when_locked` | true | Reserved for Lessons |

## Public discovery

Section is publicly readable only when **all** hold:

- section `published` + `public`
- course `published` + `public`
- program `published` + `public`
- space `active` + `public`

Anon policies **never** call `is_platform_admin()`.

## RLS

| Table | RLS | SELECT |
| --- | --- | --- |
| `learning_sections` | FORCE | anon+auth: published+public ∩ published+public course ∩ published+public program ∩ active+public space; space members (published or manage/course-staff); section managers; platform admin |
| `learning_section_settings` | ENABLE | space members / section managers / platform admin |

No client INSERT/UPDATE/DELETE — RPCs only.

## RPCs

| RPC | Who |
| --- | --- |
| `create_learning_section` | course manage / course staff ≥ instructor; space active; program+course draft\|published |
| `update_learning_section` | section manage or course staff editor/instructor/lead; parent gates |
| `publish_learning_section` | `can_manage_learning_section`; draft only; parent gates fail-closed |
| `archive_learning_section` | `can_manage_learning_section` |
| `moderate_learning_section` | platform admin only |
| `reorder_learning_sections` | course manage or space manage |

No staff-assignment RPCs.

## Audit actions

`section.create`, `section.update`, `section.publish`, `section.archive`,
`section.moderation`, `section.reorder` — all via `learning_audit_write` with
actor / space / course / section attribution.

## Security summary

- FORCE RLS on `learning_sections`; client I/U/D revoked (RPC-only writes).
- SECURITY DEFINER + `search_path = public` on all functions.
- Public/anon SELECT never calls `is_platform_admin()`.
- Authority inherited from Course with active space-membership revalidation.
- Fail-closed validation of slug/name/language/metadata; 8192-byte metadata cap + allowlists.
- Immutable, append-only audit trail via `learning_audit_write`.
