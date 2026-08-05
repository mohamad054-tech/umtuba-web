# Collaboration gate-off checks (readiness)

Namespace: `UMTUBA_COLLABORATION_E2E_20260803`

When `COLLABORATION_PLATFORM_ENABLED` is unset/false:

1. Visiting `/workspaces` (and child routes) must hit `requireCollaborationPlatformPage` → Next.js `notFound()`.
2. Server actions in `app/actions/collaboration.ts` must return  
   `{ ok: false, message: "Request could not be completed." }` via  
   `rejectIfCollaborationPlatformDisabled`.
3. User menu Workspaces item must not appear unless the public mirror is explicitly on **and** primary flag is unset (menu discovery only — routes still server-gated).

Automated coverage today:

- `lib/collaboration/collaborationPlatformGate.test.ts`
- `lib/collaboration/collaborationSmokeE2eReadiness.test.ts`
- `e2e/collaboration/smoke/platform-gate.spec.ts` (skipped unless `COLLABORATION_E2E=1` + `PLAYWRIGHT_BASE_URL`)

No remote SQL mutation in gate-off readiness.
