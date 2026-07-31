# Current Task

## Task title

Commerce Seller Payout Read Model V1

## Status

`implementation-complete-local` — awaiting commit / push / migration-apply GO

## Branch

`office/commerce-settlement-seller-payout-read-model-v1`

## Base

`032ac7782459aa266ff1463556a4f3890f5617bb` (Seller Payout handoff close) atop `aa99592`

## Worktree

`C:\Users\Admin\Desktop\umtuba\umtuba-web-non-ai-next-milestone-gate-v1`

## Milestone

`commerce.settlement.seller_payout_read_model_v1` — **APPROVED** and implemented locally

## Scope delivered

Trusted owner/manager read RPCs: eligibility, per-currency available/in-transit/completed summary, newest-first payout history/status. Reuses foundation payout states. No bank rails. No Dashboard.

## Machine policy

Commerce laptop only. No Dashboard/admin UI. No AI tracks.
No remote migration apply / commit / push without explicit GO.

## Next

Commit/push GO (trailer-free), then separate apply GO for `20260882`.
