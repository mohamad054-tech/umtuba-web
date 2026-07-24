# UM Learning — Instructor Authoring Minimal V1

Status: **implemented** (no migration)

Branch: `office/learning-instructor-authoring-minimal-v1`  
Parent: `office/learning-progress-mutations-v1` @ `1370943`

Constants / wrappers: `lib/learning/instructorAuthoring.ts`  
Server actions: `app/learning/instructor/actions.ts`  
Routes: `app/learning/instructor/**`

---

## Purpose

Give entitled instructors / Learning administrators a **minimal product
surface** to author course structure (sections → lessons → activities →
content blocks) using **existing** server-authoritative Learning RPCs and RLS.

## Scope

| In | Out |
| --- | --- |
| Sections create/update/publish/archive/reorder | Programs / courses create |
| Lessons create/update/publish/archive/reorder | Questions / answer keys |
| Activities create/update/publish/archive/reorder | Activity settings expansion |
| Content blocks create/update/publish/unpublish/archive/reorder | Moderate / unsuspend |
| Staff-visible course list via SELECT+RLS | Full visual / DnD builder |
| Instructor nav entry when courses visible | Media upload / AI / certificates |

## Routes

| Path | Role |
| --- | --- |
| `/learning/instructor` | Course list |
| `/learning/instructor/courses/[courseId]` | Hierarchy authoring |
| `/learning/instructor/courses/[courseId]/lessons/[lessonId]` | Content blocks |

Learner routes under `/learning` are unchanged.

## Authorization

- Final authority: existing `can_create_*` / `can_manage_*` inside RPCs
- UX pre-check: `can_manage_learning_course` for lifecycle control visibility
- Course list: `learning_courses` SELECT under staff/manage RLS
- Learners without visible manageable courses do **not** see the Instructor entry
- Direct URL access still fails safely via RPC/RLS denials
- No platform-admin-only moderate actions in UI

## Lifecycle

- Create → draft (RPC)
- Publish / archive → existing entity RPCs (non-idempotent where SQL says so)
- Content block publish/unpublish → existing idempotent RPCs
- Suspended/archived restrictions → SQL fail-closed; UI surfaces safe errors
- No instructor self-unsuspend

## Architecture

```
UI forms → server actions → instructorAuthoring.build/run → supabase.rpc(...)
Reads → JWT client SELECT (RLS) for course tree / blocks
```

- No authenticated INSERT/UPDATE/DELETE on Learning content tables
- No generic unrestricted RPC dispatcher
- Unknown fields / forbidden authoritative fields rejected in TypeScript

## Security boundaries

- Allowlisted operations only
- Parent ids accepted only where the operation requires them
- `status`, `created_by`, actor, timestamps rejected from input
- Errors sanitized (no SQL/policy leakage)
- Questions / answer-key operations absent from allowlist

## No migration

**No new migration.** Reuses foundations `20260831`–`20260833`, `20260836` RPCs.

## Known limitations

- Ordering UX is explicit id-list textarea (not DnD)
- Content blocks: basic text/heading/callout forms only
- TA update powers follow DB (UI does not invent update rights)
- Double-publish of non-draft section/lesson/activity surfaces as error
- Progress Mutations / Result Policy behavior untouched

## Validation

- `npx vitest run lib/learning` — 609/609 (includes 12 instructor authoring tests)
- `npx tsc --noEmit` — pass
- Scoped eslint on authoring files — pass (repo-wide lint has pre-existing unrelated errors)
- `npm run build` — pass (instructor routes present)
- `git diff --check` on authoring paths — pass
- No migration created; shared `docs/ai/*` Ads handoff files left untouched
