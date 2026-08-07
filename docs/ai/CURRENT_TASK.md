# CURRENT_TASK

## Task

Commerce Partial Refund In-Flight Committing Visibility — **corrective migration renumber** after cross-domain collision.

## Status

**LOCAL RENUMBER DONE — awaiting GO** for commit and/or controlled remote apply/register of **`20260905`**.

## Context

1. Feature code closed @ `a3c155b` (`COMMERCE_PARTIAL_REFUND_IN_FLIGHT_COMMITTING_VISIBILITY_V1_CLOSED`).
2. Controlled SQL apply of the RPC **succeeded** on live DB; history registration **never completed**.
3. **Do not** register as `20260901` (Learning-owned).
4. Overnight Translation claimed **`20260903`** and **`20260904`** — yesterday’s candidate `20260903` is **stale**.
5. **2026-08-07 proof:** first collision-free Commerce version is **`20260905`**.

## Allowed scope

- Local rename/update already applied this session:
  - `supabase/migrations/20260905_store_partial_refund_ledger_list_committing_v1.sql` (replaces deleted `20260901_…`)
  - `lib/store/partialRefundLedger/rpcContracts.ts` + related tests
  - `docs/store/implementation/PARTIAL_REFUND_IN_FLIGHT_COMMITTING_VISIBILITY_V1.md`
  - AI handoff docs
- On **GO commit**: stage only the renumber + contract/test/doc updates for this feature.
- On **GO apply**: controlled per-file `db query --linked -f` of **`20260905`** then register **`20260905` only** (orphan RPC rebound via `CREATE OR REPLACE`).

## Forbidden scope

- Register / repair `20260901`
- `db push` / `--include-all` / blind repair of remote-only Learning versions
- Touch Learning/Translation migrations
- Commit / push / remote apply without explicit GO
- Money / provider / recovery / payout / `commerce_confirm` expansion

## Next GO options

1. **Commit GO** — corrective renumber commit on this branch.
2. **Apply GO** — controlled apply + history register **`20260905` only** (after or with commit).
3. Both in order: commit → apply/register.

## Success criteria

- No local `20260901_store_partial_refund_*` file
- Contracts/tests/docs point at **`20260905`**
- Remote: tip advances to **`20260905`** only after successful controlled apply+register
- Never a history row for Commerce under `20260901`
