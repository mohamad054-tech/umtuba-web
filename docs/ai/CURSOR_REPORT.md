# CURSOR_REPORT — AI Core Local on Gemini Recovery V1

## Summary

Port Local / self-hosted OpenAI-compatible provider adapter onto the Gemini
recovery + Anthropic tip (`6447f33`). OpenAI / Gemini / Anthropic / Local are
interchangeable via Provider Foundation. Fail-closed without both
`LOCAL_AI_BASE_URL` and `LOCAL_AI_MODEL`. Streaming not enabled.

## Exact files changed

- `.env.example` — Local AI env docs
- `lib/ai/providers/localAdapter.ts` — new
- `lib/ai/providers/localAdapter.test.ts` — new
- `lib/ai/providers/adapters.ts` — register Local adapter
- `lib/ai/providers/foundation.ts` / `foundation.test.ts` — seed + tests
- `lib/ai/config.ts` — Local config + live-provider helper
- `lib/ai/models/registry.ts` — Local catalog when configured
- Related hub/diagnostics/tests + AI handoff docs

## Migrations created

None.

## Security review

- `LOCAL_AI_API_KEY` optional server-only; never `NEXT_PUBLIC_*`
- No default localhost / no invented cloud model ids
- Fail-closed when base URL or model absent
- Scope limited to Shared AI provider layer + handoff docs

## Tests

Focused provider / foundation suites (see commit verification).

## TypeScript

`npx tsc --noEmit` required.

## Open issues

- Live local/Ollama smoke optional
- Streaming deferred
- Do not merge to `alpha-0.2` without explicit GO
