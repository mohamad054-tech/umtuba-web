# First Product Runbook

Operational only. No feature development.  
Companion: `COMMERCE_PRODUCTION_ROLLOUT.md` · `FIRST_SUPPLIER_RUNBOOK.md`

**Goal:** Publish the first real **digital** product (and optional marketplace listing) with purchases gated OFF.

---

## Preconditions

- [ ] `FIRST_SUPPLIER_RUNBOOK.md` exit criteria met
- [ ] Wave A migrations applied, especially:
  - `20260885` categories
  - `20260878`+`20260879` digital assets/upload
  - For listing: `20260869`+`20260870`+`20260875`+`20260886`
- [ ] App tip includes inventory availability + publish readiness + listing harden
- [ ] `commerce_confirm_enabled = 0`
- [ ] Actor for listing create is **owner or manager** (not catalog_editor)

---

## FIRST REAL PRODUCT CHECKLIST

```
□ seller approved
□ category selected
□ digital asset uploaded
□ publish readiness passed
□ inventory valid
□ listing valid (preconditions)
□ review approved
□ marketplace listing created (if in scope)
□ buyer can discover product
```

---

## Steps

### 1. Create digital product

1. Seller: New product → type **digital**.
2. Title, slug, description, primary **active** category (seeded taxonomy).
3. Variant + **trusted** active price (canonical currency).
4. Cover media optional but recommended (private bucket signed URLs).

**Validate:** Product row draft; `primary_category_id` set; price row active.

### 2. Digital deliverable

1. Use Digital deliverable panel → prepare → upload → finalize.
2. Path must be `stores/{storeId}/products/{productId}/digital/{uuid}.{ext}`.

**Validate:** `store_digital_product_assets` active for product; publish readiness UI = ready / ready for review.

### 3. Inventory model

- Digital: unlimited availability (finite warehouse math skipped) — OK even without sellable qty.
- Do not invent client stock fields.

**Validate:** No inconsistent finite inventory if any row exists.

### 4. Submit for review

1. Seller submits for review (`submitProductForReview`).
2. Must pass category + digital readiness gates.

**Validate:** Status in review / pending moderation queue.

### 5. Admin approve product

1. `/admin/store/products` → approve (`admin_approve_store_product`).

**Validate:** `status=active`, `moderation_status=approved`.  
Public visibility requires active store + active product + approved.

### 6. Marketplace eligibility (if listing)

1. Ensure product `marketplace_eligible` where process requires.
2. Supplier store verified + (if cross-store supply) `marketplace_supplier_enabled`.

### 7. Create marketplace listing (optional for owned-only pilot)

1. As **owner/manager** of seller store: Add to my store / listing create.
2. Server calls `add_store_seller_listing` — no client `listing_id`, supplier id, or stock.

**Validate:**
- One active listing for `(seller_store_id, source_product_id)`
- Duplicate active attempt rejected
- Discovery / seller storefront shows product
- PDP keeps listing provenance when applicable

### 8. Discovery smoke (buyer)

1. Signed-out or internal buyer opens storefront / marketplace discovery.
2. Product card → PDP loads.
3. Optional: add to cart + **quote only** (confirm must fail while gate OFF).

---

## Internal purchase note

Default: **stop at quote**.  
If Product authorizes confirm probe:
```sql
select public.admin_set_commerce_confirm_enabled(true);
-- run single internal confirm
select public.admin_set_commerce_confirm_enabled(false);
select commerce_confirm_enabled from store_commerce_config; -- must be 0
```
No `sk_live_`. Prefer deferred/test paths only.

---

## Rollback

| Problem | Action |
| --- | --- |
| Bad asset | Replace digital asset / return for revision |
| Bad listing | Hide or archive listing |
| Premature public | Admin reject / return-for-revision |
| Confirm left ON | `admin_set_commerce_confirm_enabled(false)` immediately |

---

## Exit criteria

- [ ] All FIRST REAL PRODUCT CHECKLIST boxes complete (listing optional if owned-only)
- [ ] Confirm gate still `0`
- [ ] No live payment / payout / commission activation
- [ ] Store UUID + product UUID + listing UUID documented in ops log
