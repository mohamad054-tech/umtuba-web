# UM Learning OS — Courses Foundation V1

Status: implemented locally (migration not applied remotely in this phase)

Migration: `supabase/migrations/20260830_learning_courses_foundation_v1.sql`

Depends on: `20260829_learning_programs_foundation_v1.sql` (and Spaces via Programs)

Constants / types: `lib/learning/coursesFoundation.ts`

## Purpose

DB-authoritative foundation for **Courses** as reusable educational units under a
Program: lifecycle, staff, visibility, ordering, foundation metadata, RPC writes,
RLS, and audit — without sections, lessons, activities, enrollments, payments, or UI.

## Hierarchy

```
Space → Program → Course
```

- Every course has required `program_id` (`ON DELETE RESTRICT`).
- Course is **not** a folder; it is a reusable educational unit under exactly one Program.
- **NO course format column** — format stays on Program.
- **Space ownership remains authoritative.** No course ownership transfer / independent owner.

## Scope

| Included | Notes |
| --- | --- |
| `learning_courses` | Belong to exactly one program; lifecycle; metadata; `position` |
| `learning_course_staff` | lead_instructor / instructor / TA / content_editor |
| `learning_course_settings` | 1:1 reserved enrollment flags |
| Helpers + RPCs | SECURITY DEFINER; client writes only via RPCs |
| Audit | Via existing `learning_audit_write` |

## Exclusions (out of scope for V1)

Does not include sections, lessons, activities, enrollments, progress,
certificates, payments, marketplace, calendar, booking, live delivery, AI tutor,
Learning UI, search indexing, or notifications.

**Next slice = Sections / Lessons (content tree) or Enrollments — TBD.**

## Parent gates

| Parent | Required for normal course mutations |
| --- | --- |
| Space | `status = 'active'` |
| Program | `status in ('draft', 'published')` — not suspended/archived |

## Lifecycle

```
create → draft
draft --publish_learning_course--> published
published|draft|* --archive_learning_course--> archived
* --moderate_learning_course--> suspended | published | archived  (platform_admin)
```

| Status | Normal mutations (update / staff / archive / reorder) |
| --- | --- |
| `draft` | Allowed for authorized actors |
| `published` | Metadata + staff allowed for authorized actors |
| `suspended` | **Rejected** — platform `moderate_learning_course` only |
| `archived` | **Rejected** — platform moderate only |

Owner/admin/lead cannot bypass suspended/archived gates.

### Timestamp normalization

- **publish:** `published_at` set; `suspended_at` and `archived_at` cleared
- **archive (RPC):** `archived_at` set; `suspended_at` cleared (blocked if currently suspended)
- **moderate → suspended:** `suspended_at` set; `archived_at` cleared
- **moderate → published:** `published_at` coalesce; `suspended_at` and `archived_at` cleared
- **moderate → archived:** `archived_at` coalesce; `suspended_at` cleared

## Staff

| Role | Rank |
| --- | ---: |
| lead_instructor | 80 |
| instructor | 60 |
| teaching_assistant | 50 |
| content_editor | 40 |

- Staff must be an **active** space member at assignment time.
- **Authorization revalidation:** `is_learning_course_staff`,
  `learning_course_staff_role`, and lead path of `can_manage_learning_course`
  require an active staff row **and** active parent-space membership on every
  check. A suspended/removed space member loses course authority immediately
  even if the staff row remains `active`.
- Teaching roles (`lead_instructor`, `instructor`) require space rank ≥ instructor.
- Space managers / platform admins assign any staff role.
- `lead_instructor` may assign only `teaching_assistant` / `content_editor`.
- Staff removal by lead requires target rank **strictly below** actor (peer protection).
- Space owner/admin overrides peer-rank protection.
- Non-manager creators (program staff ≥ instructor who are not space/program managers)
  are auto-assigned `lead_instructor` on create.

## Create permission

Allowed when:

- Space manage, **or**
- `can_manage_learning_program`, **or**
- active program staff with rank ≥ instructor (space membership revalidated)

## Ordering

- `position` integer within program; non-negative; deterministic (`position`, then `id`).
- New courses append at `max(position)+1`.
- `reorder_learning_courses(program_id, course_ids[])` rewrites positions to `0..n-1`
  transactionally; requires the full unique set of course ids for that program.

## Foundation metadata

Scalars / flags (no dependent features implemented):

- `category`, `difficulty`, `estimated_duration_minutes`, `target_audience`
- `supported_languages` (`text[]`, BCP47-like `xx` / `xx-YY`)
- `ai_ready`, `marketplace_ready`, `certification_ready`, `live_ready`

JSON objects — validated fail-closed (same limits as Programs):

| Column | Allowlisted keys | Limits |
| --- | --- | --- |
| `branding_metadata` | `cover_url`, `thumbnail_url`, `intro_video_url`, `logo_url` | object; ≤ **8192** bytes serialized; values strings ≤ 2048 chars; no nesting; unknown keys rejected |
| `seo_metadata` | `title`, `description`, `keywords` | object; ≤ 8192 bytes; title ≤ 512; description ≤ 2000; keywords array ≤ 32 strings ≤ 80 chars |
| `ai_metadata` | `skills`, `outcomes`, `tags` | object; ≤ 8192 bytes; each key array ≤ 64 strings ≤ 120 chars |

Empty `{}` is allowed. Unexpected keys are rejected.

## Settings (reserved)

| Flag | Default | Note |
| --- | --- | --- |
| `allow_self_enroll` | false | Enrollments later |
| `require_program_enrollment` | true | Enrollments later |
| `public_syllabus` | false | Content later |

## Public discovery

Course is publicly readable only when **all** hold:

- course `published` + `public`
- program `published` + `public`
- space `active` + `public`

Anon policies **never** call `is_platform_admin()`.

## RLS

| Table | RLS | SELECT |
| --- | --- | --- |
| `learning_courses` | FORCE | anon+auth: published+public ∩ published+public program ∩ active+public space; space members (published or manage/staff); managers; platform admin |
| `learning_course_staff` | FORCE | self / staff / managers / platform admin |
| `learning_course_settings` | ENABLE | space members / managers / platform admin |

No client INSERT/UPDATE/DELETE — RPCs only.

## RPCs

| RPC | Who |
| --- | --- |
| `create_learning_course` | space manage / program manage / program staff ≥ instructor; space active; program draft\|published |
| `update_learning_course` | manage or staff editor/instructor/lead; parent gates |
| `assign_learning_course_staff` | space manage / platform admin / lead (limited) |
| `remove_learning_course_staff` | space manage / platform admin / lead (peer-protected) |
| `publish_learning_course` | `can_manage_learning_course`; draft only |
| `archive_learning_course` | `can_manage_learning_course` |
| `moderate_learning_course` | platform admin only |
| `reorder_learning_courses` | space manage or `can_manage_learning_program` |

## Audit actions

`course.create`, `course.update`, `course.staff_assign`, `course.staff_remove`,
`course.publish`, `course.archive`, `course.moderation`, `course.reorder`.
