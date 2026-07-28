# AI Platform Workstream (Desktop-owned)

## SAVE POINT — 2026-07-29 (Desktop)

**Machine:** Desktop
**Active work:** UMTUBA AI Hub Experience Foundation V1

| Item | Value |
| --- | --- |
| Active branch | `office/ai-core-provider-foundation-v1` |
| Base HEAD | `4632eac` — AI Hub foundation |
| Remote | Synced; **no commit/push until verification GO** |
| Do not merge / no PR unless asked | Yes |

**Done this session (Desktop):**
1. Isolated AI Hub Shell (not product App Shell / AppTopNav)
2. AI Home at `/ai-hub` — module grid + status/recs/activity/favorites/capabilities
3. Assistant Entry at `/ai-hub/assistant` (no conversation execution)
4. Server action `loadAiHubExperienceAction` over Hub Foundation snapshot
5. Flag `UMTUBA_AI_HUB` default OFF → `notFound()` (production unchanged)
6. Tests + docs

**NOT done:**
- No product Home / Navigation / App Shell edits
- No skill/tool/conversation/RAG/voice execution
- No providers / DB / migrations

---

## AI Hub Experience (`/ai-hub`)

| Item | Value |
| --- | --- |
| Flag | `UMTUBA_AI_HUB` (`1`/`true` only) |
| OFF | Routes return `notFound()` |
| ON | Authenticated users see Hub Home / Assistant Entry |
| Shell | `AiHubShell` — Hub-local only |
| Data | `loadAiHubSnapshot` via `app/actions/aiHub.ts` |

### Screens
- `/ai-hub` — AI Home
- `/ai-hub/assistant` — Assistant Entry only

## Prior foundations

- AI Hub Foundation (`lib/ai/hub/`)
- Assistant Runtime (`UMTUBA_AI_ASSISTANT_RUNTIME`)

## Migration status

No new migration.
