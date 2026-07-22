# UM Learning OS — Programs Foundation V1

Status: implemented locally (migration not applied remotely in this phase)

Migration: `supabase/migrations/20260829_learning_programs_foundation_v1.sql`

Depends on: `20260828_learning_spaces_membership_foundation_v1.sql`

Constants / types: `lib/learning/programsFoundation.ts`

## Purpose

DB-authoritative foundation for **Programs** as the permanent content/offering
root under a Learning Space: lifecycle, staff, visibility, foundation metadata,
RPC writes, RLS, and audit — without courses, enrollments, payments, or UI.

## Scope

| Included | Notes |
| --- | --- |
| `learning_programs` | Belong to exactly one space; formats; lifecycle; metadata |
| `learning_program_staff` | lead_instructor / instructor / TA / content_editor |
| `learning_program_settings` | 1:1 reserved enrollment flags |
| Helpers + RPCs | SECURITY DEFINER; client writes only via RPCs |
| Audit | Via existing `learning_audit_write` |

## Exclusions (out of scope for V1)

Does not include courses, sections, lessons, activities, enrollments, progress,
certificates, payments, marketplace, calendar, booking, live delivery, AI tutor,
Learning UI, search indexing, or notifications.

**Next slice = Courses.**

## Relationship to Spaces

- Every program has required `space_id` (`ON DELETE RESTRICT`).
- **Space ownership remains authoritative.** No program ownership transfer.
- Program mutations require parent space `status = 'active'`.
- Create allowed for space owner/admin **or** active space member with rank ≥ instructor.
- Public discovery requires program `published`+`public` **and** space `active`+`public`.

## Formats

| Format | Intent |
| --- | --- |
| `self_paced` | Async / recorded curriculum root |
| `cohort` | Scheduled cohort offering |
| `live_group` | Group live class offering |
| `tutoring_1to1` | 1:1 tutoring offering |
| `hybrid` | Mixed delivery |

## Lifecycle

```
create → draft
draft --publish_learning_program--> published
published|draft|* --archive_learning_program--> archived
* --moderate_learning_program--> suspended | published | archived  (platform_admin)
```

Format may change only while `draft`.

## Staff

| Role | Rank |
| --- | ---: |
| lead_instructor | 80 |
| instructor | 60 |
| teaching_assistant | 50 |
| content_editor | 40 |

- Staff must be an **active** space member at assignment time.
- **Authorization revalidation:** `is_learning_program_staff`,
  `learning_program_staff_role`, and lead path of `can_manage_learning_program`
  require an active staff row **and** active parent-space membership on every
  check. A suspended/removed space member loses program authority immediately
  even if the staff row remains `active`.
- Teaching roles (`lead_instructor`, `instructor`) require space rank ≥ instructor.
- Space managers / platform admins assign any staff role.
- `lead_instructor` may assign only `teaching_assistant` / `content_editor`.
- Staff removal by lead requires target rank **strictly below** actor (peer protection).
- Non-manager creators are auto-assigned `lead_instructor` on create.

## Lifecycle mutation gates

| Status | Normal mutations (update / staff / archive) |
| --- | --- |
| `draft` | Allowed for authorized actors |
| `published` | Metadata + staff allowed for authorized actors |
| `suspended` | **Rejected** — platform `moderate_learning_program` only |
| `archived` | **Rejected** — platform moderate only |

Owner/admin/lead cannot bypass suspended/archived gates.

### Timestamp normalization

- **publish:** `published_at` set; `suspended_at` and `archived_at` cleared
- **archive (RPC):** `archived_at` set; `suspended_at` cleared (blocked if currently suspended)
- **moderate → suspended:** `suspended_at` set; `archived_at` cleared
- **moderate → published:** `published_at` coalesce; `suspended_at` and `archived_at` cleared
- **moderate → archived:** `archived_at` coalesce; `suspended_at` cleared

## Foundation metadata

Scalars / flags (no dependent features implemented):

- `category`, `difficulty`, `estimated_duration_minutes`, `target_audience`
- `supported_languages` (`text[]`, BCP47-like `xx` / `xx-YY`)
- `ai_ready`, `marketplace_ready`, `certification_ready`, `live_ready`

JSON objects — validated fail-closed:

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
| `require_space_membership` | true | Enrollments later |
| `public_syllabus` | false | Content later |

## RLS

**World hardening lesson:** public/anon SELECT must **never** call `is_platform_admin()`.

| Table | RLS | SELECT |
| --- | --- | --- |
| `learning_programs` | FORCE | anon+auth: published+public ∩ active+public space; space members (published or manage/staff); managers; platform admin |
| `learning_program_staff` | FORCE | self / staff / managers / platform admin |
| `learning_program_settings` | ENABLE | space members / managers / platform admin |

No client INSERT/UPDATE/DELETE — RPCs only.

## RPCs

| RPC | Who |
| --- | --- |
| `create_learning_program` | space manage or instructor+; space active |
| `update_learning_program` | manage or staff editor/instructor/lead; space active |
| `assign_learning_program_staff` | space manage / platform admin / lead (limited) |
| `remove_learning_program_staff` | space manage / platform admin / lead (peer-protected) |
| `publish_learning_program` | `can_manage_learning_program`; draft only |
| `archive_learning_program` | `can_manage_learning_program` |
| `moderate_learning_program` | platform admin only |

## Audit actions

`program.create`, `program.update`, `program.staff_assign`, `program.staff_remove`,
`program.publish`, `program.archive`, `program.moderation`.
