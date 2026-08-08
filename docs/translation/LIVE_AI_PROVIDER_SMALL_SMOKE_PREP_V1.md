# Live AI Provider Small Smoke Prep V1

## Purpose

Operator-ready **5-case** first live professional AI smoke package.
This document is **PREP ONLY** — no credentials, no paid calls, no Studio mutation.

Next milestone (credentials may be required):

`TRANSLATION_STUDIO_LIVE_AI_PROVIDER_SMALL_SMOKE_EXECUTION_V1`

## Locked five cases

| # | Case id | Source | Locale | Profile | Human review |
|---|---------|--------|--------|---------|--------------|
| 1 | `appshell_back` | Back | ar | standard_ui | No |
| 2 | `appshell_cancel` | Cancel | ar | standard_ui | No |
| 3 | `collab_workspace` | Workspace | ar | standard_ui | No (glossary) |
| 4 | `commerce_refund` | Refund | ar | commerce_sensitive | **Mandatory** |
| 5 | `ph_hello_name` | Hello {name} | **fr** | standard_ui | No (placeholder DQ) |

Do not expand beyond 5. Do not require one exact translation as sole gold.

## Arabic acceptance (cases 1–4)

- Natural MSA, concise UI, anti-calque
- Glossary compliance (Workspace → مساحة العمل; Refund → استرداد)
- No unnecessary transliteration
- Refund: semantic precision + mandatory human review (never weakened)

## Case 5 integrity

- `{name}` preserved exactly
- Idiomatic French / locale style
- Placeholder corruption → immediate disqualification

## Call count / retry ceiling

- Normal: **5 generator + 5 reviewer = 10**
- Retry: max 1 per policy → retry ceiling **10** → total ceiling **20**
- Explicit GO required before any paid run

## Privacy

Curated UI/product strings only. Preflight must return **PASS** (no PII/secrets).

## Non-mutation guarantee

Smoke runner has no access to Studio save, suggestion create, approve, publish, or shadow write. Artifacts only. `mutatedStudio: false`.

## Success criteria → verdict

- All 5 generate + 5 review structurally valid
- 0% structured failure on smoke
- Zero placeholder/format corruption
- Zero protected glossary hard violations / authority violations
- Arabic cases meet professional minimum
- Refund remains HUMAN_REVIEW gated
- No Studio mutation / no secret leakage

Verdicts: `SMOKE_PASS` | `SMOKE_PARTIAL` | `SMOKE_FAIL`

## Provider comparison reuse

Same five cases × matrix slots (Generator A×Reviewer B/C…). Labels server-side; blind human artifacts hide provider by default.

## Sensitive reviewer

- Prefer sensitive reviewer for Refund when configured
- If unset: normal reviewer **allowed** only with **mandatory human-review flag**
- Never weaken human requirement

## Configuration checklist (names only)

- `UMTUBA_AI_MODE`
- Provider credentials: `OPENAI_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `LOCAL_AI_*`
- `PROFESSIONAL_TRANSLATION_GENERATOR_PROVIDER` / `_MODEL`
- `PROFESSIONAL_TRANSLATION_REVIEWER_PROVIDER` / `_MODEL`
- `PROFESSIONAL_TRANSLATION_SENSITIVE_REVIEWER_PROVIDER` / `_MODEL` (optional)
- Timeouts/retries: `PROFESSIONAL_TRANSLATION_GEN_*`, `PROFESSIONAL_TRANSLATION_REV_*`
- Smoke guardrails: `UMTUBA_PROFESSIONAL_SMOKE_MAX_CALLS`, `UMTUBA_PROFESSIONAL_SMOKE_EXPLICIT_GO`

## Technical eligibility (not quality winners)

| Provider | Class |
|----------|--------|
| OpenAI | READY_ARCHITECTURALLY |
| Gemini | READY_ARCHITECTURALLY |
| Anthropic | WEAKER_STRUCTURED_OUTPUT |
| Local | NOT_RECOMMENDED_FOR_FIRST_SMOKE |
| Stub | NOT_RECOMMENDED_FOR_FIRST_SMOKE (offline only) |

## Recommended first-smoke pattern

Independent pair among OpenAI/Gemini for strongest structured reliability.

Example: `openai(generator) × gemini(reviewer)`. Not a permanent winner.

## Smoke helper

```bash
npm run translation:provider-smoke
# or
npx tsx scripts/translation/professionalProviderSmoke.ts --phase small --offline
```

Behavior:

1. Readiness preflight (expect `LIVE_PROVIDER_NOT_CONFIGURED` today)
2. Offline five-case proof (default)
3. With `--go` + live ready: still deferred to execution milestone in prep
4. Refuses invalid config / exceeded call budget
5. Never mutates Studio; never prints secrets

## Blind human-review artifacts

Each case emits `blindHumanReview` + `blindSurface` (labels only under `_reveal`).

Ratings: excellent | acceptable | needs_edit | wrong.

## Rollback

Unset live mode / credentials → offline heuristic path remains usable. Studio content unchanged.

## Code map

- `lib/translationStudio/professionalQuality/smallSmokePackage.ts`
- `lib/translationStudio/professionalQuality/smallSmokeEligibility.ts`
- `lib/translationStudio/professionalQuality/smallSmokeRunner.ts`
- `scripts/translation/professionalProviderSmoke.ts`
