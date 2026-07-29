# AI Platform Workstream (Desktop-owned)

## SAVE POINT — 2026-07-29 (Desktop)

**Machine:** Desktop
**Active work:** AI Assistant Foundation V1

| Item | Value |
| --- | --- |
| Active branch | `office/ai-core-provider-foundation-v1` |
| Base HEAD | `63a4a45` — video personalization signals wiring |
| Remote | Synced; **no commit/push until verification GO** |
| Do not merge / no PR unless asked | Yes |

**Done this session (Desktop):**
1. Assistant conversation contracts (conversation / message / response / tool / system / metadata)
2. Conversation context assembly (memory, knowledge, personalization, user, domain) — no RAG
3. Skills registry (learning, commerce, creator, search, world, assistant, video, marketing, ads)
4. Tool invocation framework (catalog only; invoke fail-closed / not implemented)
5. Deterministic skill routing by `requestKind` (prompt text ignored)
6. Future hooks reserved: multi-agent, planner, tool chaining, long conversations, voice, multimodal, reasoning
7. Tests + docs

**NOT done:**
- No Chat UI / App Router / pages
- No new providers / DB / migrations
- No skill execution / tool execution / RAG
- Skills do **not** bind to providers or models

---

## Assistant Foundation (`lib/ai/assistant/`)

Cross-product Shared AI Core consumer surface — **not** Learning-specific.

| Layer | Role |
| --- | --- |
| Contracts | conversation, message, assistant response, tool request/response, system context, metadata |
| Context assembly | Ordered blocks; `usedRag: false` / `usedVectorSearch: false` |
| Skills registry | Definitions + allowed tools; `providerBindingForbidden: true` |
| Tool framework | Registered tools with `available: false`; invoke → `tool_not_implemented` |
| Routing | `assistant_skill_route_v1` — requestKind owns skill selection |

Privacy: no system prompts to clients; no provider/model internals; bounded user context (not full profile); fail-closed.

## Prior: Video Personalization Signals Wiring

Flag `UMTUBA_AI_VIDEO_PERSONALIZATION` default OFF. Feed order unchanged. Unwired: hide / not_interested / report.

## Migration status

No new migration.
