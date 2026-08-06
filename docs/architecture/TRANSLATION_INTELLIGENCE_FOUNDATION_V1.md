# Translation Intelligence Foundation V1

## Status

Implemented on `office/platform-translation-intelligence-foundation-v1`
(base App Shell ingestion `e12cd6d`). No model training. Migration
`20260902` created locally only — **not remote-applied**.

## Goal

Learning and quality layer so every approved text (and future audio/video)
translation improves Memory, prompts, and evaluation — without training a
new foundation model and without losing approved data.

## Core principles

- Only approved / explicitly trusted translations feed intelligence data
- External translator / AI output never auto-trusted
- Raw external vs approved human-reviewed remain distinguishable
- Provenance, rights, and audit preserved
- Fail closed: unknown/restricted rights never enter customization datasets
- No STT / TTS / dubbing / voice cloning in this milestone

## Architecture

```
Studio approve workflow
  → Translation Memory (approved wording reuse)
  → Translation Intelligence service
      ├─ intelligence.json file store (runtime V1)
      ├─ Records (provenance, rights, quality, eligibility, feedback)
      ├─ Derived index (fingerprint, variants, reuse, corrections)
      ├─ External candidates (always untrusted until review)
      └─ Media metadata contracts (preview only)

Admin UI (read-only):
  /admin/translation-studio/intelligence
  /admin/translation-studio/intelligence/[recordId]
```

## Eligibility flags

`eligible_for_translation_memory` · `eligible_for_quality_analysis` ·
`eligible_for_prompt_examples` · `eligible_for_model_customization` ·
`ineligible`

## Quality dimensions (deterministic V1)

terminology · meaning coverage (heuristic) · fluency proxy · formatting ·
placeholders (blocker) · punctuation · language leakage (blocker) ·
subtitle timing · dubbing duration

## Style profiles

platform_ui · learning_educational · commerce_product · legal_formal ·
marketing_friendly · subtitles_concise · dubbing_natural

## Migration note

`20260902_translation_intelligence_foundation_v1.sql` adds
`translation_intelligence_*` tables only. Does not alter `20260910`.
Required to preserve a future Supabase shape for intelligence data before
any approved examples would otherwise live only in ephemeral runtime state.
