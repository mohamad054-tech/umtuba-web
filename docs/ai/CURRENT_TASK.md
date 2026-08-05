# Current Task

## Milestone

Seller Live Payout Provider V1 — **Slice S4** (orchestrator)

## Status

`s4-complete` — live payout orchestrator + focused tests; **committed + pushed** on close; no migrations; S5 not started

## Branch / worktree

- Branch: `office/commerce-seller-live-payout-provider-v1`
- Worktree: `C:\Users\1\Desktop\umtuba\umtuba-web-commerce-seller-live-payout-provider-v1`
- S3 tip (pre-S4): `91dc26b54e87ddb0b12959401942fbae221af3e5`

## S4 scope

- `lib/store/sellerLivePayout/orchestrator.ts`
- `lib/store/sellerLivePayout/orchestrator.test.ts`
- Wire exports; extend failure/phase types if required
- Reuse `submitPayoutBooking` / `failPayoutBooking` / `confirmPayoutBooking`

## Explicit non-actions

No S5 server actions · no UI · no migrations · no Stripe payment / commerce_confirm changes · no remote apply

## Next (not this GO)

Slice S5 — seller + admin server actions
