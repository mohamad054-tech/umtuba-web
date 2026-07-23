# Current Task

## Task title

UMTUBA Ads Platform — Placement Compatibility Database Authority Fix

## Goal

Close the final database-authority gap in
`20260842_ads_deliverable_binding_database_authority_v1.sql` by enforcing
placement and creative-format compatibility inside `bind_ad_deliverable`
(PostgreSQL), aligned with the application fail-closed matrix — without
enabling delivery/billing or applying the migration remotely.

## Allowed scope

- `lib/ads/deliverableBindings.ts`
- `lib/ads/deliverableBindings.test.ts`
- `supabase/migrations/20260842_ads_deliverable_binding_database_authority_v1.sql`
  (local update only; do not apply remotely)
- `docs/ads/ADS_DELIVERABLE_BINDING_INVENTORY_BRIDGE_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Games / Learning / Store / World product surfaces
- Merging into `alpha-0.2`
- Pushing directly to `alpha-0.2`
- Applying Supabase migrations to remote
- Enabling live delivery or live billing
- Event ingestion / UEOS charging
- Second authoritative decision pipeline
- Commit / push unless explicitly requested

## Branch

`office/ads-canonical-authority-hardening-v1`

## Status

`implemented — verified (745/745 lib/ads, tsc, build, git diff --check);
not committed; migration NOT APPLIED remotely.`
