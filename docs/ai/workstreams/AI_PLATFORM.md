# AI Platform Workstream (Desktop-owned)

## SAVE POINT — 2026-07-29 (Desktop)

**Machine:** Desktop
**Active work:** UMTUBA AI Hub Foundation V1

| Item | Value |
| --- | --- |
| Active branch | `office/ai-core-provider-foundation-v1` |
| Base HEAD | `0ffc6f5` — assistant runtime integration |
| Remote | Synced; **no commit/push until verification GO** |
| Do not merge / no PR unless asked | Yes |

**Done this session (Desktop):**
1. AI Hub navigation catalog (9 modules)
2. Capability registry (Core + domain + coming_soon cards)
3. Assistant entry (no chat / skills / tools / conversations)
4. Recent activity + favorites contracts (in-memory)
5. Hub recommendations over Personalization Foundation
6. Runtime status from AI Core (sanitized)
7. Feature flag `UMTUBA_AI_HUB` default OFF
8. Tests + docs

**NOT done:**
- No Hub UI / App Shell / Home / App Router pages
- No existing product navigation changes
- No skill/tool/conversation execution
- No providers / DB / migrations

---

## AI Hub Foundation (`lib/ai/hub/`)

| Item | Value |
| --- | --- |
| Flag | `UMTUBA_AI_HUB` (`1`/`true` only) |
| Entry API | `loadAiHubSnapshot({ userId })` |
| OFF behavior | Empty disabled snapshot (fail-closed) |
| ON behavior | Navigation + capabilities + assistant entry + activity/favorites/recs + runtime status |
| Non-goals | `executedConversations/Skills/Tools: false` |

### Navigation modules
AI Assistant · My AI · Learning AI · Creator AI · Commerce AI · Search AI · World AI · Marketing AI · Ads AI

## Prior

- Assistant Runtime (`UMTUBA_AI_ASSISTANT_RUNTIME`, default OFF)
- Assistant Foundation, Video personalization wiring

## Migration status

No new migration.
