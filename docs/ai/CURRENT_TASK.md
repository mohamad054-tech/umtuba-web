# Current Task

## Task title

Commerce Digital Entitlement Revoke on Refund V1

## Status

`pass` — verification complete locally — **staged / uncommitted / unpushed**

## Capability

`commerce.digital.entitlement_revoke_on_refund_v1`

## Source of Truth base

- Branch: `origin/office/unified-integration-verification-v1`
- Commit: `9cd20a28c01c8f8d6a5adbb3e85b2ea38c80a721`

## Verification branch / worktree

- Branch: `office/commerce-digital-entitlement-revoke-on-refund-v1b`
- Worktree: `C:\Users\Admin\Desktop\umtuba\umtuba-web-commerce-digital-entitlement-revoke-on-refund-v1b`
- Port source: `origin/office/commerce-digital-entitlement-revoke-on-refund-v1` @ `306a023`
- Locked path left untouched: `...\umtuba-web-commerce-digital-entitlement-revoke-on-refund-v1`

## Scope this pass

1. After final successful trusted full-order refund (Sync success + idempotent replay), revoke buyer digital entitlements
2. Migration `20260889` (after `20260888` refund ops) — local only
3. Fail-closed + idempotent revoke ledger
4. Wire into `applyFullOrderRefund` / refund operations surface

## Explicitly not done

- No commit / push until GO
- No remote migration apply
- No partial refund / Stripe rail
- No delete of locked v1 worktree or old branch `office/commerce-digital-entitlement-revoke-on-refund-v1`
