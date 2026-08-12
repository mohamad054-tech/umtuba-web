# LAPTOP_PRODUCTION_PERFORMANCE_INDEPENDENT_MONITOR_V1

**TASK_ID:** `LAPTOP_PRODUCTION_PERFORMANCE_INDEPENDENT_MONITOR_V1`  
**WAVE:** `LAPTOP_POST_RELEASE_PERFORMANCE_QA_V4` / A3  
**Date:** 2026-08-13  
**Target:** `https://umtuba.com`  
**Note:** Prefetch patch handed to Central — not modified here. No deploy from Laptop.

## BEFORE_METRICS (prior investigation baseline)

From `LAPTOP_PRODUCTION_PERFORMANCE_INVESTIGATION_AND_SAFE_OPTIMIZATION_V1`:

```
BEFORE_METRICS = [
  "HOME_TTFB_BROWSER ~0.97–1.38s",
  "HOME_LOAD ~2.0–3.0s",
  "HOME_RSC_FETCHES ~36",
  "STORE_TTFB_CURL_AVG ~1.27s",
  "STORE_TTFB_BROWSER ~1.38s"
]
```

## CURRENT MONITOR SAMPLE (this wave)

### curl gzip TTFB (n=5, connect-timeout 10s)

| Route | min | avg | max |
|-------|-----|-----|-----|
| `/` | 0.458s | **0.602s** | 0.987s |
| `/store` | 0.979s | **1.067s** | 1.144s |

Gzip body sizes (spot): `/` ~11947 B; `/store` ~30878 B.

### Browser home (CDP, desktop)

```
ttfb=648ms
load=1285ms
resourceCount=61
fetchCount=36
rscCount=35
docTransfer~12250
totalTransfer~38120
```

Still seeing RSC prefetches to `/login?…`, `/store`, `/learning`, `/games`, section links, etc.

```
DEPLOYMENT_CHANGE_OBSERVED = NO
AFTER_METRICS = [
  "HOME_TTFB_CURL_AVG ~0.60s (n=5)",
  "HOME_TTFB_BROWSER ~0.65s",
  "HOME_LOAD_BROWSER ~1.29s",
  "HOME_RSC_COUNT = 35 (fetchCount=36) — prefetch storm still live",
  "STORE_TTFB_CURL_AVG ~1.07s (n=5)"
]
MEASURED_IMPROVEMENT = NO
```

Interpretation: document TTFB for `/` is somewhat lower than the earlier cold browser band in this sample window, but **RSC prefetch count unchanged (~36)** ⇒ Central prefetch deploy **not observable**. Store remains ~1s+. No legitimate prefetch BEFORE→AFTER claim.

```
REMAINING_PERFORMANCE_ROOT = [
  "HOME_LINK_PREFETCH_STORM still live on production (~35 RSC)",
  "HOME SSR enrichment waterfall (see LAPTOP_HOME_SSR_LATENCY_ROOT_CAUSE_V1)",
  "STORE listPublicCatalog N+1 enrich (see LAPTOP_STORE_SSR_LATENCY_ROOT_CAUSE_V1)"
]
```

## Auto-remeasure rule

When Central deploy becomes observable (`rscCount` materially below ~20 on cold home, or HTML/nav source shows prefetch=false behavior), repeat the same curl n=5 + browser CDP protocol **without new GO** and update this file’s AFTER block.
