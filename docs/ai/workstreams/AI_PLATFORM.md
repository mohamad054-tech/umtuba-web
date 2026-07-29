# AI Platform Workstream (Desktop-owned)

## SAVE POINT — 2026-07-29 (Desktop)

**Machine:** Desktop
**Active work:** AI Assistant Runtime Integration V1

| Item | Value |
| --- | --- |
| Active branch | `office/ai-core-provider-foundation-v1` |
| Base HEAD | `b335f87` — assistant foundation |
| Remote | Synced; **no commit/push until verification GO** |
| Do not merge / no PR unless asked | Yes |

**Done this session (Desktop):**
1. Assistant Runtime Service + pipeline (conversation → assembly → routing → aiService → sanitize)
2. Capability `assistant.runtime_turn` through Shared AI Core (prompt + stub + aiService)
3. Context sources from Knowledge / Memory / Personalization foundations (no RAG)
4. Feature flag `UMTUBA_AI_ASSISTANT_RUNTIME` default OFF
5. Fail-closed sanitization + server-only diagnostics
6. Tests + docs

**NOT done:**
- No Chat UI / App Router pages
- No skill execution / real tool invocation
- No new providers / DB / migrations

---

## Assistant Runtime (`lib/ai/assistant/runtime/`)

| Item | Value |
| --- | --- |
| Flag | `UMTUBA_AI_ASSISTANT_RUNTIME` (`1`/`true` only) |
| Capability | `assistant.runtime_turn` |
| Pipeline | Conversation → Context Assembly → Routing → AI Service → Sanitization |
| Skills/Tools | **Not executed** — routing selects skill id only |
| RAG | `usedRag: false` / `usedVectorSearch: false` |

Privacy: server `userId` only; no system prompts / provider / model / apiKey / raw memory|knowledge in sanitized responses.

## Prior foundations

- Assistant Foundation (contracts, skills registry, tool catalog, routing)
- Video personalization wiring (separate flag; feed order unchanged)

## Migration status

No new migration.
