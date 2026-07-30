# CURSOR_REPORT — Commerce Post-Capture Settlement Release V1

## Summary

After trusted Stripe capture Sync + settlement allocate + digital entitlement
grant, invokes Settlement Foundation `release` so seller funds move from store
escrow to payable. No migration. No commit/push/remote apply. Base `dd27b3a…`
unchanged as tip parent.

## Exact files changed

- `lib/store/postCaptureSettlementRelease.ts` (new)
- `lib/store/postCaptureSettlementRelease.test.ts` (new)
- `lib/store/stripePaymentOutcomeApply.ts`
- `lib/store/postCaptureSettlementAllocate.ts` (comment only)
- `lib/store/postCaptureSettlementAllocate.test.ts`
- `lib/store/digitalEntitlementGrant.test.ts`
- `lib/store/livePaymentCaptureAdapter.test.ts`
- `app/api/store/payments/stripe/webhook/route.ts`
- `docs/store/implementation/POST_CAPTURE_SETTLEMENT_RELEASE_V1.md` (new)
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

None.

## Security review

- Release runs only on server-side service-role path after Sync
- Release gated on allocate success **and** entitlement grant success
- Non-captured outcomes skip release
- Client checkout/actions have no settlement RPC access
- Money/correlation from trusted capture inputs; Settlement RPC re-validates
- Failure returns `release.status=failed` (never falsely `released`)

## Tests

Focused suites: **239 passed** (15 files)

## TypeScript

`npx tsc --noEmit` — pass

## Build

`npm run build` — pass (local non-junction `node_modules` via `npm ci`)

## git diff --check

pass

## git status --short

Uncommitted local WIP on base tip (see Final Verification Report).

## Open issues

- Await commit / push GO
- bank payouts / refunds / download CDN remain deferred
