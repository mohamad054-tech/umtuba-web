# UMTUBA_CJ_8_SYNC_ERROR_RESOLUTION_V1

Bounded official CJ read-only retries for the 8 SYNC_ERROR products from the rotated-key live gate. No substitutions. No orders. No deploy.

## Input classification

| Input kind | Count | Outcome |
|---|---|---|
| product query failure | 3 | All recovered via pid/SKU retry |
| freight/price missing | 5 | All recovered via variant/SKU + Ireland freight |

No permanent invalid SKUs. Replacement search was not required.

## Result

```text
RESOLVED = 8
UNRESOLVED = 0
HEALTHY_TOTAL = 59
REPLACEMENT_CANDIDATES = 0
AVG_LANDED_COST_HEALTHY = 10.85
AVG_GROSS_MARGIN_HEALTHY = 0.55
LIVE_AUDIT = LIVE_VERIFIED
```

Approved-59 identities preserved. Report: `data/cj-8-sync-error-resolution-v1.json`. Candidate: `data/cj-store-launch-candidate-v1.json`.

Preview: `http://localhost:3000/sandbox/store/cj-launch` — healthy items launch-ready. Held/unavailable stay hidden from the customer grid.
