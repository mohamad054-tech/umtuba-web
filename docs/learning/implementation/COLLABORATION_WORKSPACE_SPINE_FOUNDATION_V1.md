# Collaboration Platform Workspace Spine Foundation V1

Capability: `learning.collaboration.workspace_spine_foundation_v1`  
Branch: `office/learning-collaboration-workspace-spine-foundation-v1`  
Base: `c3168eff3a324979efa5cab694e294c4daeeb4da`  
Status: implemented locally (no migration)

## Purpose

Provide a **spine-only** course collaboration workspace foundation:

- Stable derive-first workspace identity
- Course entitlement access (existing RLS)
- Parent Learning Space context (existing Spaces membership as context only)
- Explicit empty/unavailable attachment slots for Community, Live, Assignments/Projects, Tutor

This is not a realtime collaboration product, shared drive, or group-work engine.

## Architecture

```
Learner (JWT)
  → /learning/courses/[courseId]/workspace
  → loadCollaborationWorkspaceSpine
       → learning_courses (published, entitlement RLS)
       → learning_programs.space_id
       → learning_spaces
       → optional is_learning_space_member (context)
  → CollaborationWorkspaceShell
```

Hierarchy reused: **Space → Program → Course**. Workspace identity binds `(spaceId, courseId)`.

## Derive-first identity

```
workspaceKey = lwsp_v1:{spaceId}:{courseId}
```

- Deterministic and stable for the same course + parent space
- Not a persisted UUID row
- No workspace table / no workspace membership table

## Access model

| Concern | Authority |
| --- | --- |
| Enter workspace | Course entitlement via existing published-course RLS |
| Membership system | Spaces Foundation V1 only (`spaces_foundation_v1`) |
| Space member flag | Contextual (`is_learning_space_member`); never substitutes entitlement |

Fail closed when:

- learner unauthenticated / auth uid mismatch
- course missing or not accessible
- program binding missing
- parent space missing or not accessible

## Route contract

`GET /learning/courses/[courseId]/workspace`

1. Require authenticated learner
2. Resolve spine via `loadCollaborationWorkspaceSpine`
3. `notFound()` on any fail-closed result
4. Render `CollaborationWorkspaceShell`

## Attachment boundaries (V1)

| Slot | State | Notes |
| --- | --- | --- |
| community | empty | May link to existing course community surface |
| live | empty | May link to existing live schedule surface |
| assignments_projects | unavailable | No assignment-bucket reuse; outline link only |
| tutor | unavailable | Lesson-scoped; no course-level AI shared memory |

No attachment payloads, realtime, presence, chat, shared documents, or collaborative editing.

## No migration decision

Persistence is **not** required for V1 identity. Derive-first keys are sufficient. Adding a workspace table now would invite a second membership model and is deferred until a later GO explicitly needs durable workspace state.

## Exclusions

- Commerce / Stripe / payouts / refunds
- Live Studio mock collaboration panel
- Realtime chat / presence / websockets
- Shared files / whiteboards
- Assignment private bucket reuse
- AI Tutor shared memory / multi-learner tutor threads
- Group create/manage, grading, calendars beyond existing related links

## Future extension points

- Wire attachment payloads behind the same slot ids
- Lesson-scoped tutor entry from workspace
- Durable workspace metadata (only with explicit migration GO)
- Staff/instructor workspace variants

## Module map

| Layer | Path |
| --- | --- |
| Contract | `lib/learning/collaborationWorkspaceSpine.ts` |
| Tests | `lib/learning/collaborationWorkspaceSpine.test.ts` |
| Route | `app/learning/courses/[courseId]/workspace/page.tsx` |
| Shell | `app/components/learning/CollaborationWorkspaceShell.tsx` |
| Nav | `app/components/learning/CollaborationWorkspaceNav.tsx` |
