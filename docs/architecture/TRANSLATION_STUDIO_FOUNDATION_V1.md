# Translation Studio — Foundation, Persistence, App Shell Ingestion

## Status

`TRANSLATION_STUDIO_V1` = **PRODUCTION_ACCEPTED** on
`office/platform-translation-trunk-port-v1`.

Runtime remains **JSON-authoritative** with `shadow_dual_write` + dual-read
observe ON. Publish remains dry-run / non-auto. DB-primary is deferred.

See: `docs/translation/TRANSLATION_STUDIO_V1_PRODUCTION_ACCEPTED.md`

## Goal

Internal Translation Studio as durable TMS, with the first real platform
batch: ingest App Shell catalogs, review EN/AR coverage, seed Arabic TM,
preview an App Shell publish batch (dry-run only).

## Architecture

```
Admin UI (overview / app-shell / keys filters / editor / review / publish)
  → server actions (platform-admin gated)
  → lib/translationStudio
      ├─ ingestion/ingestAppShellCatalog (idempotent, stable key ids)
      ├─ Durable JSON file store — authoritative runtime V1
      ├─ Shadow dual-write + race-safe dual-read observe (DB mirror; not authority)
      ├─ Additive SQL schema + RPCs (applied on linked project; JSON still authoritative)
      ├─ Workflow (draft → review → approve → ready_for_publish)
      ├─ Translation Memory (AR App Shell seed; fingerprint uniqueness)
      ├─ Terminology findings (warnings only; never silent replace)
      ├─ Professional AI generate/review + Apply-to-draft (human boundary)
      ├─ App Shell publish batch (dryRun, writesCatalogFiles: false)
      └─ Legacy publish contract (autoPublish: false)
```

## App Shell inventory (ingested namespaces)

`languages`, `actions`, `status`, `nav`, `settings`, `menu`, `dialog`,
`empty`, `error`, `success`

Surfaces: desktop/mobile nav, search, user menu, settings, language
selector, sign-out, generic actions, loading/empty/error/success,
common dialogs, shared product chrome.

**Out of scope catalogs:** Learning, Commerce, Creator, Live, World, Games.

## Import status rules

| Locale | Rule |
|--------|------|
| EN | Approved source |
| AR | Approved when non-empty and not EN leakage; else Needs Review / Missing |
| FR/ES/DE/PT | Never auto-approved (fallback EN stays Needs Review) |
| Source text change | Dependent non-EN values → Needs Review |

## Studio routes

- `/admin/translation-studio`
- `/admin/translation-studio/app-shell`
- `/admin/translation-studio/languages`
- `/admin/translation-studio/namespaces`
- `/admin/translation-studio/keys` (namespace + status filters)
- `/admin/translation-studio/keys/[keyId]`
- `/admin/translation-studio/review`
- `/admin/translation-studio/publish`
- `/admin/translation-studio/terminology`
- `/admin/translation-studio/intelligence`
- `/admin/translation-studio/intelligence/[recordId]`

See also: `docs/architecture/TRANSLATION_INTELLIGENCE_FOUNDATION_V1.md`
