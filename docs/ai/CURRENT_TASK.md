# Current Task

## Task title

AI Core Local on Gemini Recovery V1

## Status

`implementation-complete` — Local provider adapter ported onto Gemini recovery + Anthropic tip.

## Resume here (next session / next GO)

1. Worktree: `D:\umtuba-central\repos\umtuba-web-ai-core-local-on-gemini-recovery-v1`
2. Branch: `office/ai-core-local-on-gemini-recovery-v1`
3. Base: `origin/office/ai-core-anthropic-on-gemini-recovery-v1` @ `6447f33`
4. Confirm push sync `0 0`
5. Do **not** merge into alpha without explicit GO

## Branch

`office/ai-core-local-on-gemini-recovery-v1`

## Allowed scope

- Shared AI provider layer only (`lib/ai/providers/**`, config, model registry wiring, related tests, AI handoff docs, `.env.example`)

## Forbidden scope

- Learning / Creator / Commerce / Collaboration / Mobile / Guardian
- Streaming enablement
- Alpha merge
- Remote migration apply

## Done

- `createLocalAdapter` + registry + foundation selection on recovery tip
- OpenAI / Gemini / Anthropic / Local interchangeable via existing resolution
- Fail-closed without both `LOCAL_AI_BASE_URL` and `LOCAL_AI_MODEL`
- Optional `LOCAL_AI_API_KEY` Bearer when set
- Streaming not enabled

## Out of scope / next

Live local smoke, streaming, provider-lineage alpha merge GO.
