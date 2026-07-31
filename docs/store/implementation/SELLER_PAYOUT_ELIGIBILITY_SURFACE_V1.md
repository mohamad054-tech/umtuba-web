# Seller Payout Eligibility Surface V1

Capability: `commerce.settlement.seller_payout_eligibility_surface_v1`
Status: implemented locally (no new migration)

Depends on:

- Seller Payout Read Model V1 (`20260882` — `get_my_seller_payout_eligibility` / summary)
- Payout Balance Visibility V1 (Settlement & payouts summary preserved)
- Seller Payout History Surface V1 (preserved)
- Payout Reconciliation Surface V1 (preserved)

## Purpose

Narrow **seller-facing payout eligibility** on the existing seller store: whether balance visibility is available, whether settled payable balance exists, and that bank payout rails remain disabled. Read-only. No withdraw/connect-bank controls.

## Behavior

| Concern | Implementation |
| --- | --- |
| Data source | `get_my_seller_payout_eligibility` (+ summary for per-currency available labels) |
| Overall state | `ready` · `unavailable` · `unauthorized` |
| Highlights | `eligible_balance_available` · `no_settled_payable_balance` · `bank_rails_disabled` · `payout_reads_unavailable` · `unauthorized` |
| Reasons | Safe copy for `no_available_settled_balance`, `has_in_transit_payouts` only |
| Currency | Per-currency available labels from trusted summary — never mixed |
| Actions | Always disabled (`actionButtonsEnabled=false`, `bankRailsDisabled=true`) |

## Surfaces

- `lib/store/sellerPayoutEligibilitySurface.ts` — pure view-model
- `app/components/store/SellerPayoutEligibility.tsx` — section UI
- `app/components/store/SellerDashboardInsights.tsx` — mounts after Settlement & payouts
- `app/seller/store/page.tsx` — owner/manager load

## Security

- Membership store id only; foreign eligibility/summary fails closed
- Unknown reason codes omitted (not echoed)
- Inconsistent `bank_payouts_enabled=true` fails closed in V1
- No journal / fingerprint / bank / provider fields
- No withdraw / bank-connect buttons

## Migration

**None.** Reuses `20260882` eligibility RPCs.

## Out of scope

Payout execution, bank rails, write/booking RPCs, Dashboard/Admin UI, redesign, commission invention.
