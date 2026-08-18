# CURSOR_REPORT — Private Store demo preview access on a085f667

```text
SOURCE_DEVICE = CENTRAL / SERVER
DEVICE_ROLE = IMPLEMENTATION
TASK_ID = CENTRAL_STORE_PRIVATE_DEMO_PREVIEW_ACCESS_V1
REPORT_TYPE = CHERRY_PICK_ONTO_LIVE_A085F667
TIMESTAMP_LOCAL = 2026-08-18 ~19:55 +03
SECRET_VALUES_PRINTED = NO
FORCE_PUSH = NO
PUSH = NO
PRODUCTION_MUTATED = NO
REMOTE_MIGRATION_APPLIED = NO
SQL_20260929_APPLIED = NO
SQL_20260930_REAPPLIED = NO
MOBILE_SOURCE_CHANGED = NO
MOBILE_RELEASE_TRAIN_DISTURBED = NO
DEMO_PRODUCTS_LIVE_PUBLIC = NO
STORE_DEMO_PREVIEW_ON_PUBLIC_HOSTS = UNSET
```

## Summary

Cherry-picked private demo-preview access (`04cb5fae`) onto live `a085f6675bfd3a657858c17879ae037ac6bdc9f6` (JA-09 enroll + Store Arabic). Anonymous `/store/demo-preview` remains DENY. Access is platform-admin session or `STORE_DEMO_PREVIEW_TOKEN` via `/store/demo-preview/enter`. `STORE_DEMO_PREVIEW=1` is not required and must stay unset on public hosts. Public `/store` is live catalog only. Learning enroll files were not rewritten. Migrations were not applied.

## Exact files changed

- `lib/store/demoPreviewGate.ts`
- `lib/store/demoPreviewGate.test.ts`
- `lib/store/demoPreviewAccess.ts`
- `lib/store/demoPreviewSession.ts` (new)
- `app/store/demo-preview/enter/route.ts` (new)
- `app/store/demo-preview/page.tsx`
- `app/store/demo-preview/[slug]/page.tsx`
- `lib/site/indexing.ts`
- `lib/site/metadata.test.ts`
- `lib/store/demo/catalog.test.ts`
- `app/lib/nav/secondarySurfaceContract.test.ts`
- `docs/store/DEMO_CATALOG_PREVIEW.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

None. Tree **contains** already-applied JA-09 file `supabase/migrations/20260930_learning_public_catalog_self_enroll_v1.sql`. Not re-applied. SQL `20260929` not applied.

## Security review

- Public catalog queries unchanged; demo fixtures are in-memory only.
- Anonymous `/store/demo-preview` = DENY.
- Admin path re-checks `is_platform_admin` (DB), not JWT/env hints alone.
- Token path requires `STORE_DEMO_PREVIEW_TOKEN` length ≥ 16; compared via SHA-256 + `timingSafeEqual`.
- Enter route sets httpOnly, `SameSite=strict`, path-scoped cookie (8h). Cookie stores a hash, not the raw secret.
- Pages noindex; `robots.txt` disallows `/store/demo-preview`; sitemap does not list it; public nav does not link it.
- Checkout sandbox `allowed=false`. No payment processor.
- `STORE_DEMO_PREVIEW` stays unset on production public hosts.

## Tests

Pending re-run on this worktree after cherry-pick.

## TypeScript

Pending re-run on this worktree after cherry-pick.

## Build

Pending re-run on this worktree after cherry-pick.

## git diff --check

Pending after cherry-pick continue.

## git status --short

Cherry-pick in progress on `central/store-private-demo-preview-access-on-a085f667-v1`.

## Open issues

- Quality gates must pass on `a085f667` + access delta before any deploy.
- Do not deploy onto `722ed3e5`. Do not reset Learning enroll.
- Product Owner: `platform_admins` session → `/store/demo-preview`, or operator sets `STORE_DEMO_PREVIEW_TOKEN` (never commit).
