# Current Task

## Task title

AI Core Local / Self-hosted Adapter V1

## Status

`implementation-complete` — Local OpenAI-compatible provider adapter wired into Shared AI Core; staged for manual commit (no trailers). Not pushed.

## Resume here (next session / next GO)

1. Worktree: `C:\Users\1\Desktop\umtuba\umtuba-web-ai-local-adapter-v1`
2. Branch: `office/ai-core-local-adapter-v1` (from Anthropic tip `fe07a1c`)
3. Manual commit (no Co-authored-by / Signed-off-by / trailers)
4. Push when approved; confirm `0 0`
5. Do **not** merge into alpha without explicit GO

## Branch

`office/ai-core-local-adapter-v1`

## Exact refs

| Ref | Hash / path |
|-----|-------------|
| Base | `fe07a1cde0bd90761c21eda4c9277b1077767e0c` (Anthropic Adapter V1) |
| Worktree | `C:\Users\1\Desktop\umtuba\umtuba-web-ai-local-adapter-v1` |

## Allowed scope

- Shared AI provider layer only (`lib/ai/providers/**`, config, model registry wiring, related tests, AI handoff docs, `.env.example`)

## Forbidden scope

- Learning / Creator / Commerce / RPCs / DB / UI / server actions (except diagnostics registry args)
- Streaming enablement
- Inventing cloud-vendor model IDs for local
- Alpha merge
- Commit/push without GO

## Done

- `createLocalAdapter` + registry + foundation selection
- OpenAI / Gemini / Anthropic / Local interchangeable via existing resolution
- Fail-closed without both `LOCAL_AI_BASE_URL` and `LOCAL_AI_MODEL` (no default localhost / no default model id)
- Optional `LOCAL_AI_API_KEY` Bearer when set
- Structured JSON via prompt-steered JSON + fail-closed parse (no `response_format` — local servers unreliable)
- Streaming not enabled (`streamingSupport: false`)
- Tests + `tsc` pass

## Out of scope / next

Live local/Ollama smoke, streaming, alpha merge, product-surface wiring.
