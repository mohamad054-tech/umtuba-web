# Collaboration Platform Gate Keepalive V1

Capability: `collaboration.ops.platform_gate_keepalive_v1`  
Base tip: Collaboration Smoke E2E on Settings tip (`850421d`)  
Branch: `office/collaboration-platform-gate-keepalive-v1`

## Purpose

Keepalive verification that the Collaboration Platform exposure gate remains
**fail-closed by default** after the smoke/E2E readiness milestone.

This does **not** reopen completed smoke readiness work and does **not** enable
the platform in production.

## Gate commands

```bash
npx vitest run lib/collaboration/collaborationPlatformGate.test.ts
npx tsc --noEmit
```

## Preserve fail-closed

- `COLLABORATION_PLATFORM_ENABLED` unset → false
- Disabled routes → `notFound()`
- Disabled actions → generic rejection message (no feature teaser)
- Do not weaken assertions merely to pass CI

## Out of scope

- Commerce
- Learning course↔workspace binding
- Migration apply
- Credentialed Playwright mutation
