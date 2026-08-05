# Current Task

## Milestone

Seller Live Payout Provider V1 — **Slice S3** (Manual Ops Live provider + helpers)

## Status

`s3-complete` — Manual Ops Live adapter + destination/execution helpers + focused tests; **committed + pushed** on close; no migrations; S4 not started

## Branch / worktree

- Branch: `office/commerce-seller-live-payout-provider-v1`
- Worktree: `C:\Users\1\Desktop\umtuba\umtuba-web-commerce-seller-live-payout-provider-v1`
- S2 tip (pre-S3): `756057ba438c9b51862b8fa905dcaf9ca0f3c0b0`

## S3 scope

- `lib/store/sellerLivePayout/providers/manualOpsLive.ts`
- `lib/store/sellerLivePayout/destinations.ts`
- `lib/store/sellerLivePayout/executions.ts`
- Focused S3 tests; wire `resolveSellerLivePayoutProviderPort` behind S1 gate

## Explicit non-actions

No S4 orchestrator · no server actions · no UI · no migrations · no UEOS/booking changes · no remote apply

## Next (not this GO)

Slice S4 — orchestrator (attestation → ledger booking coordination)
