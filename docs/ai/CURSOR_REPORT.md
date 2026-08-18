# CURSOR_REPORT — Consume Desktop Store catalog productization V1

```text
SOURCE_DEVICE = CENTRAL / SERVER
DEVICE_ROLE = IMPLEMENTATION
TASK_ID = CENTRAL_CONSUME_DESKTOP_STORE_CATALOG_PRODUCTIZATION_V1
INPUT_TASK = DESKTOP_STORE_DEMO_CATALOG_PRODUCTIZATION_V1
REPORT_TYPE = SURGICAL_INTEGRATION
TIMESTAMP_LOCAL = 2026-08-18 ~22:40 +03
DESKTOP_DELTA_RECOVERED = YES
DIRTY_TREE_PRESERVED = YES
FILE_HASH_MATCH = PASS
AUTHORIZED_SCOPE_ONLY = YES
CENTRAL_AUTHORITATIVE_SHA = PENDING_COMMIT
SECRET_VALUES_PRINTED = NO
FORCE_PUSH = NO
PUSHED = NO
DEPLOYED = NO
PRODUCTION_MUTATED = NO
REMOTE_MIGRATION_APPLIED = NO
SQL_20260929_APPLIED = NO
SQL_20260930_REAPPLIED = NO
MOBILE_SOURCE_CHANGED = NO
STORE_DEMO_PREVIEW_SET = NO
```

## Summary

Consumed Desktop catalog productization from fallback intake (UNC). Hashes 17/17 PASS. Integrated the 26 DEMO SKU delta onto live combined tip `fbb6b364` (Store V2 marketplace + Learning V2 + Learning payment isolation). Did not copy Desktop `SandboxView.tsx` (would have rolled back the hub). Did not overwrite fixture `types.ts` (would have dropped Store V2 payment outcomes and Learning `listPriceMinor`). `UMTUBA_OWNED` listings keep Store V2 actor `umtuba-owned` / display `UMTUBA` and set `ownership.productOwnerActorId=umtuba-demo-platform`. Digital SKUs keep `onHand=null`. Not pushed. Not deployed.

## Exact files changed

- `lib/store/demo/types.ts`
- `lib/store/demo/catalog.ts`
- `lib/store/demo/catalogStates.ts` (new)
- `lib/store/demo/catalog.test.ts`
- `lib/store/demo/surface.ts`
- `lib/store/demo/index.ts`
- `lib/sandbox/fixtures/store.ts` (ownership + conceptKind assignment; Store V2 actors/payments preserved)
- `lib/sandbox/fixtures/catalog.test.ts` (ownership assertions; Store V2 payment assertions preserved)
- `docs/ops/store-demo-catalog-productization-v1/DESKTOP_STORE_DEMO_CATALOG_PRODUCTIZATION_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

Unchanged on purpose:

- `app/components/sandbox/SandboxView.tsx` (combined Store+Learning hub; digital stock honesty already in `StoreBrowse`)
- `lib/sandbox/fixtures/types.ts` (Store V2 + Learning types)
- Learning V2 / Originals ingest worktrees

## Migrations created

None. SQL `20260929` not applied.

## Security review

- All 26 products remain `SOURCE_TYPE=DEMO`, `RIGHTS_STATUS=DEMO_ONLY`, `purchasable=false`, `productionSellable=false`, `REAL_PROVIDER=NONE`.
- Digital SKUs: `onHand=null` / `DIGITAL_NOT_APPLICABLE`.
- `UMTUBA_OWNED` is not attributed to `demo-supplier-a`. Provider identity is `umtuba-demo-platform`.
- No real products, partners, or payments. Mock pay / `realProviderCall=false` preserved.
- No secrets printed. `STORE_DEMO_PREVIEW` unset.

## Tests

64/64 PASS:

- `lib/store/demo/catalog.test.ts` — 4/4
- `lib/store/demoPreviewGate.test.ts` — 5/5
- `lib/sandbox/fixtures/catalog.test.ts` — 9/9
- `lib/sandbox/store/listings.test.ts` — 5/5
- `lib/sandbox/store/catalogQuery.test.ts` — 4/4
- `lib/sandbox/store/session.test.ts` — 5/5
- `lib/sandbox/store/payment.test.ts` — 3/3
- `lib/sandbox/store/messages.test.ts` — 3/3
- `lib/sandbox/containment.test.ts` — 8/8
- `lib/sandbox/learning/learning.executable.test.ts` — 18/18

## TypeScript

`npx tsc --noEmit` — PASS (exit 0) on `fbb6b364` + catalog delta.

## Build

`npm run build` — PASS (exit 0). Pre-existing Turbopack NFT warning in translation-studio import trace; not introduced by this delta.

## git diff --check

PASS.

## git status --short

Worktree `central/store-catalog-productization-from-desktop-v1` at parent `fbb6b364` plus this commit.

## Open issues

- Catalog UX composition (public Store search/filter/related rails) remains Central follow-up; sandbox already browseable.
- Originals ingest worktree left untouched (in-flight merge).
- `PUSHED=NO`. `DEPLOYED=NO`. Do not race Hetzner.
