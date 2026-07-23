# Ads Campaign Management Foundation V1

## Purpose

Internal foundation contracts for managing Ads campaigns without enabling
production serving, billing, payments, or real delivery.

## Authority

All of the following remain **false**:

- `productionEnabled`
- `productionAccepted`
- `authoritativeProductionServing`
- `billingEnabled`
- `deliveryEnabled`

Serving eligibility is permanently `false` in every lifecycle state.

## Modules

| Module | Role |
| --- | --- |
| `campaign.ts` | Canonical campaign domain contract |
| `adSet.ts` | Ad set: budget, schedule, placements, targeting, objective |
| `creative.ts` | Creative contracts (`image` / `video` / `carousel` / `interactive`) |
| `budget.ts` | Lifetime/daily/spend/pacing — no billing execution |
| `schedule.ts` | Start/end/timezone/recurrence placeholders — never activates serving |
| `targeting.ts` | Countries/cities/interests/language/age/custom audiences |
| `lifecycle.ts` | Approval state machine |
| `validation.ts` | Centralized fail-closed validation |
| `adminContracts.ts` | Internal inspect/propose contracts only |

## Lifecycle

```
draft → review → approved | rejected
approved → paused | archived
rejected → draft | review | archived
paused → approved | archived
archived → (terminal)
```

Approval never enables production.

## Explicit non-goals

- No production APIs / public endpoints / UI
- No payment providers
- No real campaign delivery
- No changes to Canonical Stack, Provenance, Billing, Measurement, or Kill switches
