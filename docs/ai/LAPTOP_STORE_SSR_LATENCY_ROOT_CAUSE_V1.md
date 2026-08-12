# LAPTOP_STORE_SSR_LATENCY_ROOT_CAUSE_V1

**TASK_ID:** `LAPTOP_STORE_SSR_LATENCY_ROOT_CAUSE_V1`  
**WAVE:** `LAPTOP_POST_RELEASE_PERFORMANCE_QA_V4` / A2  
**Date:** 2026-08-13  
**Locks:** no payment changes; no Commerce production data mutation; no deploy.

## Evidence anchors

- `app/store/page.tsx` — `createClient()` then `Promise.all([listActiveCategories, listPublicCatalog(limit:48)])`
- `lib/store/catalogQueries.ts` — `listPublicCatalog` + **`enrichPublicCatalogRow` N+1 loop**
- `lib/supabase/server.ts` — `cookies()` ⇒ dynamic rendering
- Live probe (A3): `/store` TTFB n=5 avg **~1.07s** (min 0.98 / max 1.14)

## STORE_SSR_ROOT_CAUSES

```
STORE_SSR_ROOT_CAUSES = [
  "Dynamic SSR via createClient()/cookies() on every /store request (no static HTML)",
  "listPublicCatalog performs sequential per-product enrichPublicCatalogRow await in a for-loop (N+1)",
  "Each enrichPublicCatalogRow issues multiple Supabase round-trips: product_media, product_variants, product_prices, product_inventory, plus signed cover URL",
  "Store page blocks first byte until categories+full enriched catalog (limit 48) complete — no Suspense split for hero vs rails",
  "HTML Cache-Control no-store (correct for cookie-dynamic) — edge cannot cache document"
]
```

Note: top-level `Promise.all` for categories vs catalog is already parallel; the bottleneck is **inside** catalog enrichment, not the categories pairing.

## SLOWEST_SERVER_OPERATIONS

```
SLOWEST_SERVER_OPERATIONS = [
  "listPublicCatalog → for (row of rows) await enrichPublicCatalogRow  [dominant]",
  "enrichPublicCatalogRow: media + variants + price + inventory + createAuthorizedProductMediaSignedUrl per product",
  "createClient + cookie/session establish",
  "listActiveCategories (minor vs enrichment; already parallelized)"
]
```

With few live E2E products, absolute query count is smaller than limit=48 worst case, but each product still pays the multi-query enrich tax — consistent with ~1s TTFB.

## SAFE_OPTIMIZATION_CANDIDATES

```
SAFE_OPTIMIZATION_CANDIDATES = [
  "Batch enrich: one media query, one variants/prices/inventory query for all product IDs (replace N+1 loop)",
  "Lower first-paint catalog limit (e.g. 12–16) and paginate rails client-side or via secondary fetch",
  "Suspense: stream StoreShell+hero skeleton; defer ProductRail enrichment",
  "Skip signed cover URL on list cards when cover missing (already null) — avoid work when Media coming soon",
  "Public catalog unstable_cache / revalidate for anonymous storefront HTML slice (cookie-free catalog client)",
  "Do not touch checkout/payments/reservations paths"
]
```

```
COMMERCE_MUTATION_REQUIRED = NO
```
