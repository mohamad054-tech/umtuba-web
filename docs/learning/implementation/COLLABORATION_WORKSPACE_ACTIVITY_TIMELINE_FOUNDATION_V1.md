# Collaboration Workspace Activity Timeline Foundation V1

Capability: `learning.collaboration.workspace_activity_timeline_foundation_v1`
Branch: `office/learning-collaboration-workspace-activity-timeline-foundation-v1`
Base: `origin/office/learning-collaboration-workspace-attachments-foundation-v1`
Status: implemented locally (no migration)

## Purpose

Build a unified Learning Workspace Activity Timeline as a **read-model aggregation** of existing Learning capabilities.

No realtime. No websocket. No push notifications. No chat. No shared AI memory. No Commerce.

## Architecture

```
loadCollaborationWorkspaceSpine (access + identity)
  → loadCollaborationWorkspaceHubSources (single fetch)
       → community feed + discussion threads
       → assignment/project overview
       → AI Tutor threads
       → live sessions (scope=all) + join gate for next upcoming
  → buildCollaborationWorkspaceAttachmentCards
  → buildCollaborationWorkspaceTimeline (sorted newest first)
  → CollaborationWorkspaceShell(view, attachments, timeline)
```

Access remains course-entitlement RLS + Spaces membership context from the spine. Timeline does not invent a second access model.

Hub sources are shared so attachments and timeline do not duplicate Learning service queries on the workspace page.

## Timeline contract

Each item:

| Field | Notes |
| --- | --- |
| `id` | Deterministic synthetic id |
| `source` | `community` \| `assignments_projects` \| `tutor` \| `live` |
| `eventType` | Source-specific event |
| `title` / `summary` | Display copy |
| `timestamp` | ISO string or null |
| `href` | Deep link into existing Learning routes |
| `importance` | `high` \| `normal` \| `low` |
| `unread` | Attention flag (not a messaging unread store) |
| `availability` | Item-level availability |

Sorted newest first. No persistence. No realtime.

## Sources integrated

| Source | Events |
| --- | --- |
| Community | `latest_discussion`, `latest_reply`, `unanswered_discussion` |
| Assignments / Projects | `assignment_published`, `submission_created`, `due_soon`, `graded` |
| AI Tutor | `latest_conversation`, `latest_summary`, `continue_session` (`sharedMemory` never used) |
| Live | `session_scheduled`, `session_started`, `session_completed`, `recording_available` (only when source payload exposes recording fields) |

## UI

Extended `CollaborationWorkspaceShell` with an **Activity Timeline** section below attachments. Empty / unavailable placeholders when no items or all sources failed.

## No migration decision

All data comes from existing Learning tables/RPCs via shared hub sources. No new persistence.

## Exclusions

- Realtime / websockets / presence
- Push notifications
- Chat / shared documents
- Shared AI Tutor memory
- Commerce / Stripe / payouts / refunds
- Fake timeline rows

## Module map

| Layer | Path |
| --- | --- |
| Contract | `lib/learning/collaborationWorkspaceTimeline.ts` |
| Shared sources | `loadCollaborationWorkspaceHubSources` in `collaborationWorkspaceAttachments.ts` |
| Tests | `lib/learning/collaborationWorkspaceTimeline.test.ts` |
| Shell | `app/components/learning/CollaborationWorkspaceShell.tsx` |
| Route | `app/learning/courses/[courseId]/workspace/page.tsx` |
