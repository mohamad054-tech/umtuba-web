# Collaboration Workspace Attachments Foundation V1

Capability: `learning.collaboration.workspace_attachments_foundation_v1`
Branch: `office/learning-collaboration-workspace-attachments-foundation-v1`
Base: `origin/office/learning-collaboration-workspace-spine-foundation-v1`
Status: implemented locally (no migration)

## Purpose

Turn the Workspace Spine into an integration hub by wiring **existing** Learning capabilities into four attachment cards:

1. Community
2. Assignments / Projects
3. AI Tutor
4. Live

Summaries and CTAs only. No realtime collaboration product.

## Architecture

```
loadCollaborationWorkspaceSpine (access + identity)
  → loadCollaborationWorkspaceAttachments
       → community feed RPC
       → course outline + activities + assignment/project mine RPCs
       → list my AI tutor threads
       → list my upcoming live sessions + join gate
  → CollaborationWorkspaceShell(view, cards)
```

Access remains course-entitlement RLS + Spaces membership context from the spine. Attachments do not invent a second membership model.

## Attachment contracts

| Card | Source | Available | Empty | Unavailable |
| --- | --- | --- | --- | --- |
| Community | `getLearningCourseCommunityFeed` | latest item + unanswered indicator | no items | feed fail |
| Assignments / Projects | outline lessons → published activities + `loadMyAssignment` / `loadMyProject` | counts, next due, submission state | none in course | outline/query fail |
| AI Tutor | `listMyAiTutorThreads(courseId)` | continue latest learner-owned thread | no threads | list fail |
| Live | `listMyLearningLiveSessions` + join gate | next session, status, join availability | no upcoming | list fail |

Unread indicator contract (Community): `{ kind: "unanswered_questions", count }` — not a messaging unread store.

Tutor `meta.sharedMemory` is always `false`.

## UI

Extended `CollaborationWorkspaceShell` only (no redesign): identity block + four sections with title, icon glyph, availability, summary, optional attention line, CTA, unavailable placeholder.

## No migration decision

All data comes from existing Learning tables/RPCs. No persistence added.

## Exclusions

- Realtime chat / presence / websockets
- Shared documents / whiteboards
- Shared AI Tutor memory across learners
- Assignment storage-bucket reuse beyond existing learner surfaces
- Commerce / Stripe / payouts / refunds
- Live Studio mock collaboration panel

## Module map

| Layer | Path |
| --- | --- |
| Contract | `lib/learning/collaborationWorkspaceAttachments.ts` |
| Tests | `lib/learning/collaborationWorkspaceAttachments.test.ts` |
| Shell | `app/components/learning/CollaborationWorkspaceShell.tsx` |
| Route | `app/learning/courses/[courseId]/workspace/page.tsx` |
