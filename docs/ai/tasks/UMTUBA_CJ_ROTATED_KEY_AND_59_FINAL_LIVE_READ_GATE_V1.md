# UMTUBA_CJ_ROTATED_KEY_AND_59_FINAL_LIVE_READ_GATE_V1

Live READ-ONLY gate after the owner pasted a new rotated CJ API key. No secrets printed. No orders. No deploy.

## Result

```text
NEW_CJ_AUTH = PASS
APPROVED_PRODUCTS = 59
PRODUCTS_HEALTHY = 51
PRODUCTS_PRICE_REVIEW = 0
PRODUCTS_OUT_OF_STOCK = 0
PRODUCTS_PROVIDER_UNAVAILABLE = 0
PRODUCTS_SYNC_ERROR = 8
HERO_PRODUCTS = 15
STANDARD_PRODUCTS = 44
AVG_CURRENT_LANDED_COST = 9.88
AVG_CURRENT_GROSS_MARGIN = 0.561
LIVE_AUDIT = PARTIAL
WRITE_CALLS = 0
```

SYNC_ERROR split: 3 live product query failed; 5 freight or supplier price missing. 56/59 rows live-verified. No substitutions.

Ireland TEST dest: IE / Dublin / D02. Fulfillment flag false. Candidate unpublished.

Preview: `http://localhost:3000/sandbox/store/cj-launch`

Candidate SQL (not applied): `supabase/candidates/20260909_store_cj_provider_identity_v1.sql`

## Next

Owner reviews the 8 SYNC_ERROR rows, then explicit production deployment GO only. Do not publish until those are resolved or accepted.
