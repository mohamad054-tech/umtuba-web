# PC2_UMTUBA_STORE_REAL_CATALOG_BLOCKER_INVESTIGATION_V1

```text
TASK_ID = PC2_UMTUBA_STORE_REAL_CATALOG_BLOCKER_INVESTIGATION_V1
STATUS = INVESTIGATION_COMPLETE_WAITING_CENTRAL
PUBLIC_CATALOG_ZERO_CAUSE = NO_ROW_MEETS_PUBLIC_CONTRACT_AND_NO_VERIFIED_TEST_STORE
PRODUCT_TABLE = public.store_products
PUBLICATION_STATUS_FIELD = status + moderation_status (both required)
PUBLIC_CATALOG_QUERY_REQUIREMENTS = store_products.status=active AND store_products.moderation_status=approved AND stores.status=active; RLS via is_public_store_product; app also hides UMTUBA_E2E sandbox unless NEXT_PUBLIC_STORE_SHOW_SANDBOX_CATALOG=1
EXISTING_PRODUCT_COUNT = UNKNOWN_GLOBAL; TEST_SELLER_A_OWNED=0
PENDING_PRODUCT_COUNT = UNKNOWN_GLOBAL_ADMIN_QUEUE; TEST_SELLER_A_OWNED=0
ACTIVE_PUBLIC_PRODUCT_COUNT = 0
SELLER_ADD_PRODUCT_PERSISTS = YES_WHEN_STORE_VERIFIED_ELSE_DENIED_P0001
APPROVAL_MECHANISM_EXISTS = YES
ADMIN_APPROVAL_PATH = EXISTS_UI_ACTION_RPC_POLICY_BLOCKED_NO_PLATFORM_ADMIN_SESSION
RLS_BLOCKER = YES_FOR_NON_ADMIN
SCHEMA_BLOCKER = NO
SAFE_EXISTING_PATH_AVAILABLE = NO
MINIMUM_CENTRAL_ACTION_REQUIRED = GO_EXISTING_PLATFORM_ADMIN_TO_APPROVE_PENDING_SELLER_A_THEN_SELLER_CREATES_AND_SUBMITS_ONE_TEST_PRODUCT_THEN_ADMIN_APPROVES_THAT_PRODUCT
MIGRATION_REQUIRED = NO
SECURITY_BYPASS_REQUIRED = NO
FILES_CHANGED = NONE_EXPECTED
DEPLOYED = NO
REAL_PAYMENT_CAPTURE = DISABLED
```

Investigate-only. Productization worktree not redesigned. No approval executed. No service-role. No fake catalog rows.

## Why public catalog is zero

`listPublicCatalog` (`lib/store/catalogQueries.ts`) reads `store_products` joined to `stores` and requires:

| Layer | Requirement |
| --- | --- |
| Query | `store_products.status = 'active'` |
| Query | `store_products.moderation_status = 'approved'` |
| Query | `stores.status = 'active'` |
| App mirror | `isPubliclyVisibleProduct` — same three fields |
| RLS | `is_public_store_product(id)` — store active + product active + moderation approved |
| Extra | Sandbox E2E identities hidden by default |

Hosted `/store` rendered honest empty states (2026-08-24 productization). That is not a visual bug. No row currently satisfies the public contract (or none is visible to anon).

This is **not** caused by missing categories (category rail loaded). It is **not** caused by the Night Market overlay.

## Publication contract

**Table:** `public.store_products`  
**Related:** `public.stores`, `product_variants`, `product_prices`, `product_inventory`, `product_media`, `product_categories`

Seller insert (`createDraftProduct`) writes:

- `status = 'draft'`
- `moderation_status = 'pending'`

Trigger `guard_product_seller_lifecycle` (`20260728`):

- Sellers may only insert `draft` / `in_review` with `moderation_status = pending`
- **Sellers cannot set `moderation_status = approved`**
- **Sellers cannot set `status = active`**

Trigger `enforce_verified_store_for_products` (`20260802`):

- INSERT denied unless `stores.verification_status = 'verified'`
- Error: `P0001` `Store must be verified before managing products`

Public visibility does **not** require `stores.verification_status` in the SELECT contract. Verification is required to **create** products and for **admin product approval**. After approval, catalog only checks store `status = active`.

PDP purchase additionally needs an active variant + trusted price (and stock unless backorder). That is after publication.

## Do unpublished products already exist?

| Scope | Count | Source |
| --- | --- | --- |
| Active public catalog | **0** | `listPublicCatalog` + `/store` empty states |
| Test seller A owned products | **0** | `evidence.json` `productListA.count=0` (2026-08-23) |
| Test seller A stores | **0** | `storesVisibleToA.count=0` |
| Global unpublished / pending queue | **UNKNOWN** | `admin_store_moderation_queue_counts` requires `platform_admins`; anon RLS hides non-public rows |

No evidence of a hidden-but-ready production product that PC2 can flip. Test sellers never persisted a product.

## Does Seller Add Product persist?

**Yes, when the seller already owns a verified store.** Path is real:

1. UI `/seller/store/products/new` (auth + membership required)
2. Server action `createDraftProductAction` → `createDraftProduct`
3. INSERT `store_products` + default variant + price + inventory

**Current test sellers: NO persist.** Seller A insert was denied `P0001` because approval has not created a store. UI can still render 200 (empty membership / denied write).

Submit-for-review (`submitProductForReview`) updates `status=in_review`, `moderation_status=pending`. Still not public.

## Approval / moderation that already exists

Two-step, already in schema + app (no new migration):

### A. Seller application → store

- Seller: `/seller/setup` → `seller_applications` draft → `submit_my_seller_application` → `pending`
- Admin UI: `/admin/store/sellers` + `SellerReviewActions`
- Action: `approveSellerApplicationAction` (`app/actions/storeAdmin.ts`)
- RPC: `admin_approve_seller_application(p_application_id)`
- Effect: insert `stores` (`status=active`, `verification_status=verified`) + `store_members` owner + application `approved`

Known leftover: seller A application `pending` slug `pc2-test-seller-a-20260823` (identifiable TEST email). Not approved. Not executed this GO.

### B. Product review → public

- Seller submits draft → `in_review` + `pending`
- Admin UI: `/admin/store/products`
- Action: `approveStoreProductAction`
- RPC: `admin_approve_store_product(p_product_id)`
- Requires product awaiting moderation **and** store `active` + `verified`
- Effect: `status=active`, `moderation_status=approved`, `published_at` set

Also: reject / return-for-revision RPCs + actions.

`approve_seller_application` / `approve_store_product` (service_role) exist for automation. **Not used. Not a PC2 path.**

## Why `NO_ADMIN_APPROVAL_PATH`

| Piece | Present? |
| --- | --- |
| Admin UI `/admin/store/*` | YES |
| Server actions | YES |
| RPCs + grants to `authenticated` | YES |
| Policy `require_platform_admin()` / `is_platform_admin()` | YES |
| Schema `platform_admins` | YES (no authenticated INSERT — self-promotion impossible) |
| PC2 signed-in row in `platform_admins` | **NO** |

`admin_approve_seller_application` as seller A returned `P0001` `Platform admin required`.

**Cause: missing legitimate platform-admin identity/session for this runtime — not missing UI, action, policy, or schema.**

JWT/env hints (`app_metadata`, `UMTUBA_PLATFORM_ADMIN_IDS`) are UX-only. DB table is sole authority.

## Can an existing product be activated safely without schema change / bypass?

**NO** for an already-existing product:

- No public product to “turn on”
- Test sellers have 0 products
- Global pending queue not readable without admin
- Seller self-activate is blocked by trigger

**YES** as an already-supported **flow** (not an existing SKU): platform admin approves pending seller A → A creates + submits one identifiable test product → same admin approves that product. No migration. No RLS weaken. Requires Central GO before anyone executes approval.

## Minimum Central action for ONE legitimate active test product

1. **Authorize** a user who already is (or will be inserted by Central/operator, not PC2) in `platform_admins`.
2. That admin signs in and uses existing `/admin/store/sellers` to approve the pending TEST application (`pc2-test-seller-a-20260823`) — or Central names a different legitimate pending application.
3. Seller A (or named seller) uses existing Add Product to persist a clearly identifiable TEST draft, then Submit for review.
4. Same admin uses existing `/admin/store/products` to approve that one product.
5. Re-check `/store` for one real card → PDP → cart.

Do **not**: service-role from the browser, disable RLS, seed fake approved rows, enable payment, or apply `20260934` for this goal (inherited local file; not required for catalog publication).

## Hard flags

```text
DEPLOYED = NO
NEW_MIGRATION = NO
COMMIT = NO
PUSH = NO
PRIVILEGED_APPROVAL_EXECUTED = NO
REAL_PAYMENT_CAPTURE = DISABLED
PRODUCTIZATION_PRESERVED = YES
```
