# AI Platform Workstream (Desktop-owned)

## SAVE POINT — 2026-07-29 (Desktop)

**Machine:** Desktop  
**Active work:** AI Core Model Registry & Routing Policies Foundation V1

| Item | Value |
| --- | --- |
| Active branch | `office/ai-core-provider-foundation-v1` |
| Base HEAD | `069d170` — provider foundation |
| Remote | Synced before this task; **no commit/push until verification GO** |
| Do not merge / no PR unless asked | Yes |

**Done this session (Desktop):**
1. Formal Model Registry (`AiModelRegistry`) with priority, fallbackOrder, limits
2. Routing Policy Engine independent of aiService
3. Gateway selects via `createRoutingPolicyEngine` only
4. Extension hooks reserved for cost/latency/region/tenant (noop in V1)
5. Tests + docs

**NOT done / do not touch by mistake:**
- Learning UI / Home / Navigation / Creator / App Shell / Shared UI (Laptop)
- Unrelated local dirty Learning/Nexus files — leave unstaged
- Implementing cost/latency/region/tenant routing (hooks only)
- Do not remote-apply `20260871` without explicit approval
- No new migration for this layer

---

**Ownership:** Desktop owns Shared AI Core (providers, model registry, routing policies) + Learning Tutor backend.
**Laptop owns:** user-facing AI presentation wiring, Home, Navigation, Creator, App Shell, shared UI.

## Status

Shared AI Core Foundation V1 closed.
Provider Foundation V1 closed.
Model Registry & Routing Policies Foundation V1 implemented (server-side Shared AI Core only).

## Model Registry & Routing Policies (V1)

```
Capability / aiService
  → gateway.execute
  → createProviderFoundation(config)
  → createRoutingPolicyEngine(foundation)
  → routingPolicy.resolve(...)   // preferred / fallback / deterministic / fail-closed
  → requireAdapter(providerId)
  → adapter.execute(...)
```

| Piece | Role |
| --- | --- |
| `AiModelRegistry` | Formal catalog: model/provider ids, capabilities, modalities, enabled, priority, fallbackOrder, context/output limits |
| `AiRoutingPolicyEngine` | Selection layer — independent of aiService |
| Extension hooks | Reserved: cost / latency / region / tenant (noop until later) |
| Capabilities | Never select models directly |

**Policies supported now:** preferred model, explicit fallback chain, disabled rejection, unsupported capability rejection, deterministic ranking, fail-closed unknown provider/model.

**Reusable across:** Learning, Commerce, Creator, Ads, Games, and future Domain AI.

## Provider Foundation (V1)

Still the registration surface for providers/adapters. Routing Policy consumes Foundation + Model Registry.

## Public service boundary

```
Future Domain UI
  → named server actions / Domain adapters
  → aiService.runCapability
  → Shared AI Core gateway
  → Routing Policy Engine
  → Provider Foundation adapter
```

## Migration status

Uses existing Shared AI Core migration `20260871` (local only, not remote-applied). **No new migration.**

## Next (after commit approval)

Optional: activate cost/latency/region/tenant hooks. Live multi-provider adapters. Laptop UI wiring remains separate.
