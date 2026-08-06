# Current Task

## Milestone

Commerce Partial Refund Ledger + RPC remote apply — **COMPLETE / CLOSED**

## Status

**`PARTIAL_REFUND_REMOTE_APPLY_CLOSEOUT_COMPLETE`**

Remote applied and registered:

1. `20260899` — partial-refund ledger schema
2. `20260900` — privileged ledger RPCs

Apply order: `20260899 → 20260900`. Remote tip: **`20260900`**.
Learning `20260896`/`20260897` unchanged. Payout `20260898` unchanged.
Four ledger tables exist with RLS/constraints/indexes and **zero rows**.
Eight RPCs + helper exist; EXECUTE is **service_role only** (no public/anon/authenticated).
Smoke: `SAFE_SMOKE_SKIPPED_NO_APPROVED_FIXTURE`.
`commerce_confirm` false. Seller Live Payout gate OFF.
No refund occurred. No provider call. No production money movement.
Provider execution and downstream unwind remain **unsupported**.
Next milestone requires a **separate GO**.

## Branch / worktree

- Worktree: `C:\Users\1\Desktop\umtuba\umtuba-web-commerce-partial-refund-rpc-remote-apply-readiness-v1`
- Branch: `office/commerce-partial-refund-rpc-remote-apply-readiness-v1`
- Prior HEAD: `79f15131d6defebe950d942a189ee05b35306082`

## Ownership preserved

Ledger schema + privileged RPCs true · money/provider/restock/entitlement/settlement/commission false · public exposure false · commerce_confirm false · payout gate OFF

## Forbidden without new GO

Provider/Sync refund execution · restock/entitlement/settlement/commission unwind · public RPC grants · commerce_confirm enable · payout/Manual Ops · merge
