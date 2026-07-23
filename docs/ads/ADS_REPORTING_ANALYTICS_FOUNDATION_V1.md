# Ads Reporting & Analytics Foundation V1

## Purpose

Internal foundation contracts for Ads reporting and analytics without enabling
production serving, billing, real event ingestion, production dashboards, or
public APIs.

## Authority

All of the following remain **false**:

- `productionEnabled`
- `productionAccepted`
- `authoritativeProductionServing`
- `billingEnabled`
- `deliveryEnabled`
- `triggersMeasurementIngestion`
- `sourcesLiveDelivery`
- `mutatesDatabase`

Metrics are computed/placeholder only. Export never generates files in V1.

## Modules

| Module | Role |
| --- | --- |
| `domain.ts` | Report types: campaign / ad_set / creative / placement / advertiser / platform |
| `analytics.ts` | Canonical metrics (impressions, clicks, reach, frequency, spend*, conversions*, engagement, CTR, CPM, CPC) |
| `aggregation.ts` | hourly / daily / weekly / monthly / custom_range |
| `filters.ts` | Dimension filter validation |
| `export.ts` | CSV / JSON export contracts (`generatesFile: false`) |
| `validation.ts` | Centralized fail-closed reporting request validation |
| `adminContracts.ts` | Internal inspect / propose-export only |

\* `spend` and `conversions` are explicit placeholders.

## Explicit non-goals

- No production APIs / public endpoints / admin UI
- No live delivery event ingestion
- No production dashboards requiring live data
- No file generation / downloads
- No changes to Canonical Stack, Provenance, Operations, Campaign Management,
  Billing, or Measurement foundations
