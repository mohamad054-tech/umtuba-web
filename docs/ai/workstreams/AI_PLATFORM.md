# AI Platform Workstream (Desktop-owned)

## SAVE POINT — 2026-07-29 (Desktop)

**Machine:** Desktop
**Active work:** AI Personalization & Recommendation Foundation V1

| Item | Value |
| --- | --- |
| Active branch | `office/ai-core-provider-foundation-v1` |
| Base HEAD | `33d6653` — usage and cost tracking foundation |
| Remote | Synced before this task; **no commit/push until verification GO** |
| Do not merge / no PR unless asked | Yes |

**Done this session (Desktop):**
1. User Interest Profile Foundation
2. Content Profile Foundation
3. Recommendation signal types + validation
4. Scoring / ranking / diversity contracts
5. Candidate source interfaces (following/interests/trending/new/similar/sponsored)
6. Personalization Engine Foundation + future hooks (embeddings/vector/semantic/RL)
7. Tests + docs

**NOT done / do not touch by mistake:**
- UI / App Router / Learning / Commerce / Creator / Nexus
- DB persistence / migrations
- Real ML ranking, embeddings, or vector search
- Direct Video/Learning/Commerce wiring

---

**Ownership:** Desktop owns Shared AI Core.
**Laptop owns:** user-facing presentation.

## Status

Provider Foundation V1 closed.
Model Registry & Routing Policies V1 closed.
Usage & Cost Tracking Foundation V1 closed.
Personalization & Recommendation Foundation V1 implemented (server-side, in-memory, domain-agnostic).

## Personalization Platform (V1)

```
Product domains (later)
  → AiPersonalizationEngine.recommend / ingestSignal
  → candidate sources (interfaces)
  → diversity penalties (contract)
  → scoring + deterministic rank
  → ranked recommendations
```

This is the **shared personalization reference** for Video Feed, Discover, Learning, Commerce, Creator, Ads, World, and Search — not a video-only engine.

| Piece | Role |
| --- | --- |
| User / Content profiles | In-memory foundations |
| Signal types | impression→report allowlist, fail-closed |
| Candidate sources | Contract registry only |
| Ranking pipeline | Deterministic score sort (no ML) |
| Diversity layer | Topic/creator penalty contracts |
| Future hooks | embeddings, vector search, semantic similarity, recommendation models, RL |

**No UI. No DB. No domain product wiring in this phase.**

## Migration status

Uses existing `20260871` only. **No new migration.**
