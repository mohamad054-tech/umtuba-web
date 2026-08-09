# Partial Refund Provider Money — Stripe TEST Fixture Pack V1

**Purpose:** Deterministic NON-SECRET isolated Stripe **TEST** fixture pack for future controlled validation.
**Does not** activate provider gate/mode. **Does not** move money. **Does not** call Stripe. **Does not** write production DB.

Related code:

- `lib/store/partialRefundProviderMoneyExecution/stripeTestFixturePack.ts`

Related prior readiness (integration candidate; may not be on SoT tip):

- Env readiness probe / runbook (operator credential NAMES)
- `COMMERCE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P6R_FIXTURE_READINESS_REPORT.md`

---

## What this pack provides (code-side, NON-SECRET)

| Artifact | Content |
| --- | --- |
| Environment label | `isolated_stripe_test_fixture_pack_v1_not_production` |
| Synthetic TEST PaymentIntent ref | `pi_3TestFixturePackIsolated0001` (shape-valid; not a live Stripe object) |
| Deterministic ownership UUIDs | Reserved `a2010001-…` namespace (not production data) |
| Captured / refund amounts | Captured `5000`, refund `1500` minor units, currency `USD` |
| Payment attempt + capture fact shapes | In-memory shapes for future isolated persistence |
| Committed ledger facts | `status=committed`, amount ≤ captured |
| Provider executions | Empty array (`none`) |
| P6 manifest | Filled with deterministic TEST values; `remotePersistenceAuthorized=false` |

---

## Safe defaults (must remain during pack prep)

| Control | Required now |
| --- | --- |
| Dedicated provider-money gate | OFF / unset |
| Execution mode | `off` / unset |
| Production exec ACK | ABSENT |
| Live Stripe keys (`sk_live_` / `pk_live_`) | ABSENT |

---

## Controlled-validation probe (fail closed)

Call `buildStripeTestFixturePackReport(env)`:

| Verdict | Meaning |
| --- | --- |
| `fixture_pack_ready_gates_remain_off_operator_remote_go_pending` | Pack defs valid + TEST credential shape present + gates OFF; remote GO still required |
| `blocked_test_credentials_absent` | Fail closed — no `sk_test_` / `STRIPE_MODE=test` / app origin |
| `blocked_live_or_mixed_stripe_shape` | Live prefixes or non-test mode detected |
| `blocked_misconfigured_or_unsafe_activation_state` | Gate/mode/ACK not at safe prep defaults |

`isStripeTestFixturePackReadyForControlledValidation(env)` is true only for the ready verdict. It does **not** authorize activation or remote writes.

---

## Still operator-owned (not inventable here)

1. Approved isolated Supabase/test project **or** explicit written GO for money fixtures.
2. Optional: real captured Stripe TEST PaymentIntent when network validation is later authorized.
3. Remote persistence of fact shapes (never auto-written by this pack).
4. Separate isolated TEST activation GO (temporary gate/mode `test`; revert OFF after).

---

## Explicit non-actions

- No dedicated gate enablement
- No execution mode `test` / `production` enablement
- No Stripe network / refund / capture
- No production DB writes / migration apply
- No secret values in git
