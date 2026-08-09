# Partial Refund Provider Money — Stripe TEST Offline Preflight Validator V1

**Purpose:** Completely **offline** validator proving a future controlled Stripe **TEST** environment is safe to start preparing.
**Does not** contact Stripe. **Does not** activate provider gates/modes. **Does not** start provider execution. **Does not** write DB.

Related code:

- `lib/store/partialRefundProviderMoneyExecution/stripeTestOfflinePreflightValidator.ts`
- Depends on (read-only semantics): `stripeTestFixturePack.ts`

---

## Hard invariants

| Invariant | Value |
| --- | --- |
| NETWORK_CALLS | 0 |
| STRIPE_CALLS | 0 |
| DB_WRITES | 0 |
| Provider execution started | never |
| Secrets in results | never (NAMES + presence/mode booleans only) |

---

## What it validates

1. Required TEST env variable **NAMES**
2. Credential **presence** without displaying values
3. TEST mode selected; LIVE not selected
4. Fixture schema validity + deterministic fixture configuration
5. Provider gate required starting state = OFF / execution mode OFF / production ACK absent
6. Missing credentials → fail closed
7. Obvious TEST/LIVE mismatch → fail closed

---

## Required env NAMES (values never returned)

- `STRIPE_MODE`
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (alt: `STRIPE_PUBLISHABLE_KEY`)
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_APP_URL` (alt: `APP_ORIGIN`, `NEXT_PUBLIC_SITE_URL`)

---

## Verdicts

| Verdict | Meaning |
| --- | --- |
| `offline_preflight_pass_safe_to_start_controlled_stripe_test_prep` | Offline checks pass; still does **not** authorize activation or money movement |
| `blocked_missing_test_credentials` | Fail closed — required presence / TEST shape incomplete |
| `blocked_test_live_mismatch_or_live_selected` | LIVE selected or TEST/LIVE mismatch |
| `blocked_fixture_schema_or_determinism_invalid` | Fixture pack schema/determinism failed |
| `blocked_provider_gate_starting_state_unsafe` | Gate/mode/ACK not at safe starting state |

`isStripeTestOfflinePreflightSafeToStart(env)` is true only for the pass verdict.

---

## Explicit non-actions

- No Stripe network / SDK usage
- No dedicated gate enablement
- No execution mode enablement
- No provider money execute / admin execute
- No DB writes / migrations
- No secret values in report payloads
