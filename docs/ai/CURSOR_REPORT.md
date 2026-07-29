# CURSOR_REPORT — AI Core Model Registry & Routing Policies Foundation V1

## Summary

Implemented Model Registry & Routing Policies Foundation V1 on branch `office/ai-core-provider-foundation-v1`. Shared AI Core now has a formal model catalog (priority, fallbackOrder, capability/modality metadata, limits) and a Routing Policy Engine independent of aiService. The gateway selects models only through `createRoutingPolicyEngine`. Capabilities do not pick models. Extension hooks for cost/latency/region/tenant are reserved as no-ops. Learning Tutor remains compatible. No UI. No migration. No commit/push pending GO.

## Exact files changed

### Created
- `lib/ai/models/modelRegistryTypes.ts`
- `lib/ai/models/modelRegistry.ts`
- `lib/ai/routing/policyTypes.ts`
- `lib/ai/routing/policyEngine.ts`
- `lib/ai/routing/policyEngine.test.ts`

### Modified
- `lib/ai/providers/foundation.ts` (resolveRoute delegates to policy engine)
- `lib/ai/gateway/execute.ts` (uses Routing Policy Engine)
- `lib/ai/services/aiService.ts` (documents policy-backed flow)
- `lib/ai/index.ts`
- `lib/ai/providers/foundation.test.ts`
- `docs/ai/workstreams/AI_PLATFORM.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

None.

## Security review

- Selection remains server-side; capabilities/aiService do not hardcode or choose models.
- Unknown / disabled / unsupported / unregistered paths fail closed.
- Extension hooks are noop and do not leak tenant/region data to clients.
- Client contracts unchanged (provider/model internals still stripped at Learning Tutor boundary).

## Tests

Targeted vitest: policy engine + foundation + existing AI/Learning suites. See verification report in chat.

## TypeScript

`npx tsc --noEmit` — see verification report.

## Build

Not required (no UI entry pages).

## git diff --check

See verification report.

## git status --short

AI Core routing/model registry + docs only for this task.

## Open issues

- Awaiting GO before commit/push.
- cost/latency/region/tenant routing intentionally not implemented (hooks only).
