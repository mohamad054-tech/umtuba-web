# Current Task

## Task title

Seller Payout Eligibility Surface V1

## Status

`implementation-complete-local` — **PASS + STAGED** — awaiting commit/push GO

## Capability

`commerce.settlement.seller_payout_eligibility_surface_v1` — **APPROVED** (Product GO 2026-07-31)

## Branch

`office/commerce-settlement-seller-payout-eligibility-surface-v1`

## Base / tip

Base: `94040b4fbdc9415c0a496447db417cc892a68ba1` (Payout Reconciliation Surface V1)

## Worktree

`C:\Users\Admin\Desktop\umtuba\umtuba-web-non-ai-next-milestone-gate-v1`

## Coordination

- Desktop owns Dashboard / Admin UI / AI Platform / Providers / Runtime / Gemini / Tutor — do not touch
- Laptop = Commerce seller-store only

## Delivered

- Pure surface: `lib/store/sellerPayoutEligibilitySurface.ts` (+ tests)
- UI: `app/components/store/SellerPayoutEligibility.tsx`
- Wired into existing seller store insights + page (owner/manager)
- Doc: `docs/store/implementation/SELLER_PAYOUT_ELIGIBILITY_SURFACE_V1.md`
- **No new migration** — reuses `20260882` eligibility RPCs

## Scope held

Read-only eligibility honesty. No bank rails, Dashboard/Admin, payout writes, or withdraw CTAs. Balances / history / recon preserved.

## Next

Human GO for: commit → push. Do not invent the following milestone until SSOT names it.
