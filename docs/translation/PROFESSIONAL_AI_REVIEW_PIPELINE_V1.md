# Professional AI Review Pipeline V1

## Purpose

Turn the Professional Quality Foundation into an executable **review quality**
pipeline: deterministic QA + independent AI reviewer → aggregated report →
human-escalation recommendation.

This milestone does **not** auto-approve, auto-publish, activate dual-read,
switch to DB-primary, or disable persistent shadow dual-write.

## Two-pass architecture

1. **Generator** (optional): produces a candidate only
2. **Deterministic QA**: placeholders, glossary, formatting, Arabic heuristics
3. **Independent Reviewer**: evaluates semantics / fluency / context / etc.
4. **Strict schema validation** (fail-closed)
5. **Aggregation + human policy** → `PASS` | `HUMAN_REVIEW` | `BLOCK`

Generator and reviewer remain logically independent (`kind` differs; providers
and models may differ). Reviewer must not merely echo generator confidence.

## Hard QA rules

- Blocking deterministic findings cannot be cleared by AI confidence
- `placeholder_integrity`, `formatting_integrity`, and protected
  `terminology_compliance` cannot be raised above the deterministic floor
- Suggested revisions are re-QA’d; blockers reject the revision
- Draft/approved values are never replaced by the reviewer

## Reviewer authority limits

`PROFESSIONAL_AI_AUTHORITY`:

- generator cannot approve / publish
- reviewer cannot approve / publish

Forbidden response fields (`approve`, `publish`, chain-of-thought, etc.) cause
schema rejection.

## Human escalation

Commerce / legal-financial / refund / payment / security / brand / marketing /
ambiguous / low semantic / glossary conflict / blocking findings →
`HUMAN_REVIEW` or `BLOCK` per policy.

## Locale behavior

Reviewer prompt always embeds the **locale-specific** style guide
(`ar` / `en` / `fr` / `es` / `de` / `pt`). Arabic adds MSA / anti-calque /
concise UI / brand preservation notes.

## Failure behavior

Timeouts, transport errors, invalid JSON, schema mismatch, provider unavailable,
or content rejection → `PROFESSIONAL_REVIEW_UNAVAILABLE` with fail-closed
`HUMAN_REVIEW` (or `BLOCK` if deterministic blockers exist). Draft unchanged on
review-only paths.

## Sensitive-domain policy

Commerce / refund / payment language uses stricter profiles and mandatory human
review. AI never independently approves sensitive copy.

## Provider separation

- Port: `ProfessionalAiTransport` (timeout + bounded retries)
- Adapters: scripted/fake, unavailable, optional `ai_service` over existing
  `platform.translation_suggest`
- Default Studio actions use live transport only when `UMTUBA_AI_MODE=live`;
  otherwise heuristic/stub server-side adapters
- No provider secrets in client responses or observation metadata

## Studio integration

| Action | Mutation |
|--------|----------|
| `reviewProfessionalTranslationDraftAction` | **None** (read-only) |
| `generateProfessionalTranslationCandidateAction` | Creates pending suggestion only |
| `generateAndReviewProfessionalTranslationAction` | Creates pending suggestion + report |

Suggestion `quality.professionalQuality.tag = professional_quality_v1`.

## Persistence

**No migration.** Quality reports are ephemeral in review-only responses and may
be attached under existing suggestion `quality` jsonb metadata.

## Caching / cost control

Deterministic cache key foundation:
`source/target hash + locales + glossary/style versions + profile + model version`.
No external cache required in V1.

## Code map

`lib/translationStudio/professionalQuality/{reviewPipeline,generateCandidate,twoPassOrchestrator,providerTransport,reviewSchema,reviewerPrompt,...}`

`app/actions/translationStudioProfessionalReview.ts`
