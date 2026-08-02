# Current Task

## CURRENT LAPTOP SOURCE OF TRUTH

- **Remote tip:** `origin/office/collaboration-workspace-ui-foundation-v1` @ `cfd8a2889edab7a1767fba8716cce975ffe75def`
- **CURRENT WORKTREE:** `C:\Users\Admin\Desktop\umtuba\umtuba-web-collaboration-workspace-ui-foundation-v1`
- **CURRENT BRANCH:** `office/collaboration-workspace-ui-foundation-v1`

## CLOSED MILESTONES (laptop)

| Milestone | Commit |
| --- | --- |
| Learning AI Tutor Learner UI Integration V1 | `c3168eff3a324979efa5cab694e294c4daeeb4da` |
| Collaboration Workspace Spine Foundation V1 | `321e7e8de95d81efecfa423b7c515d36afa84a75` |
| Collaboration Workspace Membership & Invitation Runtime V1 | `c3bf87e7f6ec2cbcb0b8e1812c0cac58b20594af` |
| Collaboration Workspace UI Foundation V1 | `cfd8a2889edab7a1767fba8716cce975ffe75def` |

## REMOTE MIGRATIONS APPLIED

- `20260896` — collaboration workspace spine foundation v1
- `20260897` — collaboration workspace membership runtime v1

## COLLABORATION FLAG

- Default **`false`** (`COLLABORATION_PLATFORM_ENABLED` env; compile-time constant false)
- When disabled: User menu Workspaces hidden; `/workspaces/**` → `notFound()`; collaboration server actions fail-closed

## COMMERCE

- Owned by **desktop**
- Do **not** touch on laptop (no edit / commit / push / cleanup of Commerce worktrees)

## NEXT TASK

**Collaboration Workspace Settings & Lifecycle UI V1**

### Scope

- Workspace basic settings
- Rename / description / allowed kind updates
- Leave workspace
- Suspend / remove member
- Transfer ownership
- Archive workspace
- Last-owner protection

### Out of scope

- Learning binding
- Commerce
- UEOS
- Billing

## Status

Laptop handoff save point — resume from Source of Truth above.
