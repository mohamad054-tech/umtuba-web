# Commerce Partial Refund Ledger RPC & Remote Apply Readiness V1

Capability: `commerce.payments.partial_refund_ledger_rpc_remote_apply_readiness_v1`
Module: `lib/store/partialRefundLedger/rpcContracts.ts`, `rpcValidate.ts`
SQL draft (local only): `supabase/migrations/20260900_store_partial_refund_ledger_rpc_v1.sql`

## Status

**FOUNDATION CLOSED** (`PARTIAL_REFUND_RPC_FOUNDATION_V1_CLOSED`).

`20260899` and `20260900` are **local only and not remotely applied**.
Apply order for a **separate explicit GO**: `20260899` → `20260900`.
Provider/Sync execution is a **later independent milestone**.
`complete` = durable reservation only. No refund occurred. No production money moved.
`commerce_confirm` / payout / Manual Ops untouched. Public RPC exposure prohibited.

## Required RPCs (service_role EXECUTE only)

| RPC | Role |
| --- | --- |
| `ensure_store_partial_refund_capture_accounting` | Upsert/lock capture accounting facts |
| `plan_store_partial_refund_ledger` | Insert planned + lines; idempotent |
| `begin_store_partial_refund_ledger_commit` | planned\|failed → committing |
| `complete_store_partial_refund_ledger_commit` | committing → committed (reservation) |
| `fail_store_partial_refund_ledger_commit` | committing → failed |
| `get_store_partial_refund_capture_accounting` | Read snapshot |
| `get_store_partial_refund_ledger_commit` | Read one commit |
| `list_store_partial_refund_ledger_committed` | List committed for capture |

Helper (also service_role only): `store_partial_refund_ledger_commit_json`

## Security model

- `SECURITY DEFINER` + `search_path = public`
- `revoke all ... from public, anon, authenticated`
- `grant execute ... to service_role` **only** (Postgres role name in SQL; not a credential)
- Tables remain RLS-enabled with client revoke (from `20260899`)
- **Not** exposed to authenticated/anon/public
- Amounts are trusted server plan inputs — client money keys rejected in TS validation
- Complete does **not** call payment providers/Sync; reservation only

## Transaction / concurrency model

- Single-transaction RPC bodies
- `FOR UPDATE` on capture accounting + commit row
- Optimistic `accounting_version` / `planned_accounting_version`
- Partial unique index: at most one `committing` per capture (`20260899`)
- Unique `(store_id, idempotency_key)` with fingerprint replay

## Remote apply readiness (future GO only)

1. Confirm tip still allows `20260899` then `20260900`
2. Apply `20260899` (schema)
3. Apply `20260900` (RPCs)
4. Smoke reservation path without provider refund
5. Keep money/provider/restock/entitlement/settlement/commission unsupported until separate GOs

## Ownership

| Flag | Value |
| --- | --- |
| RPC contracts / SQL draft | **true** |
| Remote migration apply | **false** |
| Money / provider / restock / entitlement / settlement / commission | **false** |
| Public RPC exposure | **false** |

## Related

- Schema: `docs/store/implementation/PARTIAL_REFUND_LEDGER_COMMIT_BOUNDARY_V1.md`
- Calculation: `docs/store/implementation/PARTIAL_REFUND_PATH_V1.md`
