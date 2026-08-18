# Technical integration overview (internal)

This is a later-integration sketch. It is not a production onboarding runbook and not a request to apply SQL remotely.

## Store

1. Register a provider (mode + ownership + max stale window).
2. Record rights. Unknown defaults DENY.
3. Store credentials as vault_ref + presence/rotation/revocation only.
4. Fetch catalog → validate → normalize SKU/variants/price/inventory → stamp provenance.
5. Map provider categories to UMTUBA slugs. Do not overfit one vendor’s tree.
6. Recheck rights before QA catalog, image publish, production publish, and checkout.
7. MOCK_DATA and current REAL_PARTNER_DATA cannot publish into the production-purchasable catalog.

Code: `lib/store/providers/*`, `lib/store/categories/*`, `lib/store/demo/*`.

## Learning

1. Register a provider type (UMTUBA_ORIGINAL / PARTNER / EXTERNAL).
2. Import course metadata, instructors (must be honestly labeled), language, category, enrollment URL.
3. Recheck hosting, enrollment route, AI ingest, and certificate ownership.
4. Takedown unbinds hosted/bound rows and keeps import audit.

Code: `lib/learning/providers/*`, `lib/learning/originals/*`.

## Shared admin

Lifecycle: DRAFT → LEGAL_REVIEW → APPROVED → INTEGRATION → QA → ACTIVE → SUSPENDED → TERMINATED.

ACTIVE requires granted rights, legal APPROVED, and contract SIGNED. REAL_PARTNER_DATA cannot be ACTIVE in this foundation.

Code: `lib/partners/*`.

## Schema

Local migration `supabase/migrations/20260929_store_learning_precompany_foundation_v2.sql` is **not applied remotely** in this wave. Content start work does not require it.

## Environments

No production deploy. Default no push. Mobile release train is out of scope.
