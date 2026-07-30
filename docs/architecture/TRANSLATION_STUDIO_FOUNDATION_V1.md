# Translation Studio Foundation V1

## Status

Implementation complete on `office/platform-translation-studio-foundation-v1`
(staged; awaiting commit GO).

## Goal

Internal Translation Studio as the future single source of truth for UMTUBA
translations. Not a public translation product.

## Architecture

```
Admin UI (read-only)
  → lib/translationStudio (in-memory domain)
      ├─ Languages / Namespaces / Keys / Values + status
      ├─ Translation Memory (approved reuse + duplicate fingerprint)
      ├─ Terminology database (seeded UMTUBA terms)
      ├─ Suggestion pipeline (memory → AI port → pending_review → human approve → memory)
      └─ Import/Export contracts (JSON / CSV / XLIFF) — contracts only

AI path (no provider-specific code):
  TranslationAiPort
    → createAiServiceTranslationPort(runCapability)
    → aiService.runCapability("platform.translation_suggest")
    → Shared AI Core gateway → Provider Foundation (OpenAI/Gemini/Anthropic/Local)
```

## Explicit non-goals (this milestone)

- No DB migration / persistence
- No editing workflow / automatic publishing
- No Learning / Commerce / Creator surface translation
- No public translation API
- No provider adapter modifications

## Studio routes

- `/admin/translation-studio`
- `/admin/translation-studio/languages`
- `/admin/translation-studio/namespaces`
- `/admin/translation-studio/keys`
- `/admin/translation-studio/keys/[keyId]`
- `/admin/translation-studio/terminology`

Platform-admin gated (same DB admin authority as other admin surfaces).
