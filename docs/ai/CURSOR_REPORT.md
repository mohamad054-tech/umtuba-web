# CURSOR_REPORT — Commerce Revenue ↔ Payout Balance Visibility V1

## Summary

**PASS** — Approved milestone `commerce.revenue.payout_balance_visibility_v1` implemented locally. Revenue Bridge seller visibility loads trusted payout eligibility/summary and exposes per-currency available / in-transit / completed balances. Bank payout execution stays disabled. No migration. No Dashboard/AI.

## Exact selected milestone

`commerce.revenue.payout_balance_visibility_v1`

## SSOT approval

Gate proposal converted to active APPROVED implementation after Product GO. Base tip: Seller Payout Read Model `66a8bed`.

## Exact files changed

- `lib/store/commerceRevenueBridge.ts`
- `lib/store/commerceRevenueBridge.test.ts`
- `app/seller/store/page.tsx`
- `docs/store/implementation/REVENUE_PAYOUT_BALANCE_VISIBILITY_V1.md` (new)
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`
- `docs/ai/SESSION_HANDOFF.md`

## Migrations created

None.

## Security review

- Balances only from authenticated owner/manager payout read RPCs
- Fail closed when reads unavailable
- `payoutsEnabled` forced false; rejects unexpected `bankPayoutsEnabled=true`
- No client money; no sensitive ledger/provider fields

## Open issues

- Await commit / push GO
- Broad payout UI / bank rails still deferred
