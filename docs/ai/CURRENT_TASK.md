# Current Task

## Task title

LAPTOP_TOMORROW_FIRST_PERFORMANCE_RESUME_V1

## Status

`parked_until_tomorrow` — **FIRST thing on next Laptop resume**

## FIRST tomorrow (do this before anything else)

1. **Check if Central deployed prefetch** (`prefetch={false}` from `6b4e544` / `docs/ai/PREFETCH_FALSE_NAV_V1.patch`).
2. **Remeasure production** `https://umtuba.com` (same A3 protocol):
   - HOME TTFB, HOME load, HOME `rscCount` / fetchCount
   - `/store` TTFB
3. Set:
   - `DEPLOYMENT_CHANGE_OBSERVED = YES/NO`
   - `MEASURED_IMPROVEMENT = YES/NO`
4. If **not** deployed yet → ping Central with patch + commit `6b4e544` (do not recreate patch).
5. Only after that → next performance GO candidates:
   - Store catalog N+1 batch enrich
   - Home SSR auth dedupe / defer enrichment

## Parked context

- Branch: `office/um-core-platform-manifest-validation-p2`
- Local commits (may need push): `6b4e544`, `ddc7f16`
- Prefetch: HANDED_OFF_TO_CENTRAL · not verified live (last monitor: ~35 RSC)
- Learning / Collaboration / LB003 = CLOSED
- Evidence: `docs/ai/LAPTOP_POST_RELEASE_PERFORMANCE_QA_V4.md`

## Locks

No Learning/Collaboration reopen · No LB003 · No migrations · No deploy from Laptop unless Central GO
