# CURSOR_REPORT — Commerce Digital Product Versioning & Update Delivery V1

## Summary

Additive digital asset versioning on post-purchase tip `9b2dacc`. Upload creates
draft versions; Activate atomically sets one active version; delivery/publish
readiness resolve always-latest active owned path. No entitlement pin. No
commit/push. Migration `20260880` local only — not applied.

## Exact files changed

- `supabase/migrations/20260880_store_digital_product_versioning_update_delivery_v1.sql` (new)
- `lib/store/digitalProductVersioning.ts` (new)
- `lib/store/digitalProductVersioning.test.ts` (new)
- `lib/store/digitalAssetUpload.ts`
- `lib/store/digitalAssetUpload.test.ts`
- `lib/store/digitalAccessDelivery.ts`
- `lib/store/digitalAccessDelivery.test.ts`
- `lib/store/digitalProductPublishReadiness.ts`
- `app/actions/storeDigitalAssets.ts`
- `app/components/store/SellerDigitalAssetPanel.tsx`
- `docs/store/implementation/DIGITAL_PRODUCT_VERSIONING_UPDATE_DELIVERY_V1.md` (new)
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

`20260880_store_digital_product_versioning_update_delivery_v1.sql` — **local only, not applied**

## Security review

- Fail closed without active owned version
- Activate rejects foreign store/product; RPC service_role only after editor auth
- No entitlement/grant mutation; no path overwrite of history rows
- Unsigned paths never returned to client

## Tests

Focused vitest: **59 passed** (versioning + upload + delivery + readiness + post-purchase)

## TypeScript

`npx tsc --noEmit` — **PASS**

## Build

See verification report (in progress / completed in session)

## git diff --check

**PASS** (exit 0)

## git status --short

Uncommitted WIP on `office/commerce-digital-product-versioning-update-delivery-v1`

## Open issues

- Migration not applied remotely (await GO)
- No commit/push (await GO)
- Buyer multi-version picker deferred; always-latest only
