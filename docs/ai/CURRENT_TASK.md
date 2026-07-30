# Current Task

## Task title

Commerce Live Payment Capture Adapter V1

## Status

`build-gate-cleared` — tests + tsc + `npm run build` green; awaiting commit / push / apply GO

## Worktree

`C:\Users\Admin\Desktop\umtuba\umtuba-web-commerce-live-payment-capture-v1`

## Branch

`office/commerce-live-payment-capture-adapter-v1`

## Base / HEAD

`3a369b5729cf8a1621daa7c4e064fdfde7183b12` (uncommitted implementation on top)

## Milestone

`commerce.payments.live_capture_adapter_v1` — Stripe test-mode only

## Delivered

- Migration (local): `20260876_store_live_payment_capture_adapter_v1.sql`
- Stripe Checkout Session create/resume + attach provider_reference
- Trusted return + signed webhook → `apply_store_payment_outcome`
- Checkout UI: Pay with Stripe (test) after order
- Digital-first gate (rejects physical lines)

## Next

Security review → trailer-free commit GO → push GO → apply `20260876` GO
