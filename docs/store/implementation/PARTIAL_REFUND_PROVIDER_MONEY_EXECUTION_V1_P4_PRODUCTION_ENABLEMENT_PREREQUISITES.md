# Partial Refund Provider Money — P4 Production Enablement Prerequisites

**P4 must NOT satisfy this by flipping env values.**  
This is a future production gate list only.

## Required before any production enablement

- [ ] Remote migration verified (correct free version; objects + grants + history)
- [ ] Isolated Stripe **test-mode** dry-run **PASS**
- [ ] Recovery lookup path **PASS**
- [ ] No unresolved `uncertain` executions for the target scope
- [ ] Live Stripe config verified (Production Gate + live keys + webhook)
- [ ] Dedicated provider-money gate explicitly enabled for production
- [ ] Execution mode exactly `production`
- [ ] Production execution ACK explicitly configured  
  (`UMTUBA_STORE_PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK`)
- [ ] Operator ACK required per admin action
- [ ] Audit / observability surface available (status, idempotency, timestamps, last op)
- [ ] Rollback / disable procedure documented and understood
- [ ] Emergency gate-off procedure documented and understood

## Emergency gate-off procedure (document; do not execute in P4)

1. Set `UMTUBA_STORE_PARTIAL_REFUND_PROVIDER_MONEY_ENABLED` unset/false.
2. Set `UMTUBA_STORE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE=off`.
3. Remove/omit production execution ACK.
4. Confirm admin readiness shows first-time submit **not** allowed.
5. Leave recovery lookup available only if Stripe config remains valid and money is not moved.

## Explicit non-ownership

Production enablement still must not auto-compensate uncertain outcomes or broaden into stock/entitlement/settlement/commission/payout/Sync/`commerce_confirm`.
