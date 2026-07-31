# Commission Policy Foundation V1

Capability: `commerce.revenue.commission_policy_foundation_v1`
Status: implemented locally (migration not applied remotely in this phase)

Migration: `supabase/migrations/20260884_store_commission_policy_foundation_v1.sql`

Depends on:

- Commerce Revenue Ledger Bridge Foundation V1
- Settlement Foundation (unchanged posting amounts)
- Seller Payout Foundation (execution remains disabled)

## Purpose

Trusted **single source of truth** for commission policy contracts and decomposition calculations across Commerce. Versioned, currency-isolated, effective-dated. Server-side only. Fail closed when no active policy exists.

## What this is

| Piece | Role |
| --- | --- |
| TS SSOT | `lib/store/commissionPolicyFoundation.ts` — validate, select, calculate |
| SQL registry | `store_commission_policies` — durable contracts (no active seed) |
| Resolve RPC | `resolve_store_commission_policy(currency, at)` — service_role |
| Split helper | `compute_store_commission_split(...)` — service_role; mirrors TS |

## Party roles

`platform` · `seller` · `supplier` · `affiliate` · `partner`

- Platform + seller lines required
- Supplier / affiliate / partner optional (0 bps allowed)
- Line bps must sum to exactly **10000** (100%)
- Floor division; remainder assigned to **seller**

## Basis kinds

| Kind | Meaning |
| --- | --- |
| `merchandise_net` | `subtotal_minor - discount_total_minor` (floored at 0) |
| `grand_total` | Order grand total minor |

## Bridge integration

`buildCommerceFinancialEvent(snapshot, { commissionPolicies })`:

- No policies / no active match → `commission.policyStatus = not_configured` (legacy behavior)
- Active match → `policyStatus = applied` with trusted minors + fingerprint

**Settlement capture amounts are not changed.** Commission is a parallel decomposition.

## Security

- Never trusts client percentages / rates / bps
- Missing / invalid / currency-mismatched / out-of-window policies fail closed
- No authenticated policy shopping (service_role only for SQL resolve/compute)
- No active policy seed — operators must insert intentionally

## Out of scope

Payout execution, bank rails, Dashboard/Admin UI, AI, auto-activating commercial rates, changing settlement/payout booking amounts, seller UI surfacing of commission (still withheld on Balance Visibility).
