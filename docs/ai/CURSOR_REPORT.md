# CURSOR_REPORT — AI Core Gemini Adapter V1

## Summary

Added a fail-closed Google Gemini provider adapter behind existing
`AiProviderAdapter` contracts. `aiService.runCapability()` unchanged. OpenAI and
Gemini are interchangeable via Provider Foundation / routing policy when
credentials are present. Streaming remains disabled. Staged; not committed.

## Exact files created

- `lib/ai/providers/geminiAdapter.ts`
- `lib/ai/providers/geminiAdapter.test.ts`

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
  → requireAdapter(providerId)  // openai | gemini | stub
  → adapter.execute(...)
```

- Config: `GEMINI_API_KEY`, `GEMINI_BASE_URL`, `GEMINI_MODEL`
- Live mode accepts OpenAI and/or Gemini keys
- Default model: **`gemini-2.5-flash`** (Google-documented stable Flash; not preview/`latest`)
- Adapter uses Gemini `generateContent` REST (no stream)
- Structured: `generationConfig.responseMimeType = application/json`
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

- Test Files: **20 passed**
- Tests: **276 passed**

## TypeScript

`npx tsc --noEmit` — **pass**

## Build

Not run (provider-layer milestone).

## Open issues

- Manual commit + push deferred
- No live Google API smoke in this milestone
- Anthropic / local still placeholders
