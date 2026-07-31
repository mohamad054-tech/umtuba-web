# Settlement ↔ Payout Reconciliation Surface V1

Capability: `commerce.settlement.payout_reconciliation_surface_v1`
Status: implemented locally (no new migration)

Depends on:

- Settlement ↔ Payout Reconciliation Read V1 (`20260883`)
- Seller Payout History Surface V1 (coexists on seller store; preserved)
- Payout Balance Visibility V1 (existing Settlement & payouts summary)

## Purpose

Narrow **seller-facing reconciliation diagnostics** on the existing seller store, sourced only from trusted Reconciliation Read RPCs. Read-only. No bank rails, payout writes, repair workflows, Dashboard/Admin UI, or client-side reconciliation math.

## Behavior

| Concern | Implementation |
| --- | --- |
| Data source | `get_my_seller_settlement_payout_reconciliation` (+ summary) via `fetchMySellerSettlementPayoutReconciliation` |
| Default filter | `issuesOnly: true` |
| Overall state | `aligned` · `issues_detected` · `unavailable` |
| Currency | Per-currency summary buckets — never mixed |
| Ordering | Newest-first (`capture_created_at`, `capture_event_id`) |
| Pagination | Page size 10; keyset via `recon_before` + `recon_before_id` |
| Money | Trusted capture minors only via `formatTrustedMoney` |

## Seller-facing categories (mapped from trusted codes)

| Surface category | Trusted code(s) |
| --- | --- |
| `aligned` | `aligned` |
| `released_without_booking` | `released_without_payout_booking` |
| `orphan_payout` | `payout_without_released_settlement` |
| `unsettled_with_payout` | `unsettled_with_payout` |
| `duplicate_booking` | `duplicate_payout_booking` |
| `completed_inconsistency` | `completed_without_release`, `completed_missing_confirm` |
| `in_transit_missing_submit` | `in_transit_missing_submit` |
| `refunded_with_active_payout` | `refunded_with_active_payout` |

## Surfaces

- `lib/store/payoutReconciliationSurface.ts` — pure view-model (no recon math)
- `app/components/store/SellerPayoutReconciliation.tsx` — section UI
- `app/components/store/SellerDashboardInsights.tsx` — mounts after payout history
- `app/seller/store/page.tsx` — owner/manager load + cursor parse

## Security

- Membership store id only; foreign page/summary `store_id` fails closed
- No client money or client-authored recon results
- Omits journal IDs, fingerprints, bank/provider fields
- No repair / withdraw / bank-connect controls
- Owner/manager only (aligned with recon read RPCs)

## Migration

**None.** Reuses `20260883` reconciliation RPCs.

## Out of scope

Payout execution, bank rails, write/booking RPCs, Dashboard/Admin UI, repair buttons, commission invention, redesign.
