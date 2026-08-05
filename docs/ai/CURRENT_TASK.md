# Current Task

## Task title

AI Core Provider Streaming Foundation V1

## Status

`implementation-complete` — Feature branch pushed; **not yet FF-merged into alpha-0.2**

## Resume here (next session / next GO)

1. Confirm branch `office/ai-core-provider-streaming-foundation-v1`
2. Confirm sync with origin: `0 0`
3. Confirm `origin/alpha-0.2` is ancestor of feature (`YES`)
4. **Next GO only (separate step):** Fast-Forward merge into `alpha-0.2` + push alpha
5. Do **not** start the next AI milestone until this lands on alpha (or continue parallel only on a new worktree after this closes)

## Branch

`office/ai-core-provider-streaming-foundation-v1`

## Worktree

`D:\umtuba-central\repos\umtuba-web-ai-core-provider-streaming-foundation-v1`

## Base

`origin/alpha-0.2` @ `4690bb7` (providers onto alpha)

## Done (feature — locked contract)

- `lib/ai/providers/streaming.ts` — SSE helpers + `assertStreamingAllowed`
- Adapter `stream()` on stub / OpenAI / Gemini / Anthropic / Local
- Operator gate `UMTUBA_AI_STREAMING` (default OFF); structured streaming fail-closed
- Model registry `streamingSupport` mirrors config gate
- Mocked unit tests only (no live provider calls)

## Not done yet

- FF-merge into `alpha-0.2` (explicit GO required)
- Gateway/HTTP SSE product surface (deferred)
- Structured-output streaming (deferred)

## Out of scope

Commerce / Learning / Collaboration / Mobile / Guardian / live keys / alpha merge without GO
