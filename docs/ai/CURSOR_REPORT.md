# CURSOR_REPORT — Cherry-pick private Store demo preview onto 8f39277b

```text
SOURCE_DEVICE = CENTRAL / SERVER
DEVICE_ROLE = IMPLEMENTATION
TASK_ID = CENTRAL_STORE_PRIVATE_DEMO_PREVIEW_CHERRYPICK_DEPLOY_V1
REPORT_TYPE = CHERRYPICK
TIMESTAMP_LOCAL = 2026-08-18 ~21:05 +03
SECRET_VALUES_PRINTED = NO
FORCE_PUSH = NO
PUSH = NO
PRODUCTION_MUTATED = NO
REMOTE_MIGRATION_APPLIED = NO
SQL_20260929_APPLIED = NO
SQL_20260930_REAPPLIED = NO
MOBILE_SOURCE_CHANGED = NO
MOBILE_RELEASE_TRAIN_DISTURBED = NO
STORE_DEMO_PREVIEW_SET = NO
SANDBOX_HUB_PRESERVED = YES
DEPLOY_ONTO_A085F667 = NO
```

## Summary

Did not deploy onto `a085f667`. Cherry-picked `04cb5fae` onto live sandbox `8f39277b`. Sandbox hub files kept. Indexing disallows both `/sandbox` and `/store/demo-preview`. Anonymous `/store/demo-preview` remains DENY. Public `/store` stays demo-free.

## Exact files changed

- `lib/store/demoPreviewGate.ts`
- `lib/store/demoPreviewGate.test.ts`
- `lib/store/demoPreviewAccess.ts`
- `lib/store/demoPreviewSession.ts` (new)
- `app/store/demo-preview/enter/route.ts` (new)
- `app/store/demo-preview/page.tsx`
- `app/store/demo-preview/[slug]/page.tsx`
- `lib/site/indexing.ts` (additive: keep `/sandbox` and add `/store/demo-preview`)
- `lib/site/metadata.test.ts` (same)
- `lib/store/demo/catalog.test.ts`
- `app/lib/nav/secondarySurfaceContract.test.ts`
- `docs/store/DEMO_CATALOG_PREVIEW.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

Sandbox hub under `app/sandbox/**`, `app/components/sandbox/**`, `lib/sandbox/**` not rewritten.

## Migrations created

None. SQL `20260929` not applied. `20260930` not re-applied.

## Security review

- Anonymous `/store/demo-preview` = DENY.
- Admin path re-checks `is_platform_admin` (DB).
- Token path requires `STORE_DEMO_PREVIEW_TOKEN` length ≥ 16; SHA-256 + `timingSafeEqual`. Cookie is httpOnly, SameSite=strict, path-scoped hash.
- `STORE_DEMO_PREVIEW=1` and non-production NODE_ENV are not grants.
- Pages noindex; robots disallows `/store/demo-preview` and `/sandbox`.
- Sandbox hub access policy unchanged.
- Secret values never committed or printed.

## Tests

PASS — 8 files / 49 tests (demo preview gate, catalog, metadata, nav, sandbox fixtures/access/containment).

## TypeScript

`npx tsc --noEmit` PASS

## Build

PENDING host/local build after cherry-pick commit.

## git diff --check

PENDING after add.

## git status --short

Cherry-pick resolving on `central/store-private-demo-preview-on-8f39277b-v1`.

## Open issues

Deploy only this combined tip. Never reset `8f39277b` backward.
