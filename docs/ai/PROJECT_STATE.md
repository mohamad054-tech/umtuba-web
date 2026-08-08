# UMTUBA Project State (AI Handoff)

## CURRENT COLLABORATION SOURCE OF TRUTH (2026-08-08)

| Item | Value |
| --- | --- |
| Branch | `office/collaboration-workspace-settings-lifecycle-ui-v1` |
| Remote | `origin/office/collaboration-workspace-settings-lifecycle-ui-v1` |
| Tip | Learning Resource Link/Unlink UI V1 (on Learning Binding SoT) |
| Worktree | `C:\Users\Admin\Desktop\umtuba\umtuba-web-collaboration-workspace-settings-lifecycle-ui-v1` |

### Closed (Collaboration)

- Settings & Lifecycle UI V1 + `20260917` APPLIED + VERIFIED
- Member Role Management UI V1 INTEGRATED / CLOSED on SoT
- Resource Link Foundation V1 INTEGRATED / CLOSED on SoT
- Resource Link Mutation Runtime V1 INTEGRATED / CLOSED on SoT (`20260919` APPLIED + VERIFIED)
- Learning Resource Binding V1 INTEGRATED / CLOSED on SoT
  - Canonical target: Learning Space (`learning_spaces.id` → `learning_space`)
  - No migration; no Learning lifecycle mutation
- Learning Resource Link/Unlink UI V1 CLOSED on SoT
  - Settings panel: view / link / unlink via binding contracts

### Ops forks (NOT SoT)

- Smoke / keepalive — NOT SoT; stale Collaboration `20260898` = DO NOT APPLY
- Remote `20260898` = Commerce

### Deferred

- Commerce / advertiser resource-link bindings
- Invite expansion
- Credentialed E2E role-update / mutation / link-unlink smoke

### Flag

default `false`

### UM Core (separate)

P16 @ `3120432` closed. Do not start P17 from this handoff.

### Commerce

**Owned by desktop — do not touch.**

## Primary working branch

`office/collaboration-workspace-settings-lifecycle-ui-v1` (Collaboration SoT)
