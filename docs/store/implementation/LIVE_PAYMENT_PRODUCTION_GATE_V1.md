# Commerce Live Payment Production Gate V1

Capability: `commerce.payments.live_payment_production_gate_v1`  
Module: `lib/store/stripeConfig.ts`  
Branch: `office/commerce-live-payment-production-gate-v1`

## Goal

Replace hard rejection of all `sk_live_` keys with an explicit, fail-closed **Production Gate** that allows live Stripe only when environment, key modes, webhook, and operator acknowledgment are aligned. No real live keys are stored in the repo.

## Modes

| Mode | Secret | Publishable | Notes |
|------|--------|-------------|-------|
| `test` | `sk_test_…` | optional `pk_test_…` | Default local/dev path |
| `live` | `sk_live_…` | required `pk_live_…` | Requires full gate + HTTPS origin + `whsec_…` |

`STRIPE_MODE` must match the secret (and publishable, if present). Mixed test/live is rejected.

## Live gate requirements

1. `STRIPE_MODE=live`
2. `STRIPE_LIVE_PAYMENTS_ENABLED=true`
3. `STRIPE_PRODUCTION_GATE_ACK=I_UNDERSTAND_LIVE_STRIPE_CHARGES_REAL_MONEY`
4. Matching `sk_live_` + `pk_live_` + `whsec_`
5. HTTPS `NEXT_PUBLIC_APP_URL` / `APP_ORIGIN` / `NEXT_PUBLIC_SITE_URL`
6. App environment `production` (or fixture token in automated tests only)

Live mode is forbidden in `development` / `test` / `preview` unless  
`STRIPE_ALLOW_LIVE_IN_NON_PRODUCTION=commerce-live-payment-production-gate-fixture-v1` (fixtures only).

Optional: `STRIPE_REQUIRE_LIVE_IN_PRODUCTION=true` rejects test keys when the app environment is production.

## Readiness report

`buildStripePaymentConfigReadinessReport()` returns redacted checks + key prefixes only. Never includes full secrets or the ack string.

## Unchanged trusted paths

- Webhook: Stripe-Signature verification + Stripe re-fetch
- Return URL: session re-fetch + amount/currency match
- Idempotency: `event_key` on `apply_store_payment_outcome`
- No client secret exposure in Checkout UI / actions

## Out of scope

Payouts, commission seed, wallet mutations, remote migrations, Learning/AI/Home.
