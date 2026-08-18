# CURSOR_REPORT — Store live localization + safe demo preview V1

```text
TASK_ID = CENTRAL_STORE_LIVE_LOCALIZATION_DEMO_PREVIEW_V1
STATUS = IMPLEMENTED_TESTED_NOT_DEPLOYED
SOURCE_DEVICE = SERVER (WIN-MJRKAKK2MEH)
AUTHORITATIVE_BASE_SHA = 2400a37890152a8db9cb14c8a0bb2c0fe64cc2b8
TASK_BRANCH = central/store-live-localization-demo-preview-v1
TASK_WORKTREE = D:\umtuba-central\repos\umtuba-web-store-live-localization-demo-preview-v1
DEPLOY_PERFORMED = NO
SQL_20260929 = NOT_APPLIED
MOBILE_RELEASE_TRAIN_DISTURBED = NO
```

## Summary

Production `/store` empty catalog is **EXPECTED** while no authorized inventory exists. The Arabic English-leak defect is **FIXED** on this branch: Store buyer chrome now uses the existing `createTranslator` / `useTranslation` catalogs for ar, en, fr, es, de, pt. RTL remains `html[dir=rtl]` from the locale resolver. Empty-catalog copy is honest (“products are coming”) and does not claim partners or stock.

A **gated** in-memory DEMO catalog (26 fixtures from the pre-company branch, no SQL 20260929) is available at `/store/demo-preview` only when `STORE_DEMO_PREVIEW=1` plus admin, token, or non-production. Default OFF. Demo products are not purchasable and are never merged into the public live catalog.

Parallel web-defects tree `D:\umtuba-central\repos\umtuba-web` was not edited. This worktree is from current `origin/alpha-0.2` tip `2400a378` (defects already on alpha).

## Exact files changed

- `lib/i18n/messages/types.ts`, `storeCatalogs.ts`, `en.ts`, `ar.ts`, `fr.ts`, `es.ts`, `de.ts`, `pt.ts`
- `lib/i18n/storeLocalization.test.ts`, `lib/i18n/i18nFoundation.test.ts`
- Store buyer pages and chrome under `app/store/**`, `app/components/store/**`
- `app/lib/storefront/deriveSections.ts` (empty catalog no longer hardcodes English welcome slide)
- `lib/store/demo/**`, `lib/store/demoPreviewGate.ts`, `lib/store/demoPreviewAccess.ts`
- `app/store/demo-preview/**`
- `docs/store/DEMO_CATALOG_PREVIEW.md`, `docs/ai/CURRENT_TASK.md`, this report

## Migrations created

None. SQL 20260929 not applied.

## Security review

- Demo preview default OFF; production users do not see fixtures as live inventory.
- Token compared only when `STORE_DEMO_PREVIEW=1`. Admin check uses existing `platform_admins` RPC.
- No secrets written. Preview pages send `robots: noindex`.
- Demo add-to-cart / checkout controls are disabled.

## Tests

PASS — `lib/i18n/storeLocalization.test.ts`, `lib/i18n/i18nFoundation.test.ts`, `lib/store/demo/catalog.test.ts`, `lib/store/demoPreviewGate.test.ts`, `lib/store/storefrontDeriveSections.test.ts`, related i18n files (52 tests).

## TypeScript

PASS — `npx tsc --noEmit`

## Build

BLOCKED on this worktree: Next/Turbopack cannot use a junctioned `node_modules`, and a subsequent local install hit Windows directory locks. Typecheck already passed. Re-run `npm run build` after a clean `npm ci` on this worktree.

## git diff --check

PASS (no whitespace errors)

## git status --short

See commit on `central/store-live-localization-demo-preview-v1`.

## Open issues

- Production still serves English Store chrome until this branch is deployed.
- CheckoutClient still has some deeper English form labels beyond steps/empty chrome.
- Buyer order status chips from `buyerOrdersPresentation` remain English domain labels.
- BUILD not completed in this worktree due to node_modules lock.
- DEPLOY_REQUIRED = YES. Do not race other production deploys; ship after a clean build on the approved web path.
