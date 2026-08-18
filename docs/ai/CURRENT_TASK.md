# Current Task

## CENTRAL GO — LEARNING EXECUTABLE BUSINESS SANDBOX V2

**TASK_ID** = `CENTRAL_LEARNING_EXECUTABLE_SANDBOX_V2`
**PRIORITY** = HIGH
**SCOPE** = PRIVATE WEB SANDBOX LEARNING SLICES ONLY
**DATE** = 2026-08-18
**PRODUCT_OWNER_DECISION** = IMPLEMENT_COMPLETE_EXECUTABLE_LEARNING_SANDBOX

### Status

IMPLEMENTED locally on `central/learning-executable-sandbox-v2` from live `4b8dcb6d`. Production `/learning` not rebuilt. Store demo-preview gate and sandbox hub preserved. Not deployed — Store Full Sandbox Product V2 is in flight.

### Identity

- **DEVICE** = SERVER (WIN-MJRKAKK2MEH)
- **DEVICE_ROLE** = IMPLEMENTATION
- **BASE_SHA** = `4b8dcb6ddb1d67b8e665def22440b527bc176f46`
- **LIVE_RELEASE** = `4b8dcb6d-20260818210857`
- **ROLLBACK_RELEASE** = `8f39277b-20260818204021`
- **TASK_BRANCH** = `central/learning-executable-sandbox-v2`
- **TASK_WORKTREE** = `D:\umtuba-central\repos\umtuba-web-learning-executable-sandbox-v2`
- **SANDBOX_PATH** = `/sandbox/business-preview`

### Allowed scope

Executable Learning slices under `/sandbox/business-preview` with sandbox data adapters. Additive Learning nav/section links only.

### Forbidden scope

- Rebuild or replace `/learning`
- Store shopper/PDP/cart/checkout/seller files owned by Store V2
- Mobile `7cf3960`
- SQL `20260929`; re-apply `20260930`
- Production Learning mutations
- Real payments; `STORE_DEMO_PREVIEW=1` on production
- Force-push; print secrets

### Parallel — do not collide

- Store Full Sandbox Product V2: `central/store-full-sandbox-product-v2`
- Store demo-preview gate live on `4b8dcb6d`
- Mobile freeze `7cf3960`

---

## Prior — CHERRY-PICK PRIVATE STORE DEMO PREVIEW ONTO LIVE 8f39277b

Live is `4b8dcb6d` (`4b8dcb6d-20260818210857`). Rollback `8f39277b-20260818204021`. Do not reset.

## Mobile freeze

Mobile SHA `7cf3960` / umtuba-mobile must not be disturbed.
