# Professional Translation Quality Foundation V1

## Philosophy

UMTUBA translation must be **professional**, not merely machine-substituted.
This foundation introduces:

- official terminology / glossary policy
- per-language style guides
- domain context packs
- deterministic automated QA
- provider-neutral AI generator + reviewer contracts
- human-review escalation
- configurable quality gates / domain profiles

**V1 does not** auto-translate the product, auto-publish, activate dual-read,
or make the database authoritative. AI confidence is **not** correctness.

## Quality dimensions (0-100)

| Dimension | Intent |
|-----------|--------|
| semantic_accuracy | Meaning preserved (AI/human judged; deterministic only catches empty/source-copy) |
| terminology_compliance | Official glossary / do-not-translate / forbidden alternatives |
| contextual_fit | Domain / audience fit |
| fluency_naturalness | Natural target language |
| ui_conciseness | UI length / density |
| consistency | Cross-string consistency (foundation hooks) |
| grammar_spelling | Surface grammar / punctuation heuristics |
| locale_conventions | Locale style-guide conventions |
| placeholder_integrity | `{name}`, `{{var}}`, `%s` / `%d` preservation |
| formatting_integrity | Tags, whitespace, newlines |

Overall score = weighted average of dimensions (see `DEFAULT_QUALITY_DIMENSION_WEIGHTS`).

## Gate decisions

Configurable via `ProfessionalQualityThresholds` / profiles:

- `QUALITY_PASS`
- `QUALITY_REVIEW_REQUIRED`
- `QUALITY_BLOCKED`

Default standard UI policy (illustrative):

- overall >= 90
- semantic >= 90
- terminology = 100 for protected terms
- placeholder integrity = 100
- formatting integrity = 100
- no blocking findings

## Glossary rules

Application-domain `OfficialTerminologyEntry` (no remote schema change):

- approved translations by locale
- forbidden alternatives
- `doNotTranslate`
- case sensitivity
- domain scopes (`global`, `commerce`, `learning`, ...)
- priority + optional `reviewRequired`

Seed catalog is intentionally small and high-value (brand, commerce, learning, admin).

## Style guides

Structured guides for `ar`, `en`, `fr`, `es`, `de`, `pt`.

Arabic highlights:

- Modern Standard Arabic by default
- natural Arabic (not literal English syntax)
- concise UI wording
- RTL-aware punctuation considerations
- avoid unnecessary transliteration
- preserve product/brand names when policy says so

## Context packs

Packs: `global`, `commerce`, `learning`, `collaboration`, `admin`.

Precedence:

1. key-specific context pack id
2. namespace / domain hint
3. global pack + locale style guide / glossary scope

## Deterministic QA

Pure checks for placeholders, HTML tags, whitespace, source-copy, glossary
violations, punctuation duplication, UI length, newline mismatch, and safe
Arabic heuristics. Deterministic QA **does not** claim full semantic accuracy.

## AI generator / reviewer separation

- `ProfessionalTranslationGenerator` -> candidate only
- `ProfessionalTranslationReviewer` -> evaluation only
- Parsers fail closed on invalid payloads
- **Neither** may approve or publish (`PROFESSIONAL_AI_AUTHORITY`)

Two-pass workflow: generate -> review -> deterministic QA -> recommendation
(`PASS` | `HUMAN_REVIEW` | `BLOCK`).

## Human review policy

Required at least for:

- legal / financial / refund / payment / security wording
- commerce / legal_financial profiles
- glossary conflicts / blocking findings
- low semantic score
- brand-sensitive / high-visibility marketing
- repeated AI disagreement
- ambiguous source (when flagged)

## Publication threshold

V1 does **not** change Studio publish behavior. Quality evaluation is additive
via `evaluateProfessionalTranslationDraft` / reports only.

## Memory policy

Approved-only ranking; exact > domain > near. Draft/low-quality memory must
not outrank approved translations.

## What V1 does NOT automate

- Mass product translation
- Dual-read activation
- DB-primary cutover
- Live provider calls in default Studio workflow
- Automatic approve / publish
- Remote terminology schema migration

## Code map

`lib/translationStudio/professionalQuality/**`
