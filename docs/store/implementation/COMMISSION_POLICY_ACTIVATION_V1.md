# Commerce Commission Policy Activation V1

Capability: `commerce.revenue.commission_policy_activation_v1`  
Branch: `office/commerce-commission-policy-activation-v1`  
Migration: `20260891_store_commission_policy_activation_v1.sql` (in repository; **not** remote-applied until separate GO)
Apply readiness: `COMMERCE_CHAIN_MIGRATION_APPLY_READINESS_V1.md` (order `20260889 → 20260890 → 20260891`)

Depends on:

- Commission Policy Foundation V1 (`store_commission_policies`, resolve/split)
- Commission Decomposition Bridge Apply V1 (persists `policy_code` / `policy_version` at capture)

## Purpose

Provide a safe, idempotent activate/deactivate lifecycle so exactly one authoritative **active** commission policy exists per currency scope, while preserving historical versions for capture-time resolve and applied decomposition.

## Scope

Currency-scoped, marketplace-global. **No store-specific policies** in V1.

## Lifecycle

| Action | Transition | Behavior |
| --- | --- | --- |
| Activate | `draft → active` | Supersedes any prior `active` for the same currency (`active → superseded`, close `effective_to`) |
| Activate replay | already `active` / same `event_key` | Idempotent success |
| Deactivate | `active → disabled` | Closes `effective_to`; does **not** auto-activate another policy |
| Invalid | `superseded`/`disabled` activate, `draft` deactivate, missing version | Fail closed |

## Resolve behavior

`resolve_store_commission_policy(currency, at)` / TS `selectCommissionPolicy`:

- At most one `status=active` per currency (unique index + fail-closed check)
- Window match may use `active` **or** historically `superseded` rows
- Ambiguous windows fail closed (no silent fallback)
- Capture continues to resolve at capture timestamp; decomposition stores the chosen `policy_code`/`policy_version`

## Guarantees

- Exactly one active policy per currency
- Historical versions preserved (never deleted)
- Activation/deactivation audited in `store_commission_policy_activation_events`
- Idempotent via `event_key`
- Capture uses policy resolved at transaction time
- Applied decomposition permanently records policy version
- Refund/payout reference historical applied decomposition (not today's active policy)
- Service-role execute only

## Module

| Layer | Path |
| --- | --- |
| Activate RPC | `activate_store_commission_policy` |
| Deactivate RPC | `deactivate_store_commission_policy` |
| Audit | `store_commission_policy_activation_events` |
| TS | `lib/store/commissionPolicyActivation.ts` |

## Out of scope

Auto-seed commercial rates, store-scoped policies, Dashboard/Admin UI, payout-net redesign, partial refunds, inventing marketer/affiliate entity graphs, Learning/AI/Home/Creator/Navigation.
