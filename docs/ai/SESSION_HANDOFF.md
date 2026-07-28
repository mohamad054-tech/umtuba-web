# Session Handoff — UMTUBA

**Updated:** 2026-07-28

## Commerce program status

Consolidation complete. Implementation track active.

### Completed implementation

1. Storefront foundation
2. Cart & Checkout
3. Buyer Orders
4. Seller Orders Operations
5. Seller Catalog & Product Management
6. Seller Inventory & Reservation Visibility
7. Seller Dashboard & Operational Insights
8. Trading Domain Alignment & Integrity V1
9. Revenue Ledger Bridge Foundation V1 (current) — `office/commerce-revenue-ledger-bridge-foundation-v1`

## Canonical trading → finance path

Catalog → Cart → Quote → Order snapshots → Payment state
→ **Commerce financial event** (`lib/store/commerceRevenueBridge.ts`)
→ `apply_store_payment_outcome` / `apply_store_settlement_event` → UEOS

Commission policy: **not_configured** (gross facts only; merchant share not assumed).
Payouts: **not enabled**. Historical backfill: **dry-run only**.

## Frozen architecture

Do not modify `docs/commerce/**` frozen foundations / Physical SAs / Manifesto.

## Next

Commission policy when trusted, or controlled Sync backfill for paid orders without capture events. No payment provider / Warehouse / Shipping Network unless asked.
