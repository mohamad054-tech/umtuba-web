# CURSOR_REPORT — Commerce Post-Capture Digital Entitlement Grant V1

## Summary

After trusted Stripe capture Sync + settlement allocate, grants digital
entitlements, consumes inventory reservations, and marks coarse fulfillment
fulfilled. Local migration `20260877` only — not applied remotely. No
commit/push. Base `90283e8…` unchanged as tip parent.

## Exact files changed

- `supabase/migrations/20260877_store_digital_entitlement_grant_v1.sql` (new)
- `lib/store/digitalEntitlementGrant.ts` (new)
- `lib/store/digitalEntitlementGrant.test.ts` (new)
- `lib/store/stripePaymentOutcomeApply.ts`
- `lib/store/postCaptureSettlementAllocate.test.ts`
- `lib/store/orders.ts`
- `app/api/store/payments/stripe/webhook/route.ts`
- `app/components/store/OrderDetailView.tsx`
- `docs/store/implementation/POST_CAPTURE_DIGITAL_ENTITLEMENT_GRANT_V1.md` (new)
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

`supabase/migrations/20260877_store_digital_entitlement_grant_v1.sql` (local only; not applied)

## Security review

- Grant RPC is service_role only; runs only after trusted capture Sync path
- Buyer list RPC is authenticated (own rows) + service_role
- Entitlement tables FORCE RLS; buyers SELECT own entitlements only
- Requires attempt `captured`, order `paid`, matching capture `correlation_id`
- Unique entitlement per `order_item_id`; grant-events idempotent on `event_key`
- Non-captured outcomes skip grant
- Grant failure surfaces as `entitlement.status=failed` (never falsely granted)

## Tests

Focused Commerce suites: **225 passed** (14 files)

## TypeScript

`npx tsc --noEmit` — pass

## Build

`npm run build` — pass

## git diff --check

pass

## git status --short

Uncommitted local WIP on base tip (see Final Verification Report).

## Open issues

- Await commit / push GO
- Await apply GO for `20260877`
- release / payouts / refunds / download CDN / physical shipping remain deferred
