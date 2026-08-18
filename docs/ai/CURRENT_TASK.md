# Current Task

## Task title

CENTRAL GO — CHERRY-PICK PRIVATE STORE DEMO PREVIEW ONTO LIVE 8f39277b

## Identity

- **DEVICE** = SERVER (WIN-MJRKAKK2MEH)
- **DEVICE_ROLE** = IMPLEMENTATION
- **TASK_ID** = `CENTRAL_STORE_PRIVATE_DEMO_PREVIEW_CHERRYPICK_DEPLOY_V1`
- **PRIORITY** = HIGH

## Status

IN PROGRESS — cherry-pick `04cb5fae` onto live sandbox `8f39277b`. Do not reset `8f39277b` backward. Preserve `/sandbox/business-preview`. Do not set `STORE_DEMO_PREVIEW=1`. Do not apply `20260929`. Do not re-apply `20260930`. Mobile `7cf3960` frozen.

## Authoritative base

- **PRODUCTION_SHA_BEFORE** = `8f39277bbe902dd202023379bff2fc25161d3168`
- **LIVE_RELEASE** = `8f39277b-20260818204021`
- **ROLLBACK_RELEASE** = `8f39277b-20260818204021`
- **SOURCE_SHA** = `04cb5faeaceb8d8a8ad5aa7fcadeadc5c76ebbe4`
- **TASK_BRANCH** = `central/store-private-demo-preview-on-8f39277b-v1`
- **TASK_WORKTREE** = `D:\umtuba-central\repos\umtuba-web-store-private-demo-preview-on-8f39277b-v1`

## Allowed scope

WEB STORE ONLY plus additive robots for both private surfaces. Cherry-pick private demo preview access onto current live sandbox tip. Same Hetzner path. Guest smoke. Reports.

## Forbidden scope

`STORE_DEMO_PREVIEW=1` on production. SQL `20260929`. Re-apply `20260930`. Reset production / overwrite sandbox hub. Force-push. Mobile `7cf3960`. Token secrets in reports.

---

## Prior — Deploy private business sandbox

**CENTRAL_DEPLOY_PRIVATE_BUSINESS_SANDBOX_V1** — DEPLOYED

Live `8f39277bbe902dd202023379bff2fc25161d3168` (`8f39277b-20260818204021`). Rollback `a085f667-20260818193948`. Sandbox URL `https://umtuba.com/sandbox/business-preview`. `STORE_DEMO_PREVIEW` unset. `SANDBOX_BUSINESS_PREVIEW_TOKEN` unset.

---

## Prior — JA09 MIGRATION PREFLIGHT + CONTROLLED CUTOVER

**CENTRAL_JA09_MIGRATION_PREFLIGHT_CUTOVER_V1** — IDLE / DEPLOYED

Remote `20260930` applied. `20260929` not applied. SHA `a085f667` is the sandbox parent. Do not reset.

## Mobile freeze

Mobile SHA `7cf3960` / umtuba-mobile must not be disturbed.
