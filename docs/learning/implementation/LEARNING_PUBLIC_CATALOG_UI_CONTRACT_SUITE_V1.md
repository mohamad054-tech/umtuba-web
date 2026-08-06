# Learning Public Catalog UI Contract Suite V1

Capability: `learning.public_catalog.ui_contract_suite_v1`
Base tip: Learning SoT (`69cd89c`)
Branch: `office/learning-public-catalog-ui-contract-suite-v1`

## Purpose

Deterministic source-contract coverage for public Learning catalog surfaces:

- Catalog listing (`app/learning/catalog/page.tsx`)
- Public course detail/landing (`app/learning/catalog/[courseSlug]/page.tsx`)
- Supporting helpers in `lib/learning/publicCatalog.ts`

Tests-only. No redesign. No CSS. No migrations. No live E2E.

## Covered contracts

- Published + public eligibility / ordering
- Empty catalog state
- Course card metadata + canonical `LEARNING_PUBLIC_ROUTES.course(slug)`
- Guest vs learner CTA separation
- Curriculum titles-only preview (no protected lesson deep-links)
- Enroll / Continue / Start Course route truth
- No instructor actions / no raw HTML injection
- Sanitize + free/paid helpers fail closed

## Gate commands

```bash
npx vitest run lib/learning/publicCatalogUiContract.test.ts
npx vitest run \
  lib/learning/publicCatalog.test.ts \
  lib/learning/learnerDelivery.test.ts \
  lib/learning/learnerUiContract.test.ts \
  lib/learning/lessonContentAccess.test.ts \
  lib/learning/productionSmokeE2eGate.test.ts
npx tsc --noEmit
```
