# Cursor Report

**PASS + STAGED** — Seller Catalog Performance & Query Batching V1

## Base

- SoT: `origin/office/seller-catalog-wiring-v1` @ `0f20502`
- Branch: `office/seller-catalog-performance-batching-v1`
- Worktree: `C:\Users\Admin\Desktop\umtuba\umtuba-web-seller-catalog-performance-batching-v1`

## Change

Hardened seller catalog health batching: dedupe/chunk IDs, parallel wave A (media/variants/digital), wave B (prices), fail-closed on batch errors, store-scope filter, `queryCount` instrumentation + tests.

## Verification

- Vitest: **21 passed** (wiring/perf 9 + experience 6 + dashboard insights 6)
- tsc PASS · build PASS · lockfile unchanged · `git diff --cached --check` PASS

## Open

Await commit GO. No push.
