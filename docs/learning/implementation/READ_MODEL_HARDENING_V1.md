# UM Learning OS — Read Model Hardening V1

## Goal

Remove the remaining divergence between **space-membership reads** and
**`has_learning_course_access`** on the learner-facing course tree and settings,
so Learner Delivery can rely on a single DB entitlement helper.

Migration: `supabase/migrations/20260840_learning_read_model_hardening_v1.sql`

## Locked decisions

1. **Programs catalog** — keep `Space members read accessible programs` (browse
   published programs without enrollment). Do **not** make program catalog
   entitlement-only in V1.
2. **Course tree** — learner SELECT on `learning_courses`, `learning_sections`,
   `learning_lessons`, `learning_activities` uses `has_learning_course_access`
   (not plain `is_learning_space_member`).
3. **Parent published chain** — learner reads require: space `active`, program /
   course / section / lesson / activity `published` as applicable to the row.
4. **Settings** — `learning_*_settings` SELECT is staff **or** entitled only
   (program settings use `has_learning_program_access`).
5. **Additive only** — do not edit migrations `20260828`–`20260839`.

## What changed

### Dropped (over-grant / under-grant learner-member paths)

| Policy | Table |
| --- | --- |
| `Space members read accessible courses` | `learning_courses` |
| `Space members read accessible sections` | `learning_sections` |
| `Space members read accessible lessons` | `learning_lessons` |
| `Space members read accessible activities` | `learning_activities` |
| `Members read course settings` | `learning_course_settings` |
| `Members read section settings` | `learning_section_settings` |
| `Members read lesson settings` | `learning_lesson_settings` |
| `Members read activity settings` | `learning_activity_settings` |
| `Members read program settings` | `learning_program_settings` |

### Added — entitled learners

| Policy | Gate |
| --- | --- |
| `Entitled learners read published courses` | published course + published program + active space + `has_learning_course_access` |
| `Entitled learners read published sections` | + published section |
| `Entitled learners read published lessons` | + published lesson |
| `Entitled learners read published activities` | + published activity |
| `Entitled learners read published * settings` | same chain + entitlement (`has_learning_program_access` for program settings) |

### Added — staff scoped (draft-in-scope after dropping space-member OR-staff branch)

| Policy | Gate |
| --- | --- |
| `Course staff read scoped {courses,sections,lessons,activities}` | space/program/course manage **or** `is_learning_course_staff` |
| `Staff read * settings` | manage / staff / platform admin |

### Unchanged

- Public discovery policies for programs / courses / sections / lessons
- `Space members read accessible programs` (catalog)
- Manager / platform-admin SELECT policies on the tree tables
- Activities: **no** anon SELECT
- Questions, content blocks, attempts, scoring, progress migrations / policies

## Security

- Authorization stays in Postgres RLS — **no** TypeScript auth duplicate.
- Plain space membership is **not** a learner substitute for course tree or settings.
- Program enrollment still grants course access via the existing
  `has_learning_course_access` expansion (Progress Foundation).
- Enrolled learners without space membership can read the published entitled tree
  (fixes prior under-grant).

## Explicit exclusions

Attempts, Scoring, Questions, Progress mutations, Learner/Instructor UI, routes,
components, remote Supabase migration apply.
