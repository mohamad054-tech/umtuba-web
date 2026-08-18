# Current Task

## CENTRAL GO — STORE FULL SANDBOX PRODUCT IMPLEMENTATION V2

**TASK_ID** = `CENTRAL_STORE_FULL_SANDBOX_PRODUCT_V2`
**PRIORITY** = HIGH
**SCOPE** = PRIVATE WEB STORE SANDBOX ONLY
**DATE** = 2026-08-18
**MODE** = PRIVATE_SANDBOX_IMPLEMENTATION
**PRODUCT_OWNER_DECISION** = IMPLEMENT_COMPLETE_REALISTIC_STORE_SANDBOX

### Status

IN PROGRESS on live tip `4b8dcb6d`. Deepen `/sandbox/business-preview` Store into a clickable marketplace. Preserve demo-preview access gate. Do not commercialize public `/store`. Do not deploy onto `8f39277b`. Do not wipe sandbox.

### Identity

- **DEVICE** = SERVER (WIN-MJRKAKK2MEH)
- **DEVICE_ROLE** = IMPLEMENTATION
- **PRODUCTION_SHA_BEFORE** = `4b8dcb6ddb1d67b8e665def22440b527bc176f46`
- **LIVE_RELEASE** = `4b8dcb6d-20260818210857`
- **ROLLBACK_RELEASE** = `8f39277b-20260818204021`
- **BASE_SANDBOX_SHA** = `8f39277bbe902dd202023379bff2fc25161d3168`
- **LIVE_TIP** = `4b8dcb6ddb1d67b8e665def22440b527bc176f46`
- **TASK_BRANCH** = `central/store-full-sandbox-product-v2`
- **TASK_WORKTREE** = `D:\umtuba-central\repos\umtuba-web-store-full-sandbox-product-v2`

### Allowed scope

Private sandbox Store marketplace (P1–P18) under `/sandbox/business-preview`. Preserve `/store/demo-preview` auth/noindex. Learning sandbox intact. Tests + tsc + lint + build.

### Forbidden scope

- Mobile `7cf3960`
- Commercialize production Store / public `/store`
- Real third-party products, providers, payments, partners
- SQL `20260929`; re-apply `20260930`
- Weaken rights gates (UNKNOWN=DENY)
- Public nav / sitemap / anonymous catalog
- `STORE_DEMO_PREVIEW=1` globally on production
- Force-push; git config --global
- Print secrets
- Deploy onto `8f39277b` or wipe the live sandbox hub

---

## Prior — CHERRY-PICK PRIVATE STORE DEMO PREVIEW ONTO LIVE 8f39277b

**TASK_ID** = `CENTRAL_STORE_PRIVATE_DEMO_PREVIEW_CHERRYPICK_DEPLOY_V1`
**STATUS** = DEPLOYED

Live `4b8dcb6ddb1d67b8e665def22440b527bc176f46` (`4b8dcb6d-20260818210857`) = sandbox `8f39277b` + demo-preview access gate `04cb5fae`. Rollback of that cutover: `8f39277b-20260818204021`. `STORE_DEMO_PREVIEW` unset. Preserve this gate.

---

## Prior — Deploy private business sandbox

**CENTRAL_DEPLOY_PRIVATE_BUSINESS_SANDBOX_V1** — DEPLOYED then superseded as live tip by the demo-preview cherry-pick. Hub `/sandbox/business-preview` remains live.

---

## Prior — JA09 MIGRATION PREFLIGHT + CONTROLLED CUTOVER

**CENTRAL_JA09_MIGRATION_PREFLIGHT_CUTOVER_V1** — IDLE / DEPLOYED. Remote `20260930` applied. `20260929` not applied.

## Mobile freeze

Mobile SHA `7cf3960` / umtuba-mobile must not be disturbed.
