# Commission Decomposition Bridge Apply V1

Capability: `commerce.revenue.commission_decomposition_bridge_apply_v1`  
Status: **APPROVED** + implemented locally  
Migration: **none** (reuses Activation `20260887` + Foundation `20260884`)

Depends on:

- `commerce.revenue.commission_policy_foundation_v1`
- `commerce.revenue.commission_policy_activation_v1`
- Commerce Revenue Ledger Bridge Foundation V1

## Purpose

Connect **active Commission Policy Activation** into the **Revenue Bridge** so trusted commission decomposition is available on Commerce financial events — without mutating settlement, payout, or wallet behavior.

## Behavior

1. Read activation launch policy set (pure TS mirror of Activation seed).
2. Resolve policy by **currency** + **effective date** (+ highest **version**).
3. Calculate decomposition via Foundation (`calculateCommissionSplit`) — no duplicate engine, no client %.
4. Attach shares to the Revenue Bridge financial event only.

### Trusted decomposition (when applied)

| Field | Source |
| --- | --- |
| platform share | `platformCommissionMinor` |
| seller share | `merchantAmountMinor` |
| supplier share | `supplierAmountMinor` |
| affiliate share | `affiliateAmountMinor` (0 when policy line is 0 / absent) |
| partner share | `partnerAmountMinor` (0 when policy line is 0 / absent) |

Parts **must** sum to trusted basis (`merchandise_net` for launch policies). Missing / unsupported currency → **fail closed** (`policyStatus: not_configured`).

## Financial guarantees

- No settlement amount mutation (capture Sync still uses trusted grand total)
- No payout mutation
- No wallet mutation
- Immutable money path preserved
- Fail closed when no active policy matches

## TS SSOT

- `lib/store/commissionDecompositionBridgeApply.ts` — apply API + conservation assert
- `lib/store/commerceRevenueBridge.ts` — default policies when `commissionPolicies` omitted; explicit `[]` / `null` opt out

## Out of scope

Dashboard, Admin UI, AI, Stripe, payout rails, remote migration apply, inventing currencies, changing settlement posting amounts.
