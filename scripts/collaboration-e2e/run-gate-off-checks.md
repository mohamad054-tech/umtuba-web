# Collaboration Learning link/unlink — gate-off checks

Namespace: `UMTUBA_COLLABORATION_LEARNING_LINK_E2E_20260808`

When `COLLABORATION_PLATFORM_ENABLED` is unset/false:

1. `/workspaces` (and child routes) hit `requireCollaborationPlatformPage` → `notFound()`.
2. Server actions in `app/actions/collaboration.ts` (including Learning link/unlink)
   return `{ ok: false, message: "Request could not be completed." }` via
   `rejectIfCollaborationPlatformDisabled`.
3. No Learning resource-link mutation may persist while the gate is disabled.

Automated coverage:

- `lib/collaboration/collaborationPlatformGate.test.ts`
- `lib/collaboration/learningResourceLinkUnlinkE2eProvisioning.test.ts`
- `e2e/collaboration/smoke/platform-gate.spec.ts` (skipped unless `COLLABORATION_E2E=1` + `PLAYWRIGHT_BASE_URL`)

No remote SQL mutation in gate-off checks.
