# Current Task

## Task title

UMTUBA Web Performance & Core Web Vitals V1 — Phase B: Learning Catalog Optimization V1

## Status

`implementation-in-progress`

## Branch

`office/perf-learning-catalog-optimization-v1`

## Base

`office/perf-store-query-optimization-v1` @ `bdfe36a367ebb65ed3e518686d94920af9bb2b85`

## Milestone

`web.performance.learning_catalog_optimization_v1`

## Allowed scope

- `lib/learning/publicCatalog.ts`
- `lib/learning/publicCatalog.list.test.ts` (new)
- `app/learning/catalog/page.tsx`
- `app/learning/page.tsx` (parallel hub/instructor fetch only)
- `docs/ai/CURRENT_TASK.md`, `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Store / Home / Discover / Profile
- next/image / next.config / new packages
- Migrations / schema
- Commit / push / merge without GO
- Phase C

## Goal

Bound public catalog list queries; count-only module/lesson stats; keep curriculum on course landing; `/learning/catalog` production TTFB ≤ 700ms avg.
