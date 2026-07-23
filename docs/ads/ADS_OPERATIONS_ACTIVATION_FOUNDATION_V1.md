# Ads Operations & Activation Foundation V1

## Purpose

Centralized operational foundation for the Ads Platform:

- platform operational state
- feature flags
- emergency kill switches
- readiness evaluation
- read-only health reporting
- immutable ops audit records
- internal admin operations contracts

This is **not** production activation.

## Hard authority

| Flag | Value |
| --- | --- |
| `productionEnabled` | `false` |
| `productionAccepted` | `false` |
| `authoritativeProductionServing` | `false` |
| `billingEnabled` | `false` |
| `deliveryEnabled` | `false` |
| `productionEligible` | `false` |

## Modules

| Module | Role |
| --- | --- |
| `operationsState.ts` | Frozen active state (`development`); production transitions fail closed |
| `featureFlags.ts` | Central flags; delivery/billing hard-closed |
| `killSwitches.ts` | Permanent engage on serving/billing/measurement ingestion |
| `readiness.ts` | Enabled/disabled foundations + blocking conditions |
| `health.ts` | Read-only foundation health |
| `audit.ts` | Immutable in-process audit records (`applied: false`) |
| `adminContracts.ts` | Internal propose/inspect contracts (no UI/endpoints) |

## Feature flags

Centralized keys only:

- `delivery` → false
- `billing` → false
- `diagnostics` → true
- `reporting` → true
- `campaignManagement` → true
- `adminOperations` → true

## Kill switches

`engaged: true` means the path is halted.

Permanently engaged in V1:

- `globalServing`
- `billing`
- `measurementIngestion`

Foundation-available (not engaged):

- `campaignCreation`
- `adminActions`

## Explicit non-goals

- No production serving
- No production billing
- No payment providers
- No real campaign delivery
- No production HTTP endpoints / UI
- No migrations that activate production
- No bypass of `runAdsCanonicalStackV1`
