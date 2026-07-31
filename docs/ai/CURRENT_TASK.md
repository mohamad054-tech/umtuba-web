# Current Task

## Task title

UMTUBA Commerce — Commission Policy Activation V1

## Status

`pass` — implementation complete locally — **uncommitted / unpushed** (awaiting human GO)

## Capability (APPROVED)

`commerce.revenue.commission_policy_activation_v1`

## Branch

`office/commerce-commission-policy-activation-v1`

## Base / HEAD

- Base: `origin/office/commerce-marketplace-supplier-listing-create-hardening-v1` @ `d47f825`
- HEAD: local uncommitted tip on feature branch

## Worktree

`C:\Users\Admin\Desktop\umtuba\umtuba-web-commerce-commission-policy-activation-v1`
(Note: host user is `Admin`; requested `C:\Users\1\...` path was not present on this machine.)

## Coordination

- Commerce only — no Dashboard / Admin UI / AI / Stripe / payout rails / wallet mutations

## Delivered

- Migration `20260887` — idempotent active launch seed for UEOS fiat currencies
- Conflict trigger (one active policy_code family per currency)
- TS SSOT `lib/store/commissionPolicyActivation.ts` + tests
- Docs: `COMMISSION_POLICY_ACTIVATION_V1.md`

## Next

Human GO to commit / push. Apply `20260887` locally/remotely only when Product asks.
