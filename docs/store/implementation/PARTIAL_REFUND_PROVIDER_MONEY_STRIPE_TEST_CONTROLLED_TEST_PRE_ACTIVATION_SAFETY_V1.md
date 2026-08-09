# Partial Refund Provider Money — Stripe TEST Controlled Test Pre-Activation Safety V1

**Purpose:** Migration-independent **ZERO-MONEY** pre-activation safety for a future controlled Stripe **TEST** activation window.
**Does not** contact Stripe. **Does not** activate provider gates/modes. **Does not** start provider execution. **Does not** write DB. **Does not** authorize activation.

Related code:

- `lib/store/partialRefundProviderMoneyExecution/stripeTestControlledTestPreActivationSafety.ts`
- Composes (read-only): `stripeTestOfflinePreflightValidator.ts`, `stripeTestFixturePack.ts`, `gate.ts`, `executionMode.ts`

---

## Hard invariants

| Invariant | Value |
| --- | --- |
| NETWORK_STRIPE_CALLS | 0 |
| MONEY_MOVEMENT | 0 |
| DB_WRITES | 0 |
| PROVIDER_GATES | OFF |
| activationAuthorized | **always false** from this module |
| Secrets in results | never (NAMES + presence/mode booleans + operator-safe codes only) |
| Real credentials for unit tests | not required |

---

## What it closes (remaining pre-activation gaps)

1. Structural zero-money safety that can **pass without credentials** (CI / regression safe)
2. TEST/LIVE fail-closed when credentials are present
3. Fixture pack schema validity + determinism
4. Provider gate starting state = OFF / execution mode OFF / production ACK absent
5. Credential presence reported without values
6. Deterministic composite result + offline preflight composition
7. Operator-safe issue codes + messages
8. Explicit acceptance matrix asserting activation remains forbidden

---

## Verdicts

| Verdict | Meaning |
| --- | --- |
| `pre_activation_zero_money_safe_gates_off_activation_forbidden` | Structural ZERO-MONEY checks pass; activation still forbidden |
| `blocked_live_or_test_live_mismatch` | LIVE selected or TEST/LIVE mismatch |
| `blocked_fixture_schema_or_determinism_invalid` | Fixture pack schema/determinism failed |
| `blocked_provider_gate_starting_state_unsafe` | Gate/mode/ACK not at safe starting state |

Helpers:

- `isStripeTestControlledTestPreActivationStructurallySafe(env)` — structural pass (no credentials required)
- `isStripeTestControlledTestPreActivationCredentialReady(env)` — structural pass **and** offline preflight TEST prep ready (still does **not** authorize activation)

---

## Operator posture

1. Run structural safety with empty/local env → must report gates OFF + fixture valid.
2. Optionally supply **TEST-only** credentials (never commit) → credential-ready may become true.
3. **Do not** enable gates/mode from this module. A separate coordinator activation GO is required later.
4. LIVE keys / mixed TEST·LIVE → immediate NO-GO.

---

## Explicit non-actions

- No Stripe network / SDK usage
- No dedicated gate enablement
- No execution mode enablement
- No provider money execute / admin execute
- No DB writes / migrations
- No secret values in report payloads
- No self-assigned activation follow-up
