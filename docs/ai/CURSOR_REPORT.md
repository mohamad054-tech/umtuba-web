# CURSOR_REPORT — Full business sandbox experience V1

```text
SOURCE_DEVICE = CENTRAL / SERVER
DEVICE_ROLE = IMPLEMENTATION
TASK_ID = CENTRAL_FULL_BUSINESS_SANDBOX_EXPERIENCE_V1
REPORT_TYPE = IMPLEMENT
TIMESTAMP_LOCAL = 2026-08-18 ~20:20 +03
SECRET_VALUES_PRINTED = NO
FORCE_PUSH = NO
REMOTE_MIGRATION_APPLIED = NO
SQL_20260929_APPLIED = NO
SQL_20260930_REAPPLIED = NO
MOBILE_SOURCE_CHANGED = NO
STORE_DEMO_PREVIEW_SET = NO
PRIVATE_PREVIEW_DEPLOYED = NO
```

## Summary

Private Product Owner sandbox at `/sandbox/business-preview` on `central/full-business-sandbox-on-a085f667-v1` from live `a085f667`. Hub covers Learning (students, instructors, admin, originals, partner/external course kinds), Store (26 reused DEMO products, cart, mock checkout, orders, seller), prospective partners, commercial model, and rights. Access is platform admin or `SANDBOX_BUSINESS_PREVIEW_TOKEN` (enter cookie). Anonymous visitors are denied. No public nav. noindex + robots disallow `/sandbox`. Payments are mock buttons only. Prospective names stay PROSPECTIVE / NOT AN UMTUBA PARTNER. Not deployed (production mid-cutover / demo-preview cherry-pick in flight).

## Exact files changed

- `app/sandbox/business-preview/**` hub, sections, enter route
- `app/components/sandbox/**` shell, view, checkout, denied
- `lib/sandbox/**` access gate, fixtures, i18n, tests
- `app/lib/nav/routes.ts` (`sandboxBusinessPreview` only; not in primary nav)
- `app/lib/nav/secondarySurfaceContract.ts` forbids `/sandbox` in official chrome
- `lib/site/indexing.ts` + `lib/site/metadata.test.ts` robots disallow
- `vitest.config.ts` includes `lib/sandbox/**/*.test.ts`
- `docs/sandbox/BUSINESS_PREVIEW.md`
- `docs/ai/CURRENT_TASK.md`

## Migrations created

None. SQL `20260929` not applied. `20260930` not re-applied.

## Security review

- PUBLIC_ANONYMOUS_ACCESS=NO. Hidden URL is not sufficient; resolver checks `platform_admins` or hashed token/cookie.
- `STORE_DEMO_PREVIEW=1` and non-production NODE_ENV are not grants.
- Token never written into reports. Cookie is httpOnly, SameSite=strict, path-scoped.
- Demo products remain PURCHASABLE=NO. Checkout collects no card numbers.
- Prospective partners have UNKNOWN rights (effective DENY) and catalogImported=false.
- Originals stay DRAFT / not public catalog.
- No secrets, service-role keys, or .env contents.

## Tests

`npx vitest run lib/sandbox lib/site/metadata.test.ts app/lib/nav/secondarySurfaceContract.test.ts` — PASS (sandbox 25 + metadata 10 + nav 7).

## TypeScript

`npx tsc --noEmit` — PASS

## Build

`npm run build` — PASS. Routes include `/sandbox/business-preview`, `[...section]`, `/enter`.

## git diff --check

PASS after removing one trailing space in CURRENT_TASK.md.

## git status --short

Clean after intended commit of sandbox files only. `node_modules` / `.next` not committed.

## Open issues

- PRIVATE_PREVIEW_DEPLOYED=NO. Product Owner should review screen-by-screen before any production bind.
- Do not race Store demo-preview cherry-pick (`04cb5fae` onto `a085f667`) or reset live.
- Operator must use a platform admin session or set `SANDBOX_BUSINESS_PREVIEW_TOKEN` locally/staging only.
