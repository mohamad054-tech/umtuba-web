# UMTUBA Project State (AI Handoff)

## CURRENT COLLABORATION SOURCE OF TRUTH (2026-08-08)

| Item | Value |
| --- | --- |
| Branch | `office/collaboration-workspace-settings-lifecycle-ui-v1` |
| Remote | `origin/office/collaboration-workspace-settings-lifecycle-ui-v1` |
| Tip | Resource Link Mutation Runtime V1 INTEGRATED (`a2cd114` + docs closeout) |
| Worktree | `C:\Users\Admin\Desktop\umtuba\umtuba-web-collaboration-workspace-settings-lifecycle-ui-v1` |

### Closed (Collaboration)

- Settings & Lifecycle UI V1 + `20260917` APPLIED + VERIFIED
- Member Role Management UI V1 INTEGRATED / CLOSED on SoT
- Resource Link Foundation V1 INTEGRATED / CLOSED on SoT
- Resource Link Mutation Runtime V1 INTEGRATED / CLOSED on SoT
  - Migration `20260919` APPLIED + VERIFIED
  - RPCs live: create / update / delete resource link
  - Authenticated table grants remain SELECT-only; FORCE RLS on

### Ops forks (NOT SoT)

- Smoke / keepalive — NOT SoT; stale Collaboration `20260898` = DO NOT APPLY
- Remote `20260898` = Commerce

### Deferred

- Resource-link product bindings (Learning / Commerce / advertiser)
- Invite expansion
- Credentialed E2E role-update / mutation smoke

### Flag

default `false`

### UM Core (separate)

P16 @ `3120432` closed. Do not start P17 from this handoff.

### Commerce

**Owned by desktop — do not touch.**

## Primary working branch

`office/collaboration-workspace-settings-lifecycle-ui-v1` (Collaboration SoT)
