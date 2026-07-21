# UEOS Foundation V1

Status: implemented in `umtuba-web` (local migration; **not** applied remotely in this phase)

Migration: `supabase/migrations/20260822_ueos_foundation_v1.sql`

## Purpose

Additive shared financial core for UMTUBA (ledger-first). Products become **consumers** of UEOS; they must not own financial state tables.

## Single write gate

| RPC | Writes |
| --- | --- |
| `ueos_ensure_account` | `ueos_accounts` + zero `ueos_account_balances` |
| `ueos_post_journal` | journal + lines + balance updates |

EXECUTE revoked from `PUBLIC`, `anon`, and `authenticated` on all write-gate and helper functions. App/service code must call only these two RPCs for money movement.

## Authenticated visibility (V1)

| Table | `anon` | `authenticated` | `service_role` / owner |
| --- | --- | --- | --- |
| `ueos_products` | none | SELECT | full (bypass RLS) |
| `ueos_assets` | none | SELECT | full |
| `ueos_policies` | none | SELECT | full |
| `ueos_accounts` | none | SELECT **own user accounts only** (`owner_type=user` AND `owner_id=auth.uid()`) | full |
| `ueos_account_balances` | none | SELECT **own user balances only** | full |
| `ueos_journal_entries` | none | **none** (no SELECT grant; no policy) | full |
| `ueos_ledger_lines` | none | **none** | full |

Platform/system/clearing/revenue/liability accounts and their balances are **not** visible to authenticated users. Journals/lines are not exposed until a safe statement projection exists.

## Semantic idempotency

`ueos_post_journal` stores `request_fingerprint` (MD5 of canonical JSON: event_type, product_code, policy_id, reference_type/id, metadata, normalized lines in submission order).

| Case | Behavior |
| --- | --- |
| Same key + same fingerprint | Return existing journal (`replayed: true`); **no** balance change |
| Same key + different fingerprint | Fail closed: `idempotency conflict` |
| Concurrent same key | Transaction advisory lock + unique `idempotency_key`; loser replays or conflicts |

## Concurrency

1. `pg_advisory_xact_lock` on hash of idempotency key  
2. Re-read existing journal under lock  
3. Lock involved accounts in UUID order  
4. Insert journal/lines; update balances once  
5. Unique-violation race still compares fingerprint and replays or conflicts  

## Policy rule (V1)

- `policy_id` **required** for product codes other than `ueos` / `system`
- Nullable policy only for explicit UEOS/system bootstrap posts
- Policy must be `active` and within `[effective_from, effective_to)`

## Asset lifecycle

Only `lifecycle_status=active` may create accounts or post. `UMT` is `future_reserved` — no accounts, no posts. Presence ≠ token exists.

## Out of scope

Live PSPs, settlement, payouts, commissions, FX, blockchain, token issuance, Store wiring, UM Points migration.

## Remaining risks

- Table owner / superuser can still INSERT into ledger tables directly (bypassing write-gate grants). Operational discipline + future optional session GUCs if needed.
- Immutability triggers block UPDATE/DELETE for everyone including owner; INSERT remains possible for owner.
- No authenticated statement API yet.
