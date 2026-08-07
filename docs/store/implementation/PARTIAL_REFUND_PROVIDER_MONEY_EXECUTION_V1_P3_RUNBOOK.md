# Partial Refund Provider Money Execution V1 — P3 Runbook

**Status:** P3 controlled first-time execute enablement **prep** only.  
**Production money movement:** **NOT enabled** by this milestone.

## Defaults (fail-closed)

| Control | Default |
| --- | --- |
| Dedicated gate `UMTUBA_STORE_PARTIAL_REFUND_PROVIDER_MONEY_ENABLED` | **OFF** |
| Dedicated gate ACK | required exact value when enabling |
| Execution mode `UMTUBA_STORE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE` | **`off`** |
| Production execution ACK | required only for `execution_mode=production` |
| Operator ACK (per request) | required exact value on admin form |

Ambiguous truthy env values (`1`, `true`, `yes`) are **rejected** for execution mode — only `off` | `test` | `production`.

## Dual gate + execution mode

First-time **submit** requires **all** of:

1. Stripe / live provider readiness (`stripeConfig`)
2. Dedicated provider-money gate (enabled + ACK + non-prod fixture token when applicable)
3. Execution mode allowlist:
   - `off` — never submit
   - `test` — Stripe **test** mode only (fixture/mocks in P3; no real refund in P3)
   - `production` — production app env + `UMTUBA_STORE_PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK` exact value + Stripe **live** mode

## Operator ACK (distinct from env ACKs)

Admin first-time execute form must include:

- Operator reason (3–500 chars)
- Exact acknowledgement: `I_ACKNOWLEDGE_THIS_MAY_MOVE_PROVIDER_MONEY`

Server action validates ACK independently. Missing/invalid ACK → **zero provider call**.

## Test-mode readiness (P3)

- Validate with mocks/fixtures only.
- Do **not** execute a real Stripe refund during P3.
- Never use real card/payment/customer data.
- `execution_mode=test` + Stripe test keys is the only non-production submit allowlist path.

## Uncertain / recovery-required

| State | Action |
| --- | --- |
| `uncertain` | Recovery **lookup only** — never submit again |
| `executing` (fresh or stale) | Do not blind-resubmit; use recovery when stale |
| `succeeded` | Idempotent replay — zero submit |
| `failed` | **V1 no retry** under same idempotency key |

Identify rows on `/admin/store/refunds` recovery panel (`status`, last lookup, recovery-required).

## First-time submit vs recovery lookup

| Path | Money move? | Requires dedicated gate + execution mode? | Requires Stripe config? |
| --- | --- | --- | --- |
| First-time execute | Yes (when enabled) | Yes | Yes |
| Recovery lookup | No | No | Yes |

Recovery must never call `submitPartialRefund`.

## Idempotency

Key: `prf-prov:{ledgerId}` — same key for claim and provider submit. Never mint a new key for retry.

## No production enablement under P3

P3 wires the fail-closed path only. Do **not**:

- remote-apply `20260915`
- set production execution mode in live hosts under this GO
- run real/sandbox provider refunds as part of P3 validation
- auto-compensate uncertain executions
- broaden into restock / entitlement / settlement / commission / payout / Sync partial / `commerce_confirm`
