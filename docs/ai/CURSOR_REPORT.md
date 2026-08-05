# CURSOR_REPORT — AI Core Anthropic on Gemini Recovery V1

## Summary

Port Anthropic Claude provider adapter onto the Gemini recovery tip
(`919dc75`). OpenAI / Gemini / Anthropic are interchangeable via existing
Provider Foundation resolution. Fail-closed without `ANTHROPIC_API_KEY`.
Streaming not enabled. No Learning / Commerce / Private AI / UI changes.

## Exact files changed

- `.env.example` — Anthropic env docs in live-key line
- `lib/ai/providers/anthropicAdapter.ts` — new
- `lib/ai/providers/anthropicAdapter.test.ts` — new
- `lib/ai/providers/adapters.ts` — register Anthropic adapter
- `lib/ai/providers/foundation.ts` / `foundation.test.ts` — seed + tests
- `lib/ai/config.ts` — Anthropic in live-key helper / status
- `lib/ai/models/registry.ts` — Anthropic catalog models
- `lib/ai/aiPlatformFoundation.test.ts` — registry/routing coverage
- `lib/ai/capabilities/admin/diagnostics.ts` — anthropic status fields
- `lib/ai/hub/{types,runtimeStatus,experience.test}.ts` — anthropicConfigured
- `docs/ai/*` — handoff for this milestone

## Migrations created

None.

## Security review

- `ANTHROPIC_API_KEY` server-only; never `NEXT_PUBLIC_*`
- Fail-closed when key absent (adapter not registered / unavailable)
- No secrets committed; `.env.local` untouched
- Scope limited to Shared AI provider layer + handoff docs

## Tests

Focused provider / foundation suites (see commit verification).

## TypeScript

`npx tsc --noEmit` required.

## Build

Not required for provider-adapter milestone.

## Open issues

- Live Anthropic API smoke optional (needs key)
- Local / self-hosted adapter still next on this recovery lineage
- Do not merge to `alpha-0.2` without explicit GO
