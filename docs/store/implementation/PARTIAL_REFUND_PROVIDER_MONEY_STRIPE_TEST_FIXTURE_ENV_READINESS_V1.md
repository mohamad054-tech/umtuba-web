# Partial Refund Provider Money — Stripe TEST Fixture Env Readiness V1

**Purpose:** Operator checklist for isolated Stripe **TEST** prerequisites.  
**Does not** activate provider gate/mode. **Does not** move money. **Does not** use live Stripe.

Related code (audit helper, no network):

- `lib/store/partialRefundProviderMoneyExecution/stripeTestFixtureEnvReadiness.ts`

Prior blockers (still authoritative until credentials/fixtures supplied):

- `COMMERCE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P6_TEST_MODE_REPORT.md`
- `COMMERCE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P6R_FIXTURE_READINESS_REPORT.md`
- `PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P4_TEST_MODE_DRY_RUN_CHECKLIST.md`

---

## Current safe defaults (must remain)

| Control | Required now |
| --- | --- |
| `UMTUBA_STORE_PARTIAL_REFUND_PROVIDER_MONEY_ENABLED` | unset / false |
| `UMTUBA_STORE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE` | unset / `off` |
| `UMTUBA_STORE_PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK` | **ABSENT** |
| Live Stripe keys (`sk_live_` / `pk_live_`) | **ABSENT** |

---

## Operator inputs required (NAMES / locations only)

Place **TEST-only** values in the isolated worktree local env file (recommended: `.env.local`). Never commit. Never copy production credentials.

| Env name | Requirement |
| --- | --- |
| `STRIPE_MODE` | exactly `test` |
| `STRIPE_SECRET_KEY` | prefix `sk_test_` only |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | prefix `pk_test_` only |
| `STRIPE_WEBHOOK_SECRET` | prefix `whsec_` |
| `NEXT_PUBLIC_APP_URL` | valid local/test app origin |

Optional alias for publishable: `STRIPE_PUBLISHABLE_KEY` (same `pk_test_` rule).  
Origin aliases: `APP_ORIGIN` / `NEXT_PUBLIC_SITE_URL` (prefer `NEXT_PUBLIC_APP_URL`).

### Future temporary TEST activation GO only (keep unset during readiness)

| Env name | Notes |
| --- | --- |
| `UMTUBA_STORE_PARTIAL_REFUND_PROVIDER_MONEY_ENABLED` | truthy only under explicit GO |
| `UMTUBA_STORE_PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK` | exact ACK value from `gate.ts` |
| `UMTUBA_STORE_PARTIAL_REFUND_PROVIDER_MONEY_ALLOW_IN_NON_PRODUCTION` | exact non-prod fixture token from `gate.ts` |
| `UMTUBA_STORE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE` | exactly `test` under GO; return to `off` after |

Per-request admin operator ACK (not env): exact value from `operatorAck.ts` on the execute form.

---

## Fixture pack gaps (non-env — still required before dry-run)

1. Approved isolated Supabase/test project **or** explicit written GO for money fixtures on shared primary.
2. Captured Stripe **TEST** PaymentIntent (`pi_…`).
3. Matching store/order/`payment_attempts` + capture outcome facts so trusted resolver yields that PI.
4. **Committed** partial-refund ledger (amount > 0, currency match, ≤ captured).
5. Zero provider execution rows for that ledger before first submit.
6. Filled P6 fixture manifest (see P6R report template).

---

## How to probe locally (no activation)

Call `buildStripeTestFixtureEnvReadinessReport(env)` with an explicit env map or process env after operator loads TEST credentials locally.

Expected prep success verdict: `stripe_test_config_shape_ready_gates_remain_off`.

If credentials absent: `operator_credentials_required`.

---

## Explicit non-actions

- No dedicated gate enablement in this readiness slice
- No execution mode `test`/`production` enablement
- No Stripe network / refund / capture
- No production DB writes / migration apply
- No secret values in git or reports
