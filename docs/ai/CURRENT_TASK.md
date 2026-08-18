# Current Task

## Task title

CENTRAL GO — LEARNING ENROLLMENT ELIGIBILITY + COURSE LOCALIZATION FIX

## Identity

- **DEVICE** = SERVER (WIN-MJRKAKK2MEH)
- **DEVICE_ROLE** = IMPLEMENTATION
- **TASK_ID** = `CENTRAL_LEARNING_JA09_ENROLL_LOCALIZATION_V1`
- **PRIORITY** = HIGH

## Status

IMPLEMENTED_NOT_DEPLOYED. Isolated worktree from production SHA `e6b23cc388ddb5e452a405d24d714a5f5bc67818`. Migration `20260930` not applied remotely. Deploy not performed.

## Authoritative base

- **AUTHORITATIVE_BASE_SHA** = `e6b23cc388ddb5e452a405d24d714a5f5bc67818`
- **TASK_BRANCH** = `central/learning-ja09-enroll-localization-v1`
- **WORKTREE** = `D:\umtuba-central\repos\umtuba-web-learning-ja09-enroll-v1`

## Allowed scope

Web Learning enrollment eligibility for JA-09, lesson deep-link after enroll, Learning product-chrome i18n (ar/en/fr/es/de/pt). Tests + tsc + lint + build.

## Forbidden scope

- Mobile SHA `7cf3960` / umtuba-mobile
- Store pre-company branch / `umtuba-web-store-learning-precompany-foundation-v2`
- Store localization/demo-preview wave
- UMTUBA Originals drafts (do not publish)
- SQL 20260929 (do not apply)
- Unrelated Learning courses
- Partner rights gates
- Weakening unrelated RLS/security
- Force-push, remote migrations, secrets

## Next

Trace JA-09 self-enroll block, classify intended model, fix eligibility or honest UI, localize Learning chrome, preserve lesson deep-link.
