# Ads Deliverable Binding & Inventory Bridge V1

## Purpose

Connect approved persisted Ads domain objects to the canonical decision stack
for **fail-closed internal diagnostics only**.

This slice does **not** enable live delivery, live billing, product-surface
rendering, event ingestion, or UEOS charging.

## Authority

Sole authoritative public decision entrypoint:

`runAdsCanonicalStackV1`

The inventory bridge never returns:

- `authoritativeDecisionPath: true`
- `authoritativeProductionServing: true`
- `productionAccepted: true`
- `deliveryEnabled: true`
- `billingEnabled: true`

## Deliverable binding

Table: `public.ads`

Database authority migration (local only, not applied remotely in this slice):

`supabase/migrations/20260842_ads_deliverable_binding_database_authority_v1.sql`

Hardening:

- `UNIQUE (ad_set_id, creative_id)` constraint `ads_ad_set_id_creative_id_key`
  (safe dedupe of existing duplicates before constraint)
- SECURITY DEFINER RPC `bind_ad_deliverable(...)` with fixed `search_path = public`
- Ownership / moderation checks inside the RPC (final authority)
- Placement ↔ creative-format compatibility enforced inside PostgreSQL
  (`ads_deliverable_binding_*` helpers; values derived from `ad_sets.placements`
  and `ad_creatives.creative_type` only — never caller-provided placement metadata)
- Direct authenticated `INSERT`/`UPDATE`/`DELETE` on `public.ads` revoked;
  `"Managers write ads"` policy dropped
- Concurrent identical binds resolve idempotently via unique violation handling

Application path:

`lib/ads/deliverableBindings.ts` → `bindDeliverable` → RPC `bind_ad_deliverable`

App validation remains for helpful errors; the database is final authority.
SQL compatibility rejections map to deterministic user-facing messages via
`mapBindDeliverableCompatibilityError`.

Guarantees:

- advertiser ownership match
- campaign/ad set/creative ownership match
- approved creative only (rejected/suspended/archived/unapproved blocked)
- placement ↔ creative format compatibility (app matrix + SQL authority;
  image/video selection-eligible only; `search_results` / `store_catalog`
  reject video)
- idempotent on `(ad_set_id, creative_id)`

## Activation

RPC: hardened `activate_ad_campaign`

SQL enforces (cannot be bypassed by calling the RPC directly):

- approved advertiser
- approved/paused campaign
- at least one eligible ad set
- at least one approved creative
- at least one valid deliverable binding joining the same
  advertiser/campaign/ad set/creative
- valid schedule
- valid budget

Domain precheck (`evaluateCampaignActivationReadiness`) mirrors these rules
for helpful errors before the RPC call.

Action/UI: `activateCampaignAction` + campaign detail “Activate (diagnostics only)”

Activation flips campaign domain status only. `ADS_DELIVERY_ENABLED` stays false.

## Inventory bridge

`lib/ads/inventoryBridge.ts`

- Loads eligible persisted deliverables (read-only)
- Maps domain placements → platform placements (`watch_feed` → `WATCH_FEED`)
- Emits:
  - `candidateInventory` (metadata contracts)
  - `selectionInventory` (canonical-stack input)
- Excludes invalid/unapproved/exhausted/incompatible rows
- Callers feed `selectionInventory` into `runAdsCanonicalStackV1`

## Explicit non-goals

- No second decision pipeline
- No product feed rendering
- No measurement ingestion
- No UEOS / money movement
- No remote migration apply in this slice
