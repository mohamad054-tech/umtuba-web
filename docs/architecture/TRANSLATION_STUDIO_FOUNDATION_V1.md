# Translation Studio Foundation + Persistence Workflow V1

## Status

Persistence & Workflow V1 implemented on
`office/platform-translation-studio-persistence-workflow-v1`
(staged; awaiting commit GO). Built on Foundation V1 (`aced43c`).

## Goal

Internal Translation Studio as durable TMS: edit, review, history, AI
suggestions, publish contract — not a public translation product.

## Architecture

```
Admin UI (editor + review + publish queues)
  → server actions (platform-admin gated)
  → lib/translationStudio workflow
      ├─ Durable JSON file store (data/translation-studio/) — runtime V1
      ├─ Additive SQL schema (20260874_…) — future Supabase; not applied
      ├─ Languages / Namespaces / Keys / Values + workflow statuses
      ├─ Versions + audit log
      ├─ Translation Memory (approved reuse + fingerprint)
      ├─ Terminology (conflict warnings; never silent replace)
      ├─ Suggestion pipeline (memory → AI port → pending_review)
      └─ Publish contract (autoPublish: false)

AI path (no provider-specific code):
  TranslationAiPort
    → createAiServiceTranslationPort(runCapability)
    → aiService.runCapability("platform.translation_suggest")
```

## Workflow statuses

`missing` → `draft` / `ai_suggested` → `needs_review` → `approved` /
`ready_for_publish` (also `rejected`, `deprecated` + restore to draft)

## Explicit non-goals (this milestone)

- No remote migration apply
- No auto-publish into product i18n catalogs
- No Learning / Commerce / Creator surface translation
- No public translation API
- No provider adapter modifications

## Studio routes

- `/admin/translation-studio`
- `/admin/translation-studio/languages`
- `/admin/translation-studio/namespaces`
- `/admin/translation-studio/keys`
- `/admin/translation-studio/keys/[keyId]` (editor)
- `/admin/translation-studio/review`
- `/admin/translation-studio/publish`
- `/admin/translation-studio/terminology`

Platform-admin gated (same DB admin authority as other admin surfaces).
