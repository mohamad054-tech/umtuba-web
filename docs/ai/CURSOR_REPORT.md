# CURSOR_REPORT — AI Core Anthropic Adapter V1

## Summary

Added a fail-closed Anthropic Claude provider adapter behind existing
`AiProviderAdapter` contracts. `aiService.runCapability()` unchanged. OpenAI,
Gemini, and Anthropic are interchangeable via Provider Foundation / routing
policy when credentials are present. Streaming remains disabled. Staged; not
committed.

## Exact files created

- `lib/ai/providers/anthropicAdapter.ts`
- `lib/ai/providers/anthropicAdapter.test.ts`

## Exact files modified

- `lib/ai/config.ts`
- `lib/ai/providers/adapters.ts`
- `lib/ai/providers/foundation.ts`
- `lib/ai/providers/foundation.test.ts`
- `lib/ai/models/registry.ts`
- `lib/ai/aiPlatformFoundation.test.ts`
- `lib/ai/capabilities/admin/diagnostics.ts`
- `lib/ai/hub/types.ts`
- `lib/ai/hub/runtimeStatus.ts`
- `lib/ai/hub/experience.test.ts`
- `.env.example`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`
- `docs/ai/PROJECT_STATE.md`
- `docs/ai/SESSION_HANDOFF.md`
- `docs/ai/workstreams/AI_PLATFORM.md`

## Architecture summary

```
Capability / aiService.runCapability
  → gateway.execute
  → createProviderFoundation(config)
  → routing policy resolveRoute
  → requireAdapter(providerId)  // openai | gemini | anthropic | stub
  → adapter.execute(...)
```

- Config: `ANTHROPIC_API_KEY`, `ANTHROPIC_BASE_URL`, `ANTHROPIC_MODEL`
- Live mode accepts OpenAI and/or Gemini and/or Anthropic keys
- Default model: **`claude-haiku-4-5-20251001`** (exact dated stable Haiku snapshot)
- Premium catalog entry: `claude-sonnet-5`
- Adapter uses Anthropic Messages REST (`/v1/messages`, no stream)
- Structured: prompt-steered JSON + fail-closed parse (open-object `output_config` schemas are illegal under Anthropic JSON Schema limitations)
- Errors map to existing `AiPlatformError` codes

## Migrations created

None.

## Security review

- Key only server-side; never `NEXT_PUBLIC_*`
- Adapter registered only when key present
- Error bodies sanitized via `sanitizeAiErrorMessage`
- No Learning/UI/server-action surface changes for Tutor

## Tests

`npm test -- --run lib/ai lib/learning/aiTutorFoundation.test.ts`

- Test Files: **21 passed**
- Tests: **283 passed**

## TypeScript

`npx tsc --noEmit` — **pass**

## Build

Not run (provider-layer milestone).

## Open issues

- Manual commit + push deferred
- No live Anthropic API smoke in this milestone
- Local / self-hosted provider still a placeholder
