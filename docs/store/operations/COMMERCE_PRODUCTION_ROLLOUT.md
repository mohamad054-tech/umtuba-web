# Commerce Production Rollout

Capability coordination: `commerce.ops.production_integration_preparation_v1`  
Source of truth: Production Readiness Package + this playbook  
Tip: `office/commerce-marketplace-supplier-listing-create-hardening-v1` @ `ca157d7`  
Remote baseline: Store migrations **20260809–20260821** applied; `commerce_confirm_enabled = 0`  
Status: operational playbook only — no feature code in this slice

---

## 1. Completed Commerce milestones (tip lineage)

| Area | Milestone / capability | Commit (tip ancestry) | Mig |
| --- | --- | --- | --- |
| Product Foundation | Store products / variants / prices / inventory / RLS | `ca8c915`+ | `20260728` (remote earlier) |
| Marketplace Foundation | Seller apps, verified store | `bd0a270` | `20260802` |
| Admin moderation | Approve seller / product | `dafcd0c`+ | `20260809` ✅ remote |
| Seller self-service | Setup wizard submit | `83229f6` | `20260810` ✅ remote |
| Cart / orders / checkout / payments | Buyer money path foundations | multiple | `20260811–15` ✅ remote |
| Hardening | Private media bucket + reject/return | hardening | `20260818` ✅ remote |
| Commerce safety | Reservations + confirm gate | `8665b72` | `20260819–21` ✅ remote |
| Marketplace supplier→seller | Listings table + RPC | `3b7e1ea` | `20260869` ⏳ |
| Listing checkout alignment | Quote/order listing stamp | (in tip) | `20260870` ⏳ |
| Listing provenance | Wishlist / id-PDP | `3a369b5` | `20260875` ⏳ |
| Digital access + upload | Assets + prepare/finalize | `1a2ede7` / `55fb87d` | `20260878–79` ⏳ |
| Publish readiness | Digital gate (TS) | `14bf224` | none |
| Category taxonomy seed | Launch categories | `16f5754` | `20260885` ⏳ |
| Inventory availability | Unlimited/finite/unavailable (TS) | `451cb7d` | none |
| Listing create hardening | Owner/manager + RPC-only | `ca157d7` | `20260886` ⏳ |
| Settlement / payout / commission / refund | Money path | `c55e8dd`…`584943f` | `20260823–24`, `81–84` ⏳ defer |

Legend: ✅ in remote E2E window · ⏳ waiting for Product GO remote apply

---

## 2. Dependency graph

```
Product Foundation (20260728)
        ↓
Category Taxonomy Seed (20260885)          ← required for review/listing
        ↓
Inventory Availability Foundation (TS)     ← finite/unlimited convention
        ↓
Digital Asset Upload (20260878→79)         ← digital publish path
        ↓
Publish Readiness (TS)                     ← gates submit + marketplace
        ↓
Admin Product Review (admin_approve_*)     ← public visibility
        ↓
Marketplace Supplier Foundation (20260869)
        ↓
Listing Checkout Alignment (20260870)
        ↓
Listing Provenance (20260875)
        ↓
Supplier Listing Create Hardening (20260886)
        ↓
─── money path (defer for first product load) ───
Settlement (20260822 UEOS → 20260823 Sync → 20260824)
        ↓
Payout (20260881+)
        ↓
Refund (TS + Sync/settlement RPCs)
```

**Operational note:** First real product stops after Marketplace Listing. Settlement/Payout/Refund stay offline until Product opens money.

---

## 3. Migrations waiting for remote apply

### Wave A — Product loading (required)

| # | File |
| --- | --- |
| 1 | `20260869_store_marketplace_supplier_seller_foundation_v1.sql` |
| 2 | `20260870_store_marketplace_listing_checkout_alignment_v1.sql` |
| 3 | `20260875_store_marketplace_listing_provenance_hardening_v1.sql` |
| 4 | `20260878_store_digital_access_delivery_v1.sql` |
| 5 | `20260879_store_seller_digital_product_asset_upload_v1.sql` |
| 6 | `20260885_store_catalog_category_taxonomy_seed_v1.sql` |
| 7 | `20260886_store_supplier_listing_create_hardening_v1.sql` |

### Wave B — Optional dry-run delivery

`20260877`, `20260880`, `20260876` (Stripe **test** keys only)

### Wave C — Money (defer)

`20260822` (if missing) → `20260823` (verify) → `20260824` → `20260881–84`

### Migration order verification

- `20260869` before `20260870` before `20260875` before `20260886` (RPC replace)
- `20260878` before `20260879` (assets table before upload)
- `20260885` before first submit/listing that requires categories (can apply before or after 69–79; **must** precede production product submit)
- Numbering gap `20260871–74` is intentional (no files)
- Do **not** apply Learning/World/Ads migrations in this Commerce rollout

### Hidden dependency gaps (checked)

| Gap | Status |
| --- | --- |
| Categories empty on remote | Closed by Wave A `20260885` |
| Digital assets table before upload | Closed by `20260878` → `20260879` |
| Listing INSERT bypass | Closed by `20260886` revoke INSERT |
| `UPDATE_STORE_SELLER_LISTING_RPC` | Declared in TS; merchandising uses direct UPDATE + RLS — **not a create blocker** |
| Product create / submit | Table + app gates (not dedicated submit RPC) — expected |
| Pricing | `product_prices` rows + eligibility checks — no create-price RPC — expected |
| Inventory availability | TS SSOT — must be on deploy binary |
| UEOS before settlement | Money-only; defer |
| Confirm gate | Must stay OFF for load phases |

---

## 4. RPC reachability matrix (repo)

| Concern | Primary entry | Reachable via | Remote after |
| --- | --- | --- | --- |
| Product creation | RLS insert `store_products` + helpers `is_store_member*` / `can_manage_store_catalog` | Seller catalog actions | Foundation (remote) |
| Review submit | App `submitProductForReview` (status→in_review) | `/seller` catalog | Binary + categories |
| Review approve | `admin_approve_store_product` | Admin Store UI | `20260809`/`18` ✅ |
| Listing create | `add_store_seller_listing` | `addToMyStoreAction` | Wave A `69`+`86` |
| Listing sale gate | `store_listing_allows_seller_sale` | Checkout / cart | Wave A |
| Inventory holds | `create_active_inventory_reservation`, `transition_inventory_reservation`, … | Confirm path | `20260819` ✅ |
| Pricing (read) | `product_prices` + eligibility | Catalog / cart / listing | Foundation |
| Checkout quote | `create_store_checkout_quote` | Checkout | Remote; listing-aware after `70` |
| Confirm | `confirm_store_checkout_quote` + `assert_store_commerce_confirm_allowed` | Checkout | Gate OFF blocks |
| Settlement | `apply_store_settlement_event` (**service_role**) | Server allocate/release | Wave C |
| Payout | `apply_store_payout_event` (**service_role**) | Ops helpers | Wave C |
| Payout reads | `get_my_seller_payout_*` | Seller surfaces | Wave C |
| Refund path | `apply_store_payment_outcome` + settlement reverse (service_role) | `applyFullOrderRefund` | Wave C |
| Seller onboard | `submit_my_seller_application`, `admin_approve_seller_application` | Setup + Admin | ✅ remote |
| Commerce gate | `admin_set_commerce_confirm_enabled`, `store_commerce_confirm_enabled` | Admin reservations | ✅ remote |

---

## Phase A — Merge

**Preconditions:** Tip `ca157d7` pushed; Product names deploy branch; no AI/Dashboard conflicts.  
**Commands:**
```bash
git fetch origin
git checkout <deploy-branch>
git merge --no-ff origin/office/commerce-marketplace-supplier-listing-create-hardening-v1
# or fast-forward if policy allows
git log -1 --oneline
git merge-base --is-ancestor ca157d7 HEAD
```
**Validation:** Deploy build green; ancestor check passes; smoke `/seller` loads.  
**Rollback:** Revert merge commit / redeploy previous release artifact.  
**Risks:** Parallel Desktop merges; deploying without Wave A SQL.

---

## Phase B — Migration apply

**Preconditions:** Phase A binary ready or coordinated; Product GO; confirm gate = 0; ops has linked project access.  
**Commands (conceptual — ops-owned; prefer additive linked apply, not blind full push):**
```text
Apply in order:
20260869 → 20260870 → 20260875 → 20260878 → 20260879 → 20260885 → 20260886
Record each file in schema_migrations / ops log.
```
**Validation:**
```sql
select commerce_confirm_enabled from store_commerce_config; -- expect 0
select count(*) from product_categories where status = 'active'; -- expect >= 12
select to_regclass('public.store_seller_listings');
select to_regclass('public.store_digital_product_assets');
select proname from pg_proc where proname in (
  'add_store_seller_listing',
  'store_listing_allows_seller_sale',
  'store_catalog_seed_category_v1'
);
```
**Rollback:** Stop applying further files; do not invent DOWN scripts; restore from backup only under ops plan.  
**Risks:** Wrong order; applying money Wave C early; Learning/World files.

---

## Phase C — Storage

**Preconditions:** `20260818` present (remote window).  
**Commands / checks:** Confirm bucket `store-product-media` exists, `public = false`, size/MIME limits; path policies for catalog + digital.  
**Validation:** Editor can upload catalog image; digital prepare path under `stores/{storeId}/products/{productId}/digital/`; public list denied; signed URLs only.  
**Rollback:** Pause seller uploads; fix bucket; no public=true.  
**Risks:** Public bucket; missing service role for finalize.

---

## Phase D — Seller onboarding

**Preconditions:** Phases A–C.  
**Commands / flow:** Seller `/seller/setup` → `submit_my_seller_application` → Admin approve → verified active store. Optionally set `marketplace_supplier_enabled` for suppliers.  
**Validation:** `stores.status=active`, `verification_status=verified`; membership owner/manager.  
**Rollback:** `admin_reject_seller_application` / suspend.  
**Risks:** Approving incomplete apps; enabling supplier flag globally.

See `FIRST_SUPPLIER_RUNBOOK.md`.

---

## Phase E — First digital product

**Preconditions:** Seller verified; categories seeded; digital upload live.  
**Flow:** Create digital product + variant + price + category + digital asset → publish readiness ready → submit for review → admin approve.  
**Validation:** Active+approved; asset owned path; category active; price trusted.  
**Rollback:** Reject / return-for-revision; keep draft.  
**Risks:** Physical SKU; missing asset; confirm gate confusion.

See `FIRST_PRODUCT_RUNBOOK.md`.

---

## Phase F — Marketplace listing

**Preconditions:** Product approved + marketplace eligible; actor owner/manager.  
**Flow:** Add to store via hardened `add_store_seller_listing` (no client listing/supplier/stock fields).  
**Validation:** One active listing; duplicate active rejected; discovery/PDP works.  
**Rollback:** Hide/archive listing.  
**Risks:** catalog_editor create denied; unapplied `20260886`.

---

## Phase G — Internal purchase validation

**Preconditions:** Listing discoverable; **confirm OFF**.  
**Flow:** Internal buyer browse → cart → quote. Confirm only with explicit Gate-ON probe then **always OFF**. No live charges.  
**Validation:** Quote OK; confirm raises while OFF; gate ends at 0.  
**Rollback:** `select public.admin_set_commerce_confirm_enabled(false);`  
**Risks:** Leaving gate ON; `sk_live_`; personal accounts.

---

## Phase H — Rollback

**Preconditions:** Any phase failure or incident.  
**Immediate:**
```sql
select public.admin_set_commerce_confirm_enabled(false);
-- verify
select commerce_confirm_enabled from store_commerce_config;
```
**App:** Redeploy previous release if binary regresses.  
**Data:** Soft-hide listings; return products for revision; suspend seller if needed.  
**DB:** No destructive DOWN; restore from backup only with dual approval.  
**Risks:** Partial migration left in inconsistent state — document applied file list before continuing.

---

## Flags

| Must OFF | Safe / allowed |
| --- | --- |
| `commerce_confirm_enabled` | Seller setup + admin moderation |
| Kill switch unset (cannot force ON) | Marketplace listing after Wave A |
| `NEXT_PUBLIC_STORE_SHOW_*` placeholders | Digital publish readiness enforcement |
| `sk_live_`, bank rails, active commission seed | Cart + quote with confirm OFF |

---

## Production readiness

| Lens | % |
| --- | --- |
| Ready to load first digital product (after Wave A + merge) | **~58% now → ~80% after Phases A–F** |
| Full live sell + settle + payout | **~35%** (intentionally deferred) |
