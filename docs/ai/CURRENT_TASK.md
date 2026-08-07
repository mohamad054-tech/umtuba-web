# Current Task

## ACTIVE FEATURE BRANCH (not SoT)

- **Milestone:** `COLLABORATION_WORKSPACE_RESOURCE_LINK_MUTATION_RUNTIME_V1`
- **Branch:** `office/collaboration-workspace-resource-link-mutation-runtime-v1`
- **Base SoT HEAD:** `9e140fd4642f5f2bd0b304d3956bdba1028f1e84`
- **Worktree:** `C:\Users\Admin\Desktop\umtuba\umtuba-web-collaboration-workspace-settings-lifecycle-ui-v1`
- **Do not merge to SoT in this task.**

## Goal

Authenticated Collaboration-internal mutation runtime for workspace resource links
over existing `collaboration_workspace_resource_links`. SECURITY DEFINER RPCs
required (authenticated grants are SELECT-only). Migration created locally only —
**do not apply remotely**. No product bindings. Platform flag stays `false`.

## Allowed scope

- `lib/collaboration/workspaceResourceLinkMutationRuntime.ts` (+ tests)
- spine RPC name exports if needed
- local migration `20260919_collaboration_workspace_resource_link_mutation_runtime_v1.sql`
- `docs/ai/CURRENT_TASK.md` / `CURSOR_REPORT.md`

## Forbidden scope

- Learning / Commerce / advertiser bindings
- Platform flag enablement
- Remote migration apply
- Broad UI / invite expansion / smoke-keepalive / UM Core P17
- Touching `20260898` or `20260917`

## CLOSED ON SoT (do not redo)

- Resource Link Foundation V1 INTEGRATED
- Settings / Membership / Role Management
- `20260917` APPLIED + VERIFIED
