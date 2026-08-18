# CURSOR_REPORT — Private Store demo preview access

```text
SOURCE_DEVICE = CENTRAL / SERVER
DEVICE_ROLE = IMPLEMENTATION
TASK_ID = CENTRAL_STORE_PRIVATE_DEMO_PREVIEW_ACCESS_V1
REPORT_TYPE = IMPLEMENTED_TESTED_NOT_DEPLOYED
TIMESTAMP_LOCAL = 2026-08-18 ~19:55 +03
SECRET_VALUES_PRINTED = NO
FORCE_PUSH = NO
PUSH = NO
PRODUCTION_MUTATED = NO
REMOTE_MIGRATION_APPLIED = NO
SQL_20260929_APPLIED = NO
SQL_20260930_APPLIED = NO
MOBILE_SOURCE_CHANGED = NO
MOBILE_RELEASE_TRAIN_DISTURBED = NO
DEMO_PRODUCTS_LIVE_PUBLIC = NO
```

## Summary

Tightened `/store/demo-preview` so anonymous visitors are denied even if they know the path. Access is platform-admin session (`platform_admins` / `is_platform_admin`) or a non-guessable `STORE_DEMO_PREVIEW_TOKEN` exchanged at `/store/demo-preview/enter` into an httpOnly cookie. `STORE_DEMO_PREVIEW=1` and non-production `NODE_ENV` no longer grant access. Public `/store` still uses live catalog only. 26 DEMO fixtures remain isolated (`SOURCE_TYPE=DEMO`, `PURCHASABLE=NO`). JA-09 is in flight — code is ready, deploy was not performed.

## Exact files changed

- `lib/store/demoPreviewGate.ts`
- `lib/store/demoPreviewGate.test.ts`
- `lib/store/demoPreviewAccess.ts`
- `lib/store/demoPreviewSession.ts` (new)
- `app/store/demo-preview/enter/route.ts` (new)
- `app/store/demo-preview/page.tsx`
- `app/store/demo-preview/[slug]/page.tsx`
- `lib/site/indexing.ts`
- `lib/site/metadata.test.ts`
- `lib/store/demo/catalog.test.ts`
- `app/lib/nav/secondarySurfaceContract.test.ts`
- `docs/store/DEMO_CATALOG_PREVIEW.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

None.

## Security review

- Public catalog queries unchanged; demo fixtures are in-memory only.
- Anonymous `/store/demo-preview` = DENY.
- Admin path re-checks `is_platform_admin` (DB), not JWT/env hints alone.
- Token path requires `STORE_DEMO_PREVIEW_TOKEN` length ≥ 16; compared via SHA-256 + `timingSafeEqual`.
- Enter route sets httpOnly, `SameSite=strict`, path-scoped cookie (8h) and redirects without the secret in the query. Cookie stores a hash, not the raw secret.
- Pages noindex; `robots.txt` disallows `/store/demo-preview`; sitemap does not list it; public nav does not link it.
- Checkout sandbox `allowed=false`. No payment processor.
- Secret values never committed or printed.

## Tests

PASS for Store + indexing + nav contract: 39 files / 475 tests.

Full `npx vitest run`: 4185 passed, 4 failed, 1 skipped. Failures are pre-existing on `722ed3e5` and outside this scope:

- `lib/translationStudio/translationStudioMemoryDbContractAlign.test.ts` (seed length/hash)
- `app/live/hooks/liveTrustHonesty.contract.test.ts` (literal `Go Live` vs `t("landing.goLive")`)
- `lib/media/processing/mediaProcessing.foundation.test.ts` (`20260869` already present)

## TypeScript

`npx tsc --noEmit` PASS

## Build

`npm run build` PASS (includes `/store/demo-preview`, `/store/demo-preview/[slug]`, `/store/demo-preview/enter`)

## git diff --check

PASS

## git status --short

Recorded at handoff after the feature commit on `central/store-private-demo-preview-access-v1`.

## Open issues

- JA-09 enroll cutover is in flight. Do not deploy this SHA over a mid-cutover production tip.
- Product Owner must be a `platform_admins` user, or an operator must set `STORE_DEMO_PREVIEW_TOKEN` on the web process after deploy (never commit the value).
- Authenticated Store favorites/cart on live remain blocked without an approved browser session path (unchanged).
