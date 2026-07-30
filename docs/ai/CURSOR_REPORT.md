# CURSOR_REPORT — AI Core Local / Self-hosted Adapter V1

## Summary

Added a fail-closed local / self-hosted OpenAI-compatible provider adapter behind
existing `AiProviderAdapter` contracts. `aiService.runCapability()` unchanged.
OpenAI, Gemini, Anthropic, and Local are interchangeable via Provider Foundation /
routing policy when configured. Streaming remains disabled. Staged; not committed.

## Exact files created

- `lib/ai/providers/localAdapter.ts`
- `lib/ai/providers/localAdapter.test.ts`

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
  → requireAdapter(providerId)  // openai | gemini | anthropic | local | stub
  → adapter.execute(...)
```

- Config: `LOCAL_AI_BASE_URL`, `LOCAL_AI_MODEL`, optional `LOCAL_AI_API_KEY`
- Live mode accepts OpenAI and/or Gemini and/or Anthropic and/or local (URL+model)
- No default base URL and no default model id (operator must set both)
- Adapter uses OpenAI-compatible Chat Completions (`{base}/chat/completions`, no stream)
- Structured: prompt-steered JSON + fail-closed parse (no `response_format`)
- Errors map to existing `AiPlatformError` codes

## Migrations created

None.

## Security review

- Secrets only server-side; never `NEXT_PUBLIC_*`
- Adapter registered only when both base URL and model are present
- Optional API key sent as Bearer only when configured
- Error bodies sanitized via `sanitizeAiErrorMessage`
- No Learning/UI/server-action surface changes for Tutor

## Tests

`npm test -- --run lib/ai lib/learning/aiTutorFoundation.test.ts`

- Test Files: **22 passed**
- Tests: **294 passed**

## TypeScript

`npx tsc --noEmit` — **pass**

## Build

Not run (provider-layer milestone).

## git diff --check

Run on staged changes at verification time.

## git status --short

See Final Verification Report (staged only; not committed).

## Open issues

- Manual commit + push deferred
- No live local/Ollama smoke in this milestone
- Streaming still disabled across providers
