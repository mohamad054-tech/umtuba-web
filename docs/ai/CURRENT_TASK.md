# Current Task

## CENTRAL GO — CONSUME DESKTOP STORE CATALOG PRODUCTIZATION V1

**TASK_ID** = `CENTRAL_CONSUME_DESKTOP_STORE_CATALOG_PRODUCTIZATION_V1`
**PRIORITY** = HIGH
**SCOPE** = SURGICAL catalog delta onto live combined sandbox `fbb6b364` — authorized demo files only
**DATE** = 2026-08-18
**PRODUCT_OWNER_DECISION** = PRESERVE_AND_INTEGRATE_THIS_WORK
**INPUT_TASK** = `DESKTOP_STORE_DEMO_CATALOG_PRODUCTIZATION_V1`
**STATUS** = IMPLEMENTED_LOCAL — `PUSHED=NO` `DEPLOYED=NO`

### Status

Consumed Desktop intake from fallback UNC (requested `D:\UMTUBA-SHARE\FROM-DESKTOP` was Access Denied). Applied 26-SKU catalog delta onto live combined tip `fbb6b364` (Store V2 + Learning V2 already live). Did not overwrite Store V2 checkout/mock pay/orders/seller/admin/Arabic/RTL/containment. Did not wipe Learning V2. Did not race Hetzner. One local Central commit pending SHA after commit.

### Identity

- **DEVICE** = SERVER (WIN-MJRKAKK2MEH)
- **DEVICE_ROLE** = IMPLEMENTATION
- **INTEGRATE_ONTO** = `fbb6b3646c91b287942da8aa8b1ce4527bfd8695`
- **LIVE_RELEASE** = `fbb6b364-20260818222318` (unchanged; this branch is not deployed)
- **ROLLBACK_RELEASE** = `4b8dcb6d-20260818210857`
- **TASK_BRANCH** = `central/store-catalog-productization-from-desktop-v1`
- **TASK_WORKTREE** = `D:\umtuba-central\repos\umtuba-web-store-catalog-productization-from-desktop-v1`
- **INTAKE_PATH_USED** = `\\192.168.88.11\umtuba-multi-agent-desktop\intake\Desktop\DESKTOP_STORE_DEMO_CATALOG_PRODUCTIZATION_V1\`

### Allowed scope

`lib/store/demo/` (types, catalog, catalogStates, catalog.test, surface, index), `lib/sandbox/fixtures/` (types, store, catalog.test), `app/components/sandbox/SandboxView.tsx`. Docs/ops may be preserved separately.

### Forbidden scope

Overwrite Store V2 with Desktop base `4b8dcb6d`. Wipe Learning V2 or Originals ingest. Race Hetzner. Reset to `8f39277b`. Force-push. `STORE_DEMO_PREVIEW=1`. SQL `20260929`. Mobile. Real products/partners/payments.

---

## Prior — COMBINED STORE + LEARNING PRIVATE SANDBOX DEPLOY V1

**TASK_ID** = `CENTRAL_COMBINED_STORE_LEARNING_SANDBOX_DEPLOY_V1`
**PRIORITY** = MAXIMUM
**SCOPE** = PRIVATE WEB SANDBOX ONLY
**DATE** = 2026-08-18
**MODE** = RECONCILE → TEST → PRIVATE DEPLOY
**PRODUCT_OWNER_GO** = MERGE_BOTH_AND_DEPLOY_PRIVATE_BUSINESS_SANDBOX

### Status

RECONCILE in progress. Dedicated branch from live `4b8dcb6d`. Integrating Store V2 `ffc1a47e` and Learning V2 `fbc6f340` without dropping either product.

### Identity

- **DEVICE** = SERVER (WIN-MJRKAKK2MEH)
- **DEVICE_ROLE** = IMPLEMENTATION
- **CURRENT_LIVE_BASE** = `4b8dcb6ddb1d67b8e665def22440b527bc176f46`
- **LIVE_RELEASE** = `4b8dcb6d-20260818210857`
- **ROLLBACK_RELEASE** = `4b8dcb6d-20260818210857`
- **STORE_V2_SHA** = `ffc1a47ec7f5484167551049b6915258b0cd8623`
- **LEARNING_V2_SHA** = `fbc6f340a07c130ee834544d411ddc9e3532e5e7`
- **TASK_BRANCH** = `central/combined-sandbox-store-learning-v1`
- **TASK_WORKTREE** = `D:\umtuba-central\repos\umtuba-web-combined-sandbox-store-learning-v1`
- **SANDBOX_PATH** = `/sandbox/business-preview`

### Allowed scope

Surgical integrate of Store V2 + Learning V2 under `/sandbox/business-preview`. Preserve hub, `/store/demo-preview` gate, ACCESS_CONTROL, NOINDEX, no public nav. Tests, tsc, lint, build, guest smoke, same Hetzner path as `4b8dcb6d`.

### Forbidden scope

- Disturb production `/learning` or `/store` public catalogs
- Mobile `7cf3960`
- Activate real commerce/partners
- Apply `20260929` or re-apply `20260930`
- Set `STORE_DEMO_PREVIEW=1`
- Force-push; git config --global
- Print tokens
- Reset to `8f39277b`
- Choose one V2 branch and overwrite the other

---

## Prior — STORE FULL SANDBOX PRODUCT IMPLEMENTATION V2

**TASK_ID** = `CENTRAL_STORE_FULL_SANDBOX_PRODUCT_V2`
**STATUS** = IMPLEMENTED_TESTED_NOT_DEPLOYED

Source `ffc1a47e` on `central/store-full-sandbox-product-v2`. Private Store marketplace is clickable. Demo-preview gate preserved. Public `/store` not commercialized.

---

## Prior — LEARNING EXECUTABLE BUSINESS SANDBOX V2

**TASK_ID** = `CENTRAL_LEARNING_EXECUTABLE_SANDBOX_V2`
**STATUS** = IMPLEMENTED_TESTED_NOT_DEPLOYED

Source `fbc6f340` on `central/learning-executable-sandbox-v2`. Executable Learning slices under the private hub. Production `/learning` not rebuilt.

---

## Prior — CHERRY-PICK PRIVATE STORE DEMO PREVIEW ONTO LIVE 8f39277b

**TASK_ID** = `CENTRAL_STORE_PRIVATE_DEMO_PREVIEW_CHERRYPICK_DEPLOY_V1`
**STATUS** = DEPLOYED

Live `4b8dcb6ddb1d67b8e665def22440b527bc176f46` (`4b8dcb6d-20260818210857`) = sandbox `8f39277b` + demo-preview access gate `04cb5fae`. Rollback of that cutover: `8f39277b-20260818204021`. `STORE_DEMO_PREVIEW` unset. Preserve this gate.

---

## Prior — DEPLOY PRIVATE BUSINESS SANDBOX FOR PRODUCT OWNER REVIEW

**TASK_ID** = `CENTRAL_DEPLOY_PRIVATE_BUSINESS_SANDBOX_V1`
**STATUS** = DEPLOYED / SUPERSEDED_WEB_BY_4b8dcb6d

Private `/sandbox/business-preview` landed on `8f39277b-20260818204021`, then demo-preview cutover to `4b8dcb6d-20260818210857`.

## Mobile freeze

Mobile SHA `7cf3960` / umtuba-mobile must not be disturbed.
