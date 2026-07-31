# Commerce Live Payment Capture Adapter V1

Capability: `commerce.payments.live_capture_adapter_v1`

Provider: Stripe **test mode** (`sk_test_…`) by default; **live** only via Production Gate V1

Branch: `office/commerce-live-payment-capture-adapter-v1` (+ Production Gate follow-up)

Migration (local only): `20260876_store_live_payment_capture_adapter_v1.sql`

See also: `LIVE_PAYMENT_PRODUCTION_GATE_V1.md`

## Lifecycle

1. Checkout places order → deferred attempt (existing path, unchanged).
2. Buyer starts Stripe test checkout → `create_my_store_stripe_payment_attempt` (amount/currency from order; digital-only).
3. Server creates Stripe Checkout Session (Idempotency-Key = attempt key) and attaches `provider_reference` (session id).
4. Buyer pays on Stripe Hosted Checkout.
5. Return URL and/or webhook **re-fetch** session + PaymentIntent from Stripe.
6. On verified `succeeded` / `paid`, call existing `apply_store_payment_outcome` (service_role) once per `event_key`.

## Trusted boundary

- Browser “success” alone never marks paid.
- Amount/currency matched to `payment_attempts` row (from order).
- Webhook requires `Stripe-Signature` verification.
- Live keys (`sk_live_`) allowed only when Production Gate is complete (see gate doc).

## Env (never commit values)

- `STRIPE_SECRET_KEY` — `sk_test_…` or gated `sk_live_…`
- `STRIPE_MODE` — must match secret mode
- `STRIPE_WEBHOOK_SECRET` — required for webhook route (`whsec_…`; required for live capture config)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — required for live (`pk_live_…`)
- `NEXT_PUBLIC_APP_URL` (or `APP_ORIGIN` / `NEXT_PUBLIC_SITE_URL`)
- `SUPABASE_SERVICE_ROLE_KEY` — server-only outcome apply

## Deferred production hardening

- Dispute / chargeback handling
- Async payment method edge cases beyond Checkout Session
- Multi-PSP, refunds UI, payouts, settlement UI
- Physical commerce / shipping / warehouse (explicitly dormant)

## Out of scope

Shipping carriers, warehouse, supplier portal, affiliate/commission redesign, Learning/AI/Home/Creator/Navigation.
