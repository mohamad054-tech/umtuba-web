# Live Professional AI Provider Readiness V1

## Purpose

Prepare the safest high-quality live AI provider/model strategy for
professional UMTUBA translation **without activating providers or storing
credentials** in this milestone.

Current expected state: `LIVE_PROVIDER_NOT_CONFIGURED` with
`OFFLINE_PIPELINE_READY`.

## Provider selection philosophy

- Quality over cheapest price for sensitive copy
- Generator and Reviewer should be **independent** (different provider/model
  when credible options exist)
- Arabic natural MSA is the primary quality target
- Hard placeholder/glossary failures disqualify combinations
- Human review remains mandatory for sensitive domains
- Offline heuristic path stays usable when live is absent

## Supported AI Core providers (audit)

| Provider | Structured JSON | Professional fit today |
|----------|-----------------|------------------------|
| OpenAI | native `json_object` | transport_only via `platform.translation_suggest` |
| Gemini | native JSON mime | transport_only (dual adapter risk) |
| Anthropic | prompt-parse only | transport_only (weaker structure) |
| Local | prompt-parse only | transport_only |
| Stub | fixtures | no translation_suggest fixture |

**Gap:** `platform.translation_suggest` returns `{candidateText,confidence,notes?}`
and `aiService` strips richer fields — dedicated professional
generate/review capabilities are required before live professional quality
can be considered fully wired.

## Benchmark corpus

`PROFESSIONAL_BENCHMARK_CORPUS_V1` — 40 curated UI cases across:

- App Shell, Commerce, Learning, Collaboration
- Sensitive/legal/financial/security
- Placeholders / HTML / printf-style tokens

Locales: **ar** (primary), fr, es, de, pt. EN is source/reference.

References are **guidance**, not exact-string-only gold.

## Arabic rubric

Natural MSA, semantic fidelity, anti-calque, concise UI, glossary/brand,
grammar, RTL punctuation, placeholders, context fit.
Technically correct but unnatural Arabic is **not** professional PASS.

## Other-locale rubric

Idiomatic phrasing, domain terminology, UI conciseness, grammar, locale
conventions, placeholders, consistency.

## Benchmark runner

`runProfessionalProviderBenchmark` — pure evaluation:

- generate → independent review → deterministic QA → professional scores
- records provider/model labels, decision, dimensions, hard findings,
  human-review requirement, latency, failure category
- **never** creates suggestions, mutates store.json, shadows DB, approves,
  or publishes

## Provider/model matrix

Server-side `buildProfessionalBenchmarkMatrix` / offline default
`heuristic generator × heuristic reviewer`. Conceptual G1/R1… slots for later
configured candidates. Browser cannot inject models.

## Scoring methodology

Weighted composite:

- quality 55%
- hard integrity 25%
- structured reliability 10%
- latency 5%
- cost 5%

Cheap/fast models cannot win below the professional quality floor (75).

## Disqualification rules

NOT_ELIGIBLE if rates exceed thresholds for:

- placeholder corruption
- protected terminology / DNT violations
- invalid structured responses
- semantic failures
- sensitive copy PASS without human-review flag

## Human evaluation format

`HumanBenchmarkRating`: excellent | acceptable | needs_edit | wrong (+ notes).
Combinable with automated composite.

## Config model (centralized)

Env names (no values in repo):

- `UMTUBA_PROFESSIONAL_GENERATOR_PROVIDER` / `_MODEL`
- `UMTUBA_PROFESSIONAL_REVIEWER_PROVIDER` / `_MODEL`
- `UMTUBA_PROFESSIONAL_SENSITIVE_REVIEWER_PROVIDER` / `_MODEL`
- timeout/retry: `UMTUBA_PROFESSIONAL_GEN_TIMEOUT_MS`,
  `UMTUBA_PROFESSIONAL_REV_TIMEOUT_MS`, `*_MAX_RETRIES`

Plus existing AI Core: `UMTUBA_AI_MODE`, `OPENAI_*`, `GEMINI_*`,
`ANTHROPIC_*`, `LOCAL_AI_*`.

## Timeout / retry

Default generation/review: 20s, max 1 retry (capped at 2). Avoid duplicate
expensive calls after ambiguous completion.

## Cost guardrails

`maxCases` (50), `maxProviderCalls` (120), optional estimated budget.
No infinite benchmark loops.

## Privacy

Benchmark uses curated UI strings only. No secrets, PII, auth tokens, or
hidden account data. Separate policy needed later for user-generated content.

## Sensitive-domain policy

Legal/financial/payment/refund/security: mandatory human review; strongest
reviewer profile preferred; provider PASS never grants publication authority.

## Readiness helper

`assessLiveProfessionalProviderReadiness()` →

- `LIVE_PROVIDER_READY`
- `LIVE_PROVIDER_NOT_CONFIGURED`
- `LIVE_PROVIDER_CONFIG_INVALID`

Presence/shape only — never prints secrets. `activated: false`.

## Activation boundary

This milestone does **not** configure credentials or activate live providers.
Next: `TRANSLATION_STUDIO_LIVE_AI_PROVIDER_CONFIGURATION_AND_BENCHMARK_V1`.

## Code map

`lib/translationStudio/professionalQuality/{liveProviderConfig,liveProviderReadiness,benchmark*,providerAudit,humanBenchmarkRating}.ts`
