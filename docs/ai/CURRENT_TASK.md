# Current Task

## Milestone

Commerce Partial Refund In-Flight Committing Visibility V1

## Status

**`COMMERCE_PARTIAL_REFUND_IN_FLIGHT_COMMITTING_VISIBILITY_V1_CLOSED`**

Admin-only read-only discovery of exact `committing` ledger rows via privileged RPC.
Local migration `20260901` committed; **not** remote-applied.

## Allowed scope (closed)

- Local migration `20260901` (list committing RPC only)
- Partial-refund ledger RPC/repository wiring for `listCommitting`
- `lib/store/partialRefundInFlightCommittingVisibility/`
- Admin visibility action + admin refunds UI section
- Docs/handoff + tests

## Forbidden (still)

- Remote migration apply / `supabase db push`
- Money / provider / payout / compensation / committed cancel
- Auto-recovery; seller/buyer visibility surfaces

## Branch / worktree

- Worktree: `C:\Users\1\Desktop\umtuba\umtuba-web-commerce-partial-refund-in-flight-committing-visibility-v1`
- Branch: `office/commerce-partial-refund-in-flight-committing-visibility-v1`
- Base: `8e16c8c108d418457ccdcbeb2ed542cca4d30472`

## Doc

`docs/store/implementation/PARTIAL_REFUND_IN_FLIGHT_COMMITTING_VISIBILITY_V1.md`
