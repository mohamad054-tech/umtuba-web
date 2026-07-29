# AI Platform Workstream (Desktop-owned)

## SAVE POINT — 2026-07-29 (Desktop)

**Machine:** Desktop
**Active work:** AI Core Usage & Cost Tracking Foundation V1

| Item | Value |
| --- | --- |
| Active branch | `office/ai-core-provider-foundation-v1` |
| Base HEAD | `9e390cf` — model registry & routing policies |
| Remote | Synced before this task; **no commit/push until verification GO** |
| Do not merge / no PR unless asked | Yes |

**Done this session (Desktop):**
1. Unified usage tracking record (request/capability/provider/model/status/time/tokens/cost/timestamp)
2. Independent `AiUsageTracker` + `AiCostTracker` (in-memory, no DB)
3. `recordUsageAfterExecution` / aiService post-execution recording (deduped)
4. Extension hooks reserved: billing / quotas / dashboards / analytics / tenant accounting
5. Tests + docs

**NOT done / do not touch by mistake:**
- Learning UI / Home / Navigation / Creator / App Shell / Shared UI (Laptop)
- DB persistence / migrations for usage
- Real billing or quota enforcement
- No new migration; do not remote-apply `20260871`

---

**Ownership:** Desktop owns Shared AI Core.
**Laptop owns:** user-facing presentation.

## Status

Provider Foundation V1 closed.
Model Registry & Routing Policies V1 closed.
Usage & Cost Tracking Foundation V1 implemented (server-side, in-memory).

## Usage & Cost Tracking (V1)

```
aiService.runCapability / gateway.execute
  → (after execution only)
  → recordUsageAfterExecution / recordAiServiceUsageAfterExecution
  → AiUsageTracker + AiCostTracker
  → optional extension hooks (noop)
  → legacy accounting mirror (diagnostics compat)
```

| Piece | Role |
| --- | --- |
| `AiUsageTrackingRecord` | Unified server-side usage contract |
| `AiUsageTracker` | Idempotent in-memory usage store |
| `AiCostTracker` | Deterministic cost estimate / zero / unavailable |
| Extension hooks | billing, quotas, dashboards, analytics, tenant accounting |

**No UI exposure** of raw tracking records. **No DB** in this phase.

## Migration status

Uses existing `20260871` only. **No new migration.**

## Next (after commit approval)

Optional: persist usage tables, activate billing/quota hooks.
