# Current Task

## Task title

Commerce Post-Capture Settlement Allocate V1

## Status

`implementation-complete-local` — awaiting review / commit / push GO

## Worktree

`C:\Users\Admin\Desktop\umtuba\umtuba-web-commerce-post-capture-settlement-allocate-v1`

## Branch

`office/commerce-post-capture-settlement-allocate-v1`

## Base / HEAD

Base: `0bde81d75a8c461fb466128c4c8a6f354a209c1a`
HEAD: uncommitted implementation on top of base

## Milestone

`commerce.settlement.post_capture_allocate_v1`

## Delivered

- Wire trusted Stripe capture → Settlement Foundation `allocate`
- Idempotent `${captureEventKey}:allocate` event keys
- Skip allocate for non-captured outcomes
- No migration (reuses `apply_store_settlement_event`)

## Next

Review → trailer-free commit GO → push GO (no migration apply)
