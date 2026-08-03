# Collaboration Smoke & E2E Readiness V1

Capability: `collaboration.ops.smoke_e2e_readiness_v1`  
Namespace: `UMTUBA_COLLABORATION_E2E_20260803`  
Base tip: Collaboration Workspace UI Foundation V1 (`b002402` parent chain)

## Purpose

Repository-grounded smoke/E2E **readiness** for the completed Collaboration Platform chain:

1. Spine Foundation (`20260896`)
2. Membership Runtime (`20260897`)
3. UI Foundation (`/workspaces` overlay)

This milestone does **not** run credentialed remote mutation and does **not** enable the platform flag in production.

## Audited critical flows

| Flow | Readiness coverage |
| --- | --- |
| Platform gate fail-closed | Vitest + layout/actions wiring; Playwright skip-gated gate-off check |
| List my workspaces | Adapter inventory + `/workspaces` route |
| Workspace detail | Adapter + `/workspaces/[workspaceId]` |
| Members list | Adapter + UI `data-testid` |
| Invites list | Adapter + UI `data-testid` |
| Create workspace | Runtime + dialog + server action gate |
| Invite member | Runtime + form + action gate |
| Invite redeem | `/workspaces/invite` + accept/decline actions |
| Shell navigation | `collaboration-shell` / `collaboration-nav` test ids |

## How to run (local CI-safe)

```bash
npx vitest run lib/collaboration/collaborationSmokeE2eReadiness.test.ts lib/collaboration/collaborationPlatformGate.test.ts
npx tsc --noEmit
```

Optional Playwright (skipped unless env set):

```bash
# Requires: COLLABORATION_E2E=1 PLAYWRIGHT_BASE_URL=… COLLABORATION_PLATFORM_ENABLED=0|1
npx playwright test -c e2e/collaboration/playwright.config.ts
```

## Future credentialed E2E (deferred)

1. Create dedicated Auth users via Auth UI/Admin API (never `INSERT auth.users` from SQL).
2. Copy `scripts/collaboration-e2e/config.example.sql` → `config.local.sql` (gitignored).
3. Enable `COLLABORATION_PLATFORM_ENABLED=1` only in isolated environments.
4. Set `COLLABORATION_E2E=1` + owner/peer emails/passwords + `PLAYWRIGHT_BASE_URL`.

Until then, authenticated browser paths remain **SKIPPED_NO_CREDENTIALS**.

## Out of scope

- Commerce / Store / Stripe
- Learning course↔workspace binding (`/learning/courses/.../workspace`)
- LiveKit / realtime / chat / shared docs
- AI Tutor lifecycle seed
- Workspace Settings & Lifecycle UI (next product milestone)
- Blind copy of uncommitted files from other worktrees

## Safety

- Platform default: **fail-closed** (`COLLABORATION_PLATFORM_ENABLED` unset → false)
- Disabled routes: `notFound()` via `requireCollaborationPlatformPage`
- Disabled actions: `rejectIfCollaborationPlatformDisabled` → generic message
- No secrets in this document
