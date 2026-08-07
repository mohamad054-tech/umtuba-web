# Live AI Provider Configuration and Benchmark V1

## Purpose

Prepare the **complete live professional provider execution path** and
benchmark configuration — without activating credentials or paid calls.

## Professional capabilities

Dedicated AI Core capabilities (do **not** overload `platform.translation_suggest`):

| Capability | Role |
|------------|------|
| `platform.translation_professional_generate` | Candidate generation |
| `platform.translation_professional_review` | Independent evaluation |

`aiService` returns the **full structured payload** for these capabilities.
Legacy `platform.translation_suggest` remains narrow and backwards-compatible.

## Contracts

Generate response: `schemaVersion`, `candidateText`, optional
`terminologyDecisions` / `conciseNotes` / `confidence`, `provider`.

Review response: `schemaVersion`, `dimensionScores`, `findings`, optional
`suggestedRevision` / `terminologyDecisions` / `confidence`, `provider`.

Forbidden: approve, publish, authority, chain-of-thought / reasoning / scratchpad.

## Configuration (names only)

Preferred:

- `PROFESSIONAL_TRANSLATION_GENERATOR_PROVIDER` / `_MODEL`
- `PROFESSIONAL_TRANSLATION_REVIEWER_PROVIDER` / `_MODEL`
- `PROFESSIONAL_TRANSLATION_SENSITIVE_REVIEWER_PROVIDER` / `_MODEL`
- timeouts/retries: `PROFESSIONAL_TRANSLATION_GEN_TIMEOUT_MS`,
  `PROFESSIONAL_TRANSLATION_REV_TIMEOUT_MS`, `*_MAX_RETRIES`

Also accepted: `UMTUBA_PROFESSIONAL_*` aliases.

AI Core:

- `UMTUBA_AI_MODE`
- `OPENAI_API_KEY` / `OPENAI_MODEL` / `OPENAI_BASE_URL`
- `GEMINI_*`, `ANTHROPIC_*`, `LOCAL_AI_*`

Precedence: explicit professional env → platform defaults → offline fallback.
Live mode with missing config → `NOT_CONFIGURED` / `CONFIG_INVALID` (no fake success).

## Readiness states

Per role: `READY` / `NOT_CONFIGURED` / `INVALID` (sensitive may be `OPTIONAL`).

Overall:

- `LIVE_BENCHMARK_READY`
- `LIVE_PROVIDER_NOT_CONFIGURED`
- `LIVE_PROVIDER_CONFIG_INVALID`

## Benchmark matrix & phases

Generator × Reviewer matrix (server-side). Phases (future live GO required):

- **A** Small smoke (5 AR cases)
- **B** Full Arabic corpus
- **C** FR/ES/DE/PT
- **D** Sensitive (mandatory human review)

## Scoring / disqualification

Quality 55% · integrity 25% · structured 10% · latency 5% · cost 5%.
Hard disqualification outranks composite. Structured malformed target 0%,
disqualify if >2%.

## Arabic / multilingual bars

AR: natural MSA, anti-calque, glossary, placeholders, sensitive human-gated.
FR/ES/DE/PT: minimum overall/semantic floors. Do not pick on Arabic alone.

## Human blind review

Artifacts support blind provider labels with optional reveal metadata.

## Privacy / cost / retry

Curated UI corpus only. Cost preflight computes call ceilings; explicit GO
required. Max 1 retry; invalid structured = failure; no silent heuristic
replacement during live benchmark.

## Activation procedure (future)

1. Set provider API credential env (server-only)
2. Set generator + independent reviewer models
3. Optionally set sensitive reviewer
4. Set `UMTUBA_AI_MODE=live`
5. Confirm `assessLiveProfessionalProviderReadiness().overall === LIVE_BENCHMARK_READY`
6. Explicit GO for Phase A smoke only

## Rollback

Unset `UMTUBA_AI_MODE` / credentials → offline heuristic path remains usable.
Studio content paths unchanged.

## Code map

- `lib/ai/prompts/registry.ts` — professional prompts
- `lib/ai/services/aiService.ts` — full payload preserve
- `lib/ai/providers/adapters.ts` — stub fixtures
- `lib/translationStudio/professionalQuality/providerTransport.ts`
- readiness / phases / acceptance / preflight / blind review modules
