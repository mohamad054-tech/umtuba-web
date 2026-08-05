# Current Task

## Task title

AI Core Anthropic on Gemini Recovery V1

## Status

`implementation-complete` — Anthropic provider adapter ported onto Gemini recovery tip.

## Resume here (next session / next GO)

1. Worktree: `D:\umtuba-central\repos\umtuba-web-ai-core-anthropic-on-gemini-recovery-v1`
2. Branch: `office/ai-core-anthropic-on-gemini-recovery-v1`
3. Base: `origin/office/ai-core-gemini-adapter-recovery-v1` @ `919dc75`
4. Confirm push sync `0 0`
5. Do **not** merge into alpha without explicit GO

## Branch

`office/ai-core-anthropic-on-gemini-recovery-v1`

## Exact refs

| Ref | Hash / path |
|-----|-------------|
| Base | `919dc75066eca875ab11172912c0841e532444fd` (Gemini Adapter Recovery V1) |
| Worktree | `D:\umtuba-central\repos\umtuba-web-ai-core-anthropic-on-gemini-recovery-v1` |

## Allowed scope

- Shared AI provider layer only (`lib/ai/providers/**`, config, model registry wiring, related tests, AI handoff docs, `.env.example`)

## Forbidden scope

- Learning / Creator / Commerce / RPCs / DB / UI / server actions (except diagnostics registry args)
- Streaming enablement
- Local provider adapter (next milestone)
- Alpha merge
- Remote migration apply

## Done

- `createAnthropicAdapter` + registry + foundation selection on recovery tip
- OpenAI / Gemini / Anthropic interchangeable via existing resolution
- Fail-closed without `ANTHROPIC_API_KEY`
- Structured JSON via prompt-steered JSON + fail-closed parse
- Default model `claude-haiku-4-5-20251001`
- Streaming not enabled (`streamingSupport: false`)

## Out of scope / next

Local / self-hosted adapter on this recovery lineage, live Anthropic smoke, alpha merge.
