# DESKTOP_SUPPLIER_RESELLER_MARKETPLACE_GAP_AUDIT_V1

**TASK_ID:** `DESKTOP_SUPPLIER_RESELLER_MARKETPLACE_GAP_AUDIT_V1`  
**TARGET_DEVICE:** DESKTOP · **DEVICE_ROLE:** COMMERCE_PRIMARY  
**MODE:** `VERIFY_EXISTING_CAPABILITIES_ONLY`  
**Date:** 2026-08-13  
**PRODUCTION_MUTATION_PERFORMED:** NO  
**FEATURE_IMPLEMENTATION_STARTED:** NO  

---

## 0. Authority / trees inspected

| Tree | Tip / role | Used for |
| --- | --- | --- |
| `C:\Users\1\Desktop\umtuba\umtuba-web` | `office/profile-hero-completeness-v1` @ `7ed9159` (workspace) | Primary handoff docs; marketplace foundation present; **no** tip commission/payout/Stripe modules |
| `origin/alpha-0.2` @ `e84475a` | Live alpha | Confirmed: marketplace supplier→seller + settlement **present**; commission/payout/Stripe live **absent** |
| `C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-A3` | `42ae9ba` (Commerce tip lineage; vs alpha **195 behind / 104 ahead**) | Authoritative Commerce tip for commission, payout, refunds, listing hardening |
| Sibling `umtuba-web-commerce-*` WTs | Slice history | Corroboration only (commission / payout / refund / marketplace slices) |

**Method:** code + migrations + focused Vitest on tip. Historical closeouts used only as pointers, not as proof.

**Safe tests run (DESKTOP-A3):**

```text
npx vitest run \
  lib/store/marketplaceSupplierSeller.test.ts \
  lib/store/marketplaceEligibility.test.ts \
  lib/store/commissionPolicyFoundation.test.ts \
  lib/store/commissionDecompositionBridgeApply.test.ts \
  lib/store/commissionPolicyActivation.test.ts \
  lib/store/settlementFoundation.test.ts \
  lib/store/listingProvenanceHardening.test.ts \
  lib/store/supplierListingCreateHardening.test.ts \
  lib/store/fullOrderRefundPath.test.ts
→ 9 files, 134 tests PASSED
```

Primary workspace has no `node_modules`; primary Vitest not run.

---

## Executive verdict

UMTUBA already implements a **Supplier → Seller (reseller storefront) marketplace**:

- Supplier opts products into marketplace.
- Another verified seller **adds to my store** without buying inventory.
- Canonical product stays on supplier; listing is merchandising only.
- Defaults: `inventory_owner_store_id` + `fulfillment_party_store_id` → **supplier**.
- Order lines stamp `supplier_store_id`, `seller_listing_id`, `marketplace_source_type`.

It does **not** implement a Commerce **affiliate identity** (codes/links → `affiliate_id` on orders).  
`affiliate` exists only as a **bps party role** in tip commission math. Signup `referral_*` is UM Points growth, not sale attribution.

**Money tip** (commission apply, Stripe capture, payouts, refund supersede) lives on the **diverged Commerce tip**, not on `origin/alpha-0.2`. Settlement/payout today are **single-store** (`orders.store_id` = seller), so a theoretical 70/20/10 Supplier/Promoter/Platform split is **calculable** on tip but **not settled multi-party**.

---

## Model comparison (from actual code)

| Model | What code supports | Readiness |
| --- | --- | --- |
| **A) AFFILIATE** — share link, commission, no storefront ownership | Signup referral only (non-Commerce). Commission `affiliate_bps` math on tip with **no** affiliate entity/order ID. No Commerce referral→order path. | Low |
| **B) RESELLER STOREFRONT** — add supplier product to own store | `store_seller_listings`, discovery UI, cart/checkout provenance, listing `?listing=` PDP continuity, supplier-held inventory/fulfillment defaults | High |
| **C) HYBRID** — both on one commission core | Reseller path real; `affiliate` role slot reserved in policy; no binding of affiliate identity to sale | Medium |

### Recommendation: **RESELLER** (model B)

Map business “promoter/marketer” → existing **seller store + `store_seller_listings`**. Use tip commission parties as:

- `supplier_bps` → Supplier  
- `seller_bps` → Reseller/promoter  
- `platform_bps` → UMTUBA  

Do **not** invent a parallel affiliate program for V1. Reserve classic affiliate links as a later extension that reuses the same commission decomposition once multi-party settlement exists.

**Rationale:** The largest reusable surface is already Supplier→Seller listings + order-line provenance + supplier fulfillment ownership. Affiliate is a named bps bucket without identity, payout party, or attribution; building that first would duplicate the reseller path. Smallest V1 is: activate marketplace commission policy + multi-party settlement/payout for supplier vs seller vs platform on tip money stack, then land tip→alpha.

---

## 1. SUPPLIER / SELLER

| Capability | Status | Evidence |
| --- | --- | --- |
| Store accounts / membership | EXISTS_COMPLETE | `stores`, `store_members` (`20260728`); `lib/store/types.ts` |
| Onboarding / setup | EXISTS_COMPLETE | `lib/store/sellerSetup.ts`; `app/actions/storeSellerSetup.ts` |
| Verification / applications | EXISTS_COMPLETE | `seller_applications` (`20260802`); admin approve/reject |
| Profile / public storefront | EXISTS_COMPLETE | `app/store/[storeSlug]/**`; branding / storefront flags |
| Product ownership | EXISTS_COMPLETE | `store_products.store_id`; catalog actions |
| Inventory ownership (marketplace) | EXISTS_COMPLETE | Listing columns + create hardening defaults to supplier (`20260886`) |
| Order visibility (seller/order store) | EXISTS_COMPLETE | Seller orders UI/actions on tip + primary |
| Order visibility (supplier of listing sales) | EXISTS_PARTIAL | Provenance columns exist; seller-ops surfaces are store-scoped to `orders.store_id`; no dedicated supplier fulfillment inbox found |
| Fulfillment responsibility | EXISTS_PARTIAL | `fulfillment_party_store_id` defaults supplier; fulfillment actions are seller-order lifecycle |
| Shipping / tracking | EXISTS_COMPLETE | `order_shipments`, shipping zones/rates; `lib/store/tracking.ts` |
| Return / refund responsibility | EXISTS_PARTIAL | Fulfillment stage `returned`; tip full/partial refund paths; no dedicated RMA table; multi-party money reverse incomplete (see §7) |

---

## 2. CATALOG / PRODUCT

| Capability | Status | Evidence |
| --- | --- | --- |
| Creation / variants / prices / stock | EXISTS_COMPLETE | `20260728` tables; `app/actions/storeCatalog.ts`; `lib/store/inventory.ts` |
| Ownership | EXISTS_COMPLETE | Product remains on supplier store; listing references `source_product_id` |
| Publishing + moderation | EXISTS_COMPLETE | `status` / `moderation_status`; submit/approve admin path |
| Marketplace eligibility / supplier opt-in | EXISTS_COMPLETE | `stores.marketplace_supplier_enabled`, `store_products.marketplace_eligible` (`20260869`) |
| Publish listing / unpublish | EXISTS_COMPLETE | Listing statuses `draft|active|hidden|archived` |
| Seller listing price / margin UI | EXISTS_PARTIAL | Outcome B: listing price read-only from canonical `product_prices` (no fabricated seller margin) — `marketplaceSupplierSeller.ts` header contract |
| Variants on listings | PRIMITIVE_EXISTS_REUSABLE | Variants on product; listing is product-level, not variant-level reseller SKU |
| Marketplace discovery for sellers | EXISTS_COMPLETE | `listMarketplaceDiscoveryForSeller`; `app/seller/store/marketplace/**` |

---

## 3. RESELLER / AFFILIATE

| Search term / capability | Status | Notes |
| --- | --- | --- |
| Reseller / “add to my store” | EXISTS_COMPLETE | `add_store_seller_listing` RPC; `addToMyStoreAction`; UI marketplace pages |
| Promoter storefront | EXISTS_COMPLETE | Seller storefront hosts listing; PDP listing provenance (`listingProvenance.ts`, `?listing=`) |
| Shared catalog / product resale without inventory buy | EXISTS_COMPLETE | Unique `(seller, source product)`; inventory stays supplier |
| Affiliate entity / account | MISSING | No `affiliate_id` / `reseller_id` / `promoter_id` in Commerce schema |
| Referral code/link → Commerce order | MISSING | `referral_codes` / `referral_attributions` = signup UM Points (`20260722`), not orders |
| Campaign attribution on orders | MISSING | Coupon “campaign window” ≠ affiliate campaign |
| Commission party role `affiliate` | PRIMITIVE_EXISTS_REUSABLE | Tip `store_commission_policies.affiliate_bps` + TS roles; **no identity binding** |
| Influencer / marketer first-class type | MISSING | Covered by seller store role today |

---

## 4. STOREFRONTS

| Capability | Status | Evidence |
| --- | --- | --- |
| Per-user/seller storefront | EXISTS_COMPLETE | `/store/[storeSlug]` |
| Multiple stores / memberships | EXISTS_PARTIAL | Multi-member stores; not a dedicated “marketer portfolio of many supplier brands” product |
| Product-to-store via listing | EXISTS_COMPLETE | `store_seller_listings` |
| Same supplier product on many seller storefronts | EXISTS_COMPLETE | Unique per seller+product; many sellers may list same source |
| Canonical product + multiple promoters | EXISTS_COMPLETE | Same `source_product_id`, many listings |
| Reuse storefront without duplicate inventory | EXISTS_COMPLETE | Inventory on supplier `product_inventory`; listing does not clone stock |

---

## 5. ORDER ATTRIBUTION

| Field / equivalent | Present? | Where |
| --- | --- | --- |
| SUPPLIER_ID | YES (`supplier_store_id`) | `order_items`, listings, commission decomposition snapshot `supplier_store_ids` (tip) |
| SELLER_ID | YES (as `orders.store_id` / listing `seller_store_id`; also `order_items.seller_user_id` historic) | Orders header = seller/order store |
| RESELLER_ID / AFFILIATE_ID | NO as affiliate; reseller = seller store | — |
| REFERRAL_ID | NO on Commerce orders | Signup referral tables only |
| SOURCE | PARTIAL (`marketplace_source_type`: `owned` \| `supplier_listing`) | `order_items` |
| CAMPAIGN | NO | — |
| COMMISSION | PARTIAL | Tip decomposition events store amounts; not alpha |
| Listing ID | YES (`seller_listing_id`) | cart + order items |
| Inventory / fulfillment party | YES | `inventory_owner_store_id`, `fulfillment_party_store_id` on items/listings |

**Classification:** ORDER attribution for **reseller model** = EXISTS_PARTIAL→near complete for supplier/seller/listing; for **affiliate model** = MISSING.

---

## 6. MONEY / COMMISSION

| Capability | Status | Tree |
| --- | --- | --- |
| Buyer payment (Stripe Checkout, platform-collected) | EXISTS_COMPLETE (tip) / PRIMITIVE (alpha: deferred only) | Tip `stripeLiveCapture` / webhook; primary Stripe disabled |
| Platform fee / seller / supplier / affiliate split **math** | EXISTS_COMPLETE (tip) | `calculateCommissionSplit`; bps sum = 10000 |
| Applied decomposition after capture | EXISTS_COMPLETE (tip) | `applyCommissionDecompositionAfterTrustedCapture` |
| Active policy seed for marketplace | EXISTS_PARTIAL | Registry exists; **no active seed** in migration (fail-closed until activated) |
| Settlement allocate/release/hold/reverse | EXISTS_COMPLETE (single store) | `store_settlement_*`; `v_store_id := v_order.store_id` |
| Multi-party settlement (supplier + seller + platform) | MISSING | Payable is per order store (seller) |
| Seller payout rails / live Manual Ops | EXISTS_PARTIAL (tip) | `store_payout_*`; Stripe Connect reserved `enabledForV1: false` |
| Supplier payout of `supplier_amount_minor` | MISSING | Amounts recorded; no supplier payable rail |
| Affiliate payout | MISSING | Amounts only |
| UEOS ledger | EXISTS_COMPLETE | `20260822` |
| Tip money ≠ marketplace split | NOT_REQUIRED_FOR_V1 | Tips = creator revenue source enum |

### Could order of 100 split Supplier 70 / Promoter 20 / UMTUBA 10?

| Layer | Answer |
| --- | --- |
| Policy math (tip) | **YES** — e.g. `supplier_bps=7000`, `seller_bps=2000`, `platform_bps=1000` (tests prove multi-party conservation including affiliate/partner lines) |
| Bind promoter = reseller seller store | **YES** via listing provenance |
| Bind supplier from order lines | **YES** (`supplier_store_id`) |
| Settle/pay three parties | **NO today** — settlement/payout single `store_id` (seller); platform fee not auto-routed as Connect application fee |
| Execute payment | **NOT RUN** (audit only) |

---

## 7. REFUNDS / CANCELLATIONS

| Capability | Status | Evidence |
| --- | --- | --- |
| Customer/seller cancel + full refund (tip) | EXISTS_COMPLETE | `fullOrderRefundPath` + Stripe refund ops |
| Partial refunds (tip) | EXISTS_COMPLETE | Partial refund reservation/ledger/provider modules |
| Settlement reverse on refund | EXISTS_COMPLETE | `hold` / `reverse_allocation` |
| Commission lifecycle on refund | EXISTS_PARTIAL | Mark decomposition `superseded_by_refund` (snapshot kept; not separate clawback ledger per party) |
| Reverse supplier + reseller + platform independently | MISSING | No multi-party payable reverse |
| Digital entitlement revoke on refund | EXISTS_COMPLETE (tip) | Entitlement revoke modules |
| Returns / RMA workflow | EXISTS_PARTIAL | Lifecycle label only |

---

## 8. FULFILLMENT

| Capability | Status | Evidence |
| --- | --- | --- |
| UMTUBA does not hold goods | EXISTS_COMPLETE | Seller/supplier `product_inventory` + reservations; no platform warehouse |
| Supplier fulfills direct (contract columns) | EXISTS_COMPLETE | Defaults `fulfillment_party_store_id = supplier` on listing create |
| Shipping status / tracking | EXISTS_COMPLETE | Shipments + tracking validators/actions |
| Supplier-facing fulfillment queue for reseller sales | EXISTS_PARTIAL / MISSING UI | Data on order items; ops UX is seller-order centric |
| Inventory reservation at confirm | EXISTS_COMPLETE | `inventory_reservations`; commerce confirm gate |

---

## 9. SECURITY / ABUSE — gaps only (do not build)

1. **Self-dealing / circular stores** — listing forbids `seller_store_id = supplier_store_id`, but related-party / same-beneficial-owner farms across multiple stores not blocked.  
2. **Commission farming** — fake buyers + refund after capture; tip supersedes decomposition but multi-party clawback/payout timing abuse open.  
3. **No Commerce affiliate anti-fraud** — N/A until affiliate identity exists; signup referral has its own claim hardening (separate domain).  
4. **Duplicate attribution** — listing provenance hardened for cart/wishlist/PDP; no campaign/click-id collision rules.  
5. **Inventory fraud** — supplier stock is source of truth; seller cannot inject on_hand via listing create (client fields rejected) — residual: supplier oversell + backorder policy abuse.  
6. **Unauthorized product copying** — listing references canonical product (good); merchandising overrides exist — residual: trademark/content abuse in overrides.  
7. **Promoter claiming another’s sale** — mitigated by `seller_listing_id` + checkout alignment; residual if cart store ≠ listing seller.  
8. **Refund-after-commission / payout race** — settlement reverse + commission supersede exist; live payout in-transit vs refund ordering remains an ops risk (Manual Ops Live).  
9. **Tip money stack not on alpha** — production risk if operators assume tip behavior on live alpha.

---

## 10. CURRENT TEST COVERAGE

### Ran (tip DESKTOP-A3) — PASS 134/134

Marketplace eligibility/listings, commission policy/activation/decomposition, settlement foundation, listing provenance hardening, supplier listing create hardening, full-order refund path.

### Present but not re-run this audit

Tip: `sellerPayout*`, `partialRefund*`, `stripe*.test.ts`, broader `lib/store` (~125 tests).  
Primary: marketplace + settlement foundation tests (no local `node_modules`).  
Non-Commerce: `lib/referral/*.test.ts` (signup points).

### Coverage gaps for this business model

- No E2E: supplier list → reseller add → buyer purchase → 3-way split → supplier ship.  
- No tests binding `affiliate_bps` to an affiliate principal.  
- No multi-party settlement/payout tests (feature absent).  
- Supplier order inbox / fulfillment ACL tests absent.

---

## Classification summary (capability → one status)

| Area | Status |
| --- | --- |
| Supplier/seller accounts & storefront | EXISTS_COMPLETE |
| Catalog + marketplace eligibility | EXISTS_COMPLETE |
| Reseller “add to my store” + shared catalog | EXISTS_COMPLETE |
| Supplier-direct fulfillment ownership columns | EXISTS_COMPLETE |
| Order-line supplier/seller/listing attribution | EXISTS_PARTIAL (complete for reseller; missing affiliate/campaign) |
| Affiliate identity / referral→order | MISSING |
| Commission policy math (tip) | EXISTS_COMPLETE |
| Commission on alpha | MISSING |
| Multi-party settlement/payout | MISSING |
| Single-store settlement foundation | EXISTS_COMPLETE |
| Stripe buyer capture (tip) | EXISTS_COMPLETE |
| Stripe Connect marketplace | MISSING (reserved; NOT_REQUIRED_FOR_V1 if Manual Ops) |
| Refund + commission supersede (tip) | EXISTS_PARTIAL |
| Anti-abuse for affiliate/reseller farms | EXISTS_PARTIAL / gaps listed |
| Tip→alpha integration | BLOCKED_EXTERNAL (divergence) |

---

## GAP MATRIX

| CAPABILITY | CURRENT_IMPLEMENTATION | STATUS | REUSABLE_COMPONENTS | MISSING_PIECE | ESTIMATED_CHANGE_SIZE | PRODUCTION_BLOCKER |
| --- | --- | --- | --- | --- | --- | --- |
| Supplier accounts / verify / catalog | stores + seller_applications + catalog | EXISTS_COMPLETE | `sellerSetup`, `storeCatalog`, admin | — | XS | NO |
| Supplier marketplace opt-in | flags + discovery | EXISTS_COMPLETE | `marketplaceSupplierSeller*`, marketplace UI | — | XS | NO |
| Reseller add-to-store | `store_seller_listings` + RPC | EXISTS_COMPLETE | `addToMyStoreAction`, hardening `20260886` | — | XS | NO |
| Storefront reuse w/o inventory clone | listing → seller PDP | EXISTS_COMPLETE | storefront + `listingProvenance` | — | XS | NO |
| Order attribution (supplier/seller/listing) | order_items columns + checkout alignment | EXISTS_PARTIAL | `20260869/70`, provenance builders | Supplier order visibility ACL/UI | S | NO |
| Affiliate / referral sale attribution | signup referral only; commission role name | MISSING | `affiliate_bps` slot (tip) | Entity, link, order FK, fraud rules | L | YES (if choosing model A) |
| Platform + supplier + reseller commission math | tip policy foundation | EXISTS_COMPLETE | `commissionPolicyFoundation`, SQL RPCs | Active marketplace policy | S | YES on alpha (absent) |
| Apply decomposition on capture | tip bridge | EXISTS_COMPLETE | `commissionDecompositionBridgeApply`, Stripe outcome apply | Ensure marketplace orders always pass supplier linkage checks | S | YES on alpha |
| Multi-party settlement (70/20/10) | single-store settlement | MISSING | `store_settlement_*`, UEOS | Allocate supplier/seller/platform payables | L | YES |
| Supplier + seller payout | seller payout rails tip | EXISTS_PARTIAL | `sellerPayout*`, Manual Ops Live | Supplier payable destination + split release | M | YES |
| Refund reverses all parties | reverse seller settlement + supersede decomp | EXISTS_PARTIAL | `fullOrderRefundPath`, partial refund stack | Per-party clawback / payout hold rules | M | YES |
| Supplier fulfills reseller sale | columns default supplier | EXISTS_PARTIAL | fulfillment + tracking | Supplier inbox / permissions for foreign `orders.store_id` | M | NO (ops gap) |
| Anti-abuse (self-deal, farm, refund race) | listing ≠ self; listing create hardening | EXISTS_PARTIAL | commerce safety, listing checks | Related-party, payout-vs-refund locks | M | YES |
| Tip money stack on alpha | diverged Commerce tip | BLOCKED_EXTERNAL | tip migrations/modules | Integrate tip→alpha (not FF) | XL | YES |
| Stripe Connect auto-split | reserved disabled | NOT_REQUIRED_FOR_V1 | Manual Ops Live | Optional later | — | NO for V1 Manual Ops |

---

## Propose V1 ONLY (design — do not implement)

**Goal:** Smallest Reseller V1: Supplier → Promoter(Seller store) → Customer, max reuse.

### Minimum schema
- Reuse `store_seller_listings`, order-item provenance, tip `store_commission_policies` / decomposition events.  
- **Add only if required:** settlement allocation lines keyed by `party_role` + `party_store_id` (or dual settlement events for supplier + seller). Prefer extending settlement events over new “affiliate” tables.  
- **Do not** add affiliate entity for V1.

### Minimum API / server
- Activate one marketplace commission policy (e.g. 70/20/10 supplier/seller/platform) server-side only.  
- On trusted capture of `supplier_listing` orders: apply decomposition (already tip-shaped).  
- Settlement: post supplier payable + seller payable + platform retained from same basis.  
- Payout: seller rail reuse; supplier destination reuse of payout destination pattern.

### Minimum UI
- Existing seller marketplace + storefront.  
- Supplier: read-only list of open fulfillment obligations for their `fulfillment_party_store_id` lines (minimal).  
- Admin: policy activation + Manual Ops payout (existing tip patterns).

### Order attribution
- Required: `supplier_store_id`, `seller_listing_id`, `orders.store_id` (reseller), `marketplace_source_type=supplier_listing`.  
- Not in V1: `affiliate_id`, campaign, signup referral bridge.

### Commission ledger
- Reuse tip decomposition events as immutable snapshot; UEOS postings per party.

### Refund reversal
- Hold/reverse both supplier and seller allocations; mark decomposition superseded; block payout release while refund in flight.

### Supplier fulfillment
- Enforce `fulfillment_party_store_id=supplier` for marketplace listings; supplier shipment actions on those lines.

### Anti-abuse (V1 minimum)
- Block listing when seller and supplier share owner_user_id (or configurable related-party).  
- Payout release only after fulfillment/refund window policy.  
- Keep client commission/% rejection (already tip).

---

## Metrics (authoritative close)

```
CURRENT_COMMERCE_REUSE_PERCENT = 62%
SUPPLIER_FOUNDATION_READY = YES
STOREFRONT_FOUNDATION_READY = YES
ORDER_ATTRIBUTION_FOUNDATION_READY = YES
COMMISSION_FOUNDATION_READY = NO
SETTLEMENT_FOUNDATION_READY = NO
SUPPLIER_DIRECT_FULFILLMENT_READY = YES
AFFILIATE_MODEL_READINESS = 22%
RESELLER_MODEL_READINESS = 78%
HYBRID_MODEL_READINESS = 55%
RECOMMENDED_V1_MODEL = RESELLER
MINIMUM_NEW_COMPONENTS = [multi_party_settlement_allocations, marketplace_commission_policy_activation, supplier_payable_payout_rail, supplier_fulfillment_order_inbox, related_party_listing_guard, tip_money_stack_alpha_integration]
ESTIMATED_V1_IMPLEMENTATION_SIZE = L
EXTERNAL_BLOCKERS = [commerce_tip_diverged_from_alpha_0.2_195_behind_104_ahead, commission_payout_stripe_absent_on_alpha, commerce_confirm_gate_default_off, stripe_connect_not_in_v1_manual_ops_only, no_active_commission_policy_seed]
PRODUCTION_MUTATION_PERFORMED = NO
FEATURE_IMPLEMENTATION_STARTED = NO
```

### Metric notes
- **COMMISSION_FOUNDATION_READY = NO** — tip math/apply exist, but not on alpha and not multi-party settled; not production-ready as a foundation for this GO.  
- **SETTLEMENT_FOUNDATION_READY = NO** — single-store foundation exists (YES as primitive), but **not** ready for Supplier/Promoter/Platform split (audit metric = multi-party readiness).  
- **ORDER_ATTRIBUTION_FOUNDATION_READY = YES** — for recommended RESELLER model (supplier/seller/listing).  
- **Reuse 62%** — reseller catalog/storefront/fulfillment ownership reusable; money path ~half-built on tip only.

---

## Exact files / refs consulted (non-exhaustive)

- `supabase/migrations/20260869_store_marketplace_supplier_seller_foundation_v1.sql`  
- `supabase/migrations/20260870_store_marketplace_listing_checkout_alignment_v1.sql`  
- Tip: `20260884` / `20260890` / `20260891` commission; `20260886` listing hardening; `20260824` settlement; `20260881`+ payout  
- `lib/store/marketplaceSupplierSeller.ts` (+ tip Queries/tests)  
- Tip: `commissionPolicyFoundation.ts`, `commissionDecompositionBridgeApply.ts`, `fullOrderRefundPath.ts`, `listingProvenance.ts`, `settlementFoundation.ts`, `sellerPayoutFoundation.ts`  
- `lib/referral/*` (non-Commerce signup)  
- UI: `app/seller/store/marketplace/**`, `app/actions/storeMarketplace.ts`

---

END OF AUDIT — STOP (no implementation).
