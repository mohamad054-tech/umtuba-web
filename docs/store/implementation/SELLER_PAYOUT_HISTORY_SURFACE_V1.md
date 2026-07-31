# Seller Payout History Surface V1

Capability: `commerce.settlement.seller_payout_history_surface_v1`
Status: implemented locally (no new migration)

Depends on:

- Seller Payout Read Model V1 (`20260882` — `get_my_seller_payouts`)
- Payout Balance Visibility V1 (existing Settlement & payouts summary on seller store)
- Existing seller store page / insights components

## Purpose

Narrow **seller-facing payout history** on the existing seller store surface, sourced only from trusted Read Model list RPCs. No bank rails, no write/booking actions, no Dashboard/Admin UI, no redesign.

## Behavior

| Concern | Implementation |
| --- | --- |
| Data source | `fetchMySellerPayouts` → `buildSellerPayoutHistorySurface` |
| Status vocabulary | Exact Read Model statuses: `available`, `in_transit`, `completed` |
| Fail / cancelled | No cancelled enum; prior `fail` events surface as notes while status returns to `available` |
| Ordering | Newest-first (`capture_created_at`, `capture_event_id`) |
| Pagination | Bounded page size 10; keyset via `payout_before` + `payout_before_id` (“Load older payouts”) |
| Empty | Honest empty copy when no RELEASED payout rows |
| Unavailable | Fail-closed when RPC/cursor/store ownership fails |
| Money | Server-trusted minors only; formatted via `formatTrustedMoney` |
| Currency | Per-row currency; no mixed totals in the UI |

## Surfaces

- `lib/store/sellerPayoutHistorySurface.ts` — pure view-model
- `app/components/store/SellerPayoutHistory.tsx` — section UI
- `app/components/store/SellerDashboardInsights.tsx` — mounts section after Settlement & payouts
- `app/seller/store/page.tsx` — owner/manager load + cursor parse

## Security

- Store id from membership only (never client-authored money or store override)
- Page `store_id` must match membership store or surface fails closed
- Omits journal IDs, fingerprints, bank details, provider metadata
- No withdraw / connect-bank controls while rails disabled
- Owner/manager only (same gate as payout read RPCs)

## Migration

**None.** Reuses `20260882` read RPCs.

## Out of scope

Bank rails, payout writes, provider integration, Dashboard/Admin UI, broad nav redesign, reconciliation UI surface, commission invention.

Settlement↔payout diagnostics UI is `commerce.settlement.payout_reconciliation_surface_v1` (`PAYOUT_RECONCILIATION_SURFACE_V1.md`) — separate section; does not change this history surface.
