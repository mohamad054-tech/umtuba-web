# Current Task

## Task title

UMTUBA Web Performance & Core Web Vitals V1 — Phase A: Store Query Optimization V1

## Status

`implementation-in-progress`

## Branch

`office/perf-store-query-optimization-v1`

## Base

`office/commerce-digital-product-versioning-update-delivery-v1` @ `d01e1cd756055d39f38323dce46fd9119b081f8e`

## Milestone

`web.performance.store_query_optimization_v1`

## Allowed scope

- `lib/store/catalogQueries.ts`
- `lib/store/catalogQueries.perf.test.ts` (new)
- `docs/ai/CURRENT_TASK.md`, `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Learning / Home / Discover / Profile
- next/image / next.config / new packages
- UI changes / API contract changes
- Migrations / schema
- Commit / push / merge without GO
- Phase B+

## Goal

Eliminate N+1 catalog enrichment round-trips for `/store`, storefront, and PDP query paths without changing buyer-visible results.
