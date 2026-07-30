# Current Task

## Task title

AI Core Anthropic Adapter V1

## Status

`implementation-complete` — Anthropic provider adapter wired into Shared AI Core; staged for manual commit (no trailers). Not pushed.

## Resume here (next session / next GO)

1. Worktree: `C:\Users\1\Desktop\umtuba\umtuba-web-ai-anthropic-adapter-v1`
2. Branch: `office/ai-core-anthropic-adapter-v1` (from Gemini tip `2867a5e`)
3. Manual commit (no Co-authored-by / Signed-off-by / trailers)
4. Push when approved; confirm `0 0`
5. Do **not** merge into alpha without explicit GO

## Branch

`office/ai-core-anthropic-adapter-v1`

## Exact refs

| Ref | Hash / path |
|-----|-------------|
| Base | `2867a5e90119aa152cbec5dd868207b38d1d474b` (Gemini Adapter V1) |
| Worktree | `C:\Users\1\Desktop\umtuba\umtuba-web-ai-anthropic-adapter-v1` |

## Allowed scope

- Shared AI provider layer only (`lib/ai/providers/**`, config, model registry wiring, related tests, AI handoff docs, `.env.example`)

## Forbidden scope

- Learning / Creator / Commerce / RPCs / DB / UI / server actions (except diagnostics registry args)
- Streaming enablement
- Local provider adapter
- Alpha merge
- Commit/push without GO

## Done

- `createAnthropicAdapter` + registry + foundation selection
- OpenAI / Gemini / Anthropic interchangeable via existing resolution
- Fail-closed without `ANTHROPIC_API_KEY`
- Structured JSON via prompt-steered JSON + fail-closed parse (no illegal open-object `output_config`)
- Default model `claude-haiku-4-5-20251001` (exact dated stable snapshot)
- Streaming not enabled (`streamingSupport: false`)
- Tests + `tsc` pass

## Out of scope / next

Local / self-hosted adapter, live Anthropic smoke, alpha merge.
