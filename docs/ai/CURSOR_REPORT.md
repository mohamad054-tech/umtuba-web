# CURSOR_REPORT — Seller Payout Eligibility Surface V1

## Summary

**PASS** — Implemented and staged locally. No commit / push / remote migration apply.

Product GO approved `commerce.settlement.seller_payout_eligibility_surface_v1` after recon surface `94040b4`. Narrow seller-store eligibility over trusted Read Model RPCs. No Dashboard/Admin/AI/bank rails.

## Exact selected milestone

`commerce.settlement.seller_payout_eligibility_surface_v1`

## SSOT justification

Roadmap audit recommended this as the single best next Commerce milestone after Payout Reconciliation Surface V1. Human GO approved it as the official next Commerce milestone.

## Exact files changed

- `lib/store/sellerPayoutEligibilitySurface.ts`
- `lib/store/sellerPayoutEligibilitySurface.test.ts`
- `app/components/store/SellerPayoutEligibility.tsx`
- `app/components/store/SellerDashboardInsights.tsx`
- `app/seller/store/page.tsx`
- `docs/store/implementation/SELLER_PAYOUT_ELIGIBILITY_SURFACE_V1.md`
- `docs/store/implementation/SELLER_PAYOUT_READ_MODEL_V1.md` (cross-link)
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`
- `docs/ai/SESSION_HANDOFF.md`

## Migrations created

None — reuses `20260882`.

## Security review

- Membership store id only; foreign eligibility/summary fails closed
- Unknown reason codes omitted; `bank_payouts_enabled=true` fails closed
- No journal / fingerprint / bank / provider fields
- No withdraw / bank-connect controls
- Owner/manager gate aligned with payout read RPCs

## Tests / TypeScript / Build

- Focused: `sellerPayoutEligibilitySurface.test.ts` — 10 passed
- Affected: read-model, bridge, history, recon surface, recon read, foundation — **117 passed** across 7 files
- `npx tsc --noEmit`: PASS
- `npm run build`: PASS
- `git diff --check`: PASS (this pass)

## Open issues

Await commit/push GO. Bank rails remain disabled.
