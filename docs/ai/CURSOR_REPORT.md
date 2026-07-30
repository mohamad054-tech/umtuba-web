# CURSOR_REPORT — Commerce Post-Capture Settlement Allocate V1

## Summary

Wired trusted Stripe capture into Settlement Foundation `allocate` so captured
digital funds leave platform liability into store escrow. No migration. No
commit/push/remote apply. Base `0bde81d…` unchanged as tip parent.

## Exact files changed

- `lib/store/postCaptureSettlementAllocate.ts` (new)
- `lib/store/postCaptureSettlementAllocate.test.ts` (new)
- `lib/store/stripePaymentOutcomeApply.ts`
- `lib/store/livePaymentCaptureAdapter.test.ts`
- `app/api/store/payments/stripe/webhook/route.ts`
- `docs/store/implementation/POST_CAPTURE_SETTLEMENT_ALLOCATE_V1.md` (new)
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

None.

## Security review

- Allocate runs only on server-side service-role path after Sync
- Client checkout/actions have no settlement RPC access
- Money/correlation from trusted capture inputs; Settlement RPC re-validates
  attempt/order/capture match
- Non-captured outcomes skip allocate
- Failure returns `settlement.status=failed` (never falsely `allocated`)

## Tests

Focused suites: **164 passed**

## TypeScript

`npx tsc --noEmit` — pass

## Build

`npm run build` — pass (local non-junction `node_modules` via `npm ci`)

## git diff --check

pass

## git status --short

See Final Verification Report.

## Open issues

- Await commit / push GO
- release / payouts / refunds / digital entitlement remain deferred
