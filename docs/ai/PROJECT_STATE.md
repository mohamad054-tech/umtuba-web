# UMTUBA Project State (AI Handoff)

## Project

**UMTUBA** (`umtuba-web`) — AI Platform execution machine

## Primary working branch

`alpha-0.2` @ `4690bb743374a06d9e884d5fc827fde8c738d83d` — Shared AI Core providers (OpenAI/Gemini/Anthropic/Local)

## Active feature (this machine — AI)

- **Branch:** `office/ai-core-provider-streaming-foundation-v1`
- **Task:** AI Core Provider Streaming Foundation V1
- **Worktree:** `D:\umtuba-central\repos\umtuba-web-ai-core-provider-streaming-foundation-v1`
- **See:** `docs/ai/CURRENT_TASK.md`

## Closed on alpha-0.2 (do not reopen)

- Shared AI Core Provider Foundation + OpenAI / Gemini / Anthropic / Local adapters (`4690bb7`)
- AI Hub / Assistant foundations (product flags default OFF)

## Gates (unchanged defaults)

- AI product flags default OFF (`UMTUBA_AI_HUB`, `UMTUBA_AI_ASSISTANT_RUNTIME`, …)
- Provider streaming default OFF (`UMTUBA_AI_STREAMING`)

## Integration status (AI)

| Track | Status |
| --- | --- |
| Shared AI Core providers | On alpha @ `4690bb7` |
| Provider Streaming Foundation V1 | Feature branch (awaiting alpha GO) |
| Private AI / Catalog / Orchestration | Not on alpha yet |

## Source of truth

- **GitHub origin** is the source of truth for the repository.

## Safety defaults

- Follow `docs/DEVELOPMENT_WORKFLOW.md`.
- No live provider requests unless explicitly requested.
- No alpha merge without explicit GO.
- No Commerce / Learning / Collaboration / Mobile / Guardian work on this machine.
