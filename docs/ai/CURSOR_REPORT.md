# CURSOR_REPORT — AI Core Provider Streaming Foundation V1

## Summary

Provider Streaming Foundation V1 on
`office/ai-core-provider-streaming-foundation-v1` — opt-in adapter `stream()`,
SSE parsers, `UMTUBA_AI_STREAMING` gate (default OFF), registry
`streamingSupport`, mocked tests only. **Not merged to alpha** (awaiting GO).

## Exact refs

| Ref | Value |
|-----|-------|
| Worktree | `D:\umtuba-central\repos\umtuba-web-ai-core-provider-streaming-foundation-v1` |
| Branch | `office/ai-core-provider-streaming-foundation-v1` |
| Base | `origin/alpha-0.2` @ `4690bb7` |
| Sync | confirm after push |

## Feature files

- `lib/ai/providers/streaming.ts`
- `lib/ai/providers/streaming.test.ts`
- Adapter `stream()`: `adapters.ts`, `anthropicAdapter.ts`, `geminiAdapter.ts`, `localAdapter.ts`
- `lib/ai/models/registry.ts` (`streamingEnabled` → `streamingSupport`)
- `lib/ai/config.ts` / `.env.example` (`UMTUBA_AI_STREAMING`)

## Migrations created

None.

## Security review

- Streaming fail-closed unless `UMTUBA_AI_STREAMING=1/true`
- Structured streaming rejected
- No live provider calls in tests
- Secrets stay server-side; sanitize on errors

## Next

1. Explicit GO → FF merge into `alpha-0.2`
2. Next AI milestone: Private AI Foundation onto alpha (or Gateway streaming HTTP surface)
