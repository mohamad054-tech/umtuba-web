# Commission Policy Activation V1

Capability: `commerce.revenue.commission_policy_activation_v1`  
Status: implemented locally (migration **not** applied remotely in this phase)

Migration: `supabase/migrations/20260887_store_commission_policy_activation_v1.sql`

Depends on:

- `commerce.revenue.commission_policy_foundation_v1` (`20260884`)
- UEOS asset registry (`20260822`) — fiat_minor + active only

## Purpose

Close the **no active commission seed** gap: foundation fails closed without an active policy. Activation adds the **smallest idempotent** launch seed for ledger-supported fiat currencies.

## Supported currencies (not invented)

From UEOS `ueos_assets` where `kind = fiat_minor` and `lifecycle_status = active`:

`USD` · `EUR` · `ILS` · `JOD` · `SAR` · `AED` · `EGP`

Unlisted currencies (e.g. `ZAR`, points, tokens) remain **fail-closed** (`missing_policy`).

## Launch split (safe default)

| Party | bps | Share |
| --- | --- | --- |
| platform | 1000 | 10% |
| seller | 8500 | 85% |
| supplier | 500 | 5% |
| affiliate | 0 | 0% |
| partner | 0 | 0% |

Basis: `merchandise_net`. Policy code: `store.launch.commission.v1` v1.  
Settlement capture amounts are **unchanged** (parallel decomposition only).

## Idempotency / safety

- `store_commission_activate_launch_policy_v1(currency)` inserts **only** when no `status=active` row exists for that currency
- Never updates/overwrites an existing active policy
- Trigger rejects a **second distinct** `policy_code` active for the same currency
- Re-running the migration is safe

## TS SSOT

`lib/store/commissionPolicyActivation.ts`

**Next:** Trusted decomposition is applied into the Revenue Bridge by `commerce.revenue.commission_decomposition_bridge_apply_v1` (`COMMISSION_DECOMPOSITION_BRIDGE_APPLY_V1.md`).
