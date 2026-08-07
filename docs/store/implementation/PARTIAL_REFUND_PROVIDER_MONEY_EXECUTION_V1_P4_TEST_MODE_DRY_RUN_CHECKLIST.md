# Partial Refund Provider Money — P4 Test-Mode Dry-Run Checklist

**Status:** Checklist only. **Do NOT perform** the dry-run until an approved isolated Stripe TEST fixture pack + explicit P6 GO. **P6 dry-run BLOCKED** (`P6_TEST_MODE_DRY_RUN_BLOCKED`) — no Stripe TEST credentials in runtime; remote committed ledger fixtures = 0.  
**Migration:** `20260915_store_partial_refund_provider_money_execution_v1.sql` (remote-applied P5D).

## Preconditions (all required)

- [ ] Migration SQL applied/verified on the target isolated environment
- [ ] Dedicated gate explicitly enabled **only** in the isolated test environment:
  - `UMTUBA_STORE_PARTIAL_REFUND_PROVIDER_MONEY_ENABLED=true`
  - gate ACK exact value set
  - non-production fixture token set when not in production app env
- [ ] Execution mode exactly `test`  
  (`UMTUBA_STORE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE=test`)
- [ ] Stripe **test** credentials only (`sk_test_…`, `STRIPE_MODE=test`)
- [ ] Production execution ACK **absent**
- [ ] Known isolated test order / payment fixture (no production customer/order/payment data)
- [ ] Known **committed** partial-refund ledger
- [ ] Amount/currency manually verified against ledger
- [ ] Trusted PaymentIntent resolves to Stripe **test-mode** `pi_…`
- [ ] Operator ACK exact value confirmed on the admin form
- [ ] Expected idempotency key shown: `prf-prov:{ledgerId}`

## Execution steps (future GO only)

1. Capture **before** DB snapshot of ledger + provider execution rows for the fixture.
2. Run first-time admin execute once.
3. Verify provider outcome (Stripe test dashboard / retrieve refund).
4. Capture **after** DB snapshot (`succeeded` | `failed` | `uncertain`).
5. Second-submit: same ledger → expect **zero additional submit** (idempotent replay or recovery_required).
6. If uncertain simulated: run recovery **lookup only**; confirm zero submit; confirm persisted outcome.
7. **Post-run gate returned OFF** (dedicated gate + execution mode back to defaults).

## Explicit non-actions

- No live Stripe keys
- No production customer data
- No auto-compensation
- No restock / entitlement / settlement / commission / payout / Sync partial / `commerce_confirm`
