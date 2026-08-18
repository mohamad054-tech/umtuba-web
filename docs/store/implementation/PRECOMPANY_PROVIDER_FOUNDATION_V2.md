# Store Provider Foundation V2 (pre-company)

Status: implemented in `umtuba-web` (local-only migration)
Migration: `supabase/migrations/20260929_store_learning_precompany_foundation_v2.sql`

## Goal

Provider-neutral commerce infrastructure so Store can later accept real partners
without importing unauthorized third-party catalogs today.

## Rules

- MOCK providers/products only
- Unknown rights default DENY
- MOCK_DATA cannot become production-purchasable
- No SHEIN/Temu/etc product data
- No plaintext partner credentials
- No real payouts or tax collection

## Engine

| Piece | Module |
| --- | --- |
| Registry + adapters | `lib/store/providers/registry.ts` |
| Rights / publish / checkout gates | `lib/store/providers/rights.ts` |
| Provenance isolation | `lib/store/providers/provenance.ts` |
| Import / normalize / SKU map | `lib/store/providers/importPipeline.ts` |
| Checkout-mode routing | `lib/store/providers/checkoutRouting.ts` |

Imported items stage in `commerce_catalog_items` and may later bind to existing
`store_products`. This does not replace the current seller catalog.
