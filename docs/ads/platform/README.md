# UMTUBA Ads Platform — Target Architecture (Architecture & Design)

Status: **Architecture & design only (Revision V1.1).** This package contains no
application code, migrations, database objects, APIs, or billing logic. It
defines the **target architecture** for an independent, ecosystem-wide UMTUBA Ads
Platform and the boundaries between that platform, UEOS, and every consuming
product.

Naming note: this *target architecture package* is distinct from the shipped
`docs/ads/ADS_PLATFORM_FOUNDATION_V1.md`, which documents the current Layer 0
code foundation. Where the two differ, the shipped code/doc is the source of
truth and this package is the forward-looking target.

## What this package is

A world-class advertising **platform** blueprint — not an advertising feature.
The Ads Platform is designed as an independent internal platform that will
eventually power advertising across the entire UMTUBA ecosystem (Watch,
Discover, World, Live, Store, Search, Messages, Games, UM Learning, Creator
Economy, and future products), while delegating all money movement to UEOS.

## Relationship to the already-shipped foundation

A first, narrow Ads foundation already exists in the repository:

- Migration `supabase/migrations/20260807_ads_platform_foundation_v1.sql`
- Admin review migration `supabase/migrations/20260806_ads_admin_review_foundation_v1.sql`
- Domain code under `lib/ads/**`, advertiser UI under `app/advertise/**`, and
  operator UI under `app/admin/ads/**`
- Implementation notes in `docs/ads/ADS_PLATFORM_FOUNDATION_V1.md` and
  `docs/ads/ADS_ADMIN_REVIEW_FOUNDATION_V1.md`

That shipped foundation delivers advertiser accounts, campaigns, ad sets,
creatives, review workflow, private creative storage, and metrics scaffolding —
with **delivery disabled**, no payments, and no auctions.

This package **does not modify** that foundation. It reframes it as **Layer 0**
of the larger platform and describes the architecture required to grow it into
a full ecosystem advertising platform. Where this blueprint and the shipped code
differ, the shipped code is the current source of truth and this package is the
forward-looking target.

## Documents in this package

| # | Document | Covers (mission sections) |
| --- | --- | --- |
| 01 | [`01_VISION_AND_SCOPE.md`](01_VISION_AND_SCOPE.md) | Vision, Goals, Product scope, Design principles, Platform boundaries |
| 02 | [`02_ARCHITECTURE_OVERVIEW.md`](02_ARCHITECTURE_OVERVIEW.md) | Architecture overview, Core services, Delivery model, Database authority, Feature flags |
| 03 | [`03_CAMPAIGN_MODEL.md`](03_CAMPAIGN_MODEL.md) | Campaign lifecycle, Campaign entities, Creative management, Placements, Ad types |
| 04 | [`04_TARGETING_MODEL.md`](04_TARGETING_MODEL.md) | Targeting model, Privacy-first targeting |
| 05 | [`05_MEASUREMENT_AND_REPORTING.md`](05_MEASUREMENT_AND_REPORTING.md) | Delivery measurement, Measurement, Reporting |
| 06 | [`06_MODERATION_AND_FRAUD.md`](06_MODERATION_AND_FRAUD.md) | Moderation, Privacy, Fraud prevention readiness |
| 07 | [`07_UEOS_BILLING_AUCTION.md`](07_UEOS_BILLING_AUCTION.md) | UEOS integration, Future billing, Future auction, Future AI optimization |
| 08 | [`08_ROADMAP.md`](08_ROADMAP.md) | Production roadmap, Future implementation phases |
| 09 | [`09_PLATFORM_READINESS.md`](09_PLATFORM_READINESS.md) | Orgs/agency, sandbox, experiments, flag rollout, observability, data lifecycle/DSAR, schema evolution, DR |

## Hard non-goals for this phase

- No application code, no migrations, no database objects.
- No API implementation, no billing implementation, no payment providers.
- No auction engine, no bidding engine, no fraud engine.
- No AI optimization implementation.
- No changes to existing routes or source files.
- No commit, no push, no Supabase apply.

This is a design deliverable to be reviewed before any implementation phase is
authorized.
