# Collaboration Learning Link/Unlink E2E Provisioning V1

Capability: `collaboration.ops.learning_link_unlink_e2e_provisioning_v1`  
Namespace: `UMTUBA_COLLABORATION_LEARNING_LINK_E2E_20260808`  
SoT branch: `office/collaboration-workspace-settings-lifecycle-ui-v1`

## Purpose

SoT-owned **opt-in** credentialed E2E foundation for re-running:

`COLLABORATION_WORKSPACE_LEARNING_RESOURCE_LINK_UNLINK_CREDENTIALED_E2E_SMOKE_V1`

This milestone ships harness/templates only. It does **not** invent Auth users
and does **not** enable the Collaboration platform flag in production.

## Target classification

| Preference | Status |
| --- | --- |
| A. Local Supabase / local app | **Preferred** |
| B. Dedicated non-production remote | Allowed with operator approval |
| C. Production linked project | **Blocked** for automatic Auth/user creation |

Parent `.env.local` may point at a remote Supabase host. That alone is **not**
approval to create production Auth users.

## Harness inventory

| Area | Path |
| --- | --- |
| Contracts | `lib/collaboration/learningResourceLinkUnlinkE2eProvisioning.ts` |
| Structural tests | `lib/collaboration/learningResourceLinkUnlinkE2eProvisioning.test.ts` |
| Config example | `scripts/collaboration-e2e/config.example.sql` |
| Seed example | `scripts/collaboration-e2e/seed-learning-link-unlink-sandbox.example.sql` |
| Cleanup example | `scripts/collaboration-e2e/cleanup-learning-link-unlink-sandbox.example.sql` |
| Operator steps | `scripts/collaboration-e2e/OPERATOR_PROVISIONING.md` |
| Gate-off notes | `scripts/collaboration-e2e/run-gate-off-checks.md` |
| Playwright | `e2e/collaboration/**` |

## Opt-in env (names only)

```text
COLLABORATION_E2E=1
PLAYWRIGHT_BASE_URL=
COLLABORATION_PLATFORM_ENABLED=1   # E2E app process only
COLLABORATION_E2E_OWNER_EMAIL=
COLLABORATION_E2E_OWNER_PASSWORD=
COLLABORATION_E2E_PEER_EMAIL=
COLLABORATION_E2E_PEER_PASSWORD=
# optional:
COLLABORATION_E2E_WORKSPACE_ID=
COLLABORATION_E2E_LEARNING_SPACE_ID=
```

Never commit `.env.local` or `scripts/collaboration-e2e/config.local.sql`.

## Fixed disposable fixtures

| Entity | UUID / slug |
| --- | --- |
| Workspace | `e2e0808c-2026-4001-8000-000000000001` / `e2e-collab-ws-link-20260808` |
| Learning Space | `e2e0808c-2026-4001-8000-000000000011` / `e2e-collab-learning-link-20260808` |

Owner: Collaboration `owner` + Learning Space `owner`  
Peer: Collaboration `member` (no `manage_workspace`); unauthorized mutation case reuses peer.

## Auth / session strategy

- Create dedicated Auth users via Supabase Auth UI or Admin API (never SQL insert)
- Browser login via `/login` form (`signInWithEmail`)
- No session injection
- No service-role browser path
- Service-role/linked SQL may seed fixtures only (Store E2E convention)

## Platform gate

- Default compile-time / unset env: fail-closed
- Gate-off Playwright probe skipped unless `COLLABORATION_E2E=1`
- Enabled only when operator sets `COLLABORATION_PLATFORM_ENABLED=1` for the E2E app process

## How to run (after operator provisioning)

```bash
npx vitest run lib/collaboration/learningResourceLinkUnlinkE2eProvisioning.test.ts lib/collaboration/collaborationPlatformGate.test.ts lib/collaboration/learningWorkspaceResourceBinding.test.ts
npx tsc --noEmit
npx playwright test -c e2e/collaboration/playwright.config.ts
```

Until credentials exist, Playwright specs remain **SKIPPED_NO_CREDENTIALS**.

## Out of scope

- Commerce / advertiser bindings
- Creating Auth users automatically against production
- Weakening RLS / authorization
- Schema migrations
