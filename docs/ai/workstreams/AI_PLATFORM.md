# AI Platform Workstream (Desktop-owned)

## SAVE POINT — 2026-07-29 (Desktop)

**Machine:** Desktop
**Active work:** AI Knowledge & Memory Foundation V1

| Item | Value |
| --- | --- |
| Active branch | `office/ai-core-provider-foundation-v1` |
| Base HEAD | `b9603fe` — personalization foundation |
| Remote | Synced before this task; **no commit/push until verification GO** |
| Do not merge / no PR unless asked | Yes |

**Done this session (Desktop):**
1. Knowledge Foundation + Knowledge Registry
2. Memory Foundation + Memory Registry (alongside existing `memory/policy.ts`)
3. Retrieval contracts (lexical only; no Vector DB / RAG)
4. Context Assembly Foundation
5. Future hooks: embeddings, indexing, vector/semantic retrieval, RAG, memory ranking
6. Tests + docs

**NOT done / do not touch by mistake:**
- UI / App Router / Learning / Commerce / Creator / Nexus
- DB / Vector DB / real RAG
- Direct Learning or Commerce product wiring

---

**Ownership:** Desktop owns Shared AI Core.
**Laptop owns:** user-facing presentation.

## Status

Provider / Registry / Routing / Usage / Personalization foundations closed.
Knowledge & Memory Foundation V1 implemented (server-side, in-memory, domain-agnostic).

## Knowledge & Memory Platform (V1)

```
Domain AI (later)
  → AiKnowledgeMemoryFoundation
  → Knowledge Registry / Memory Registry
  → retrieveKnowledgeAndMemory (contracts; lexical fallback)
  → assembleContext
  → future hooks (vector/RAG/embeddings) noop
```

Unified reference for Assistant, Video Personalization, Learning, Commerce, Creator, Ads, World, Search.

| Knowledge sources | Memory kinds |
| --- | --- |
| platform, course, commerce, creator, world, user, uploaded_documents, external | session, short-term, long-term, preference, interaction_history |

**No UI. No DB. No RAG execution in this phase.**

## Migration status

Uses existing `20260871` only. **No new migration.**
