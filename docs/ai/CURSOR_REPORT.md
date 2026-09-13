# Cursor Report — Approved web header production deploy V1

## Summary

Owner GO used. The accepted stacked header is live on production.

`HEADER_COMMIT_SHA` = `e95ed58d2b1180b2d016ee01bd3416eef8bbc85a`  
`BUILD_ID_AFTER` = `-UrnnYvUzUBs1URdHu5I1`  
`WEB_HEADER_PRODUCTION_INSTALLED` = YES  

Full return fields are in `D:\umtuba-central\reports\UMTUBA_CENTRAL_APPROVED_HEADER_PRODUCTION_DEPLOY_V1.md`.

## Exact files changed

- `app/components/AppTopNav.tsx`
- `app/components/brand/UmtubaStackedLogo.tsx`
- `app/globals.css`
- `lib/site/brand.ts`
- `lib/site/brandAssets.test.ts`

## Migrations created

None.

## Security review

Presentation-only. Host env sourced for `NEXT_PUBLIC` inlining; values not printed.

## Tests

`lib/site/brandAssets.test.ts` 7/7 PASS.

## TypeScript

`npx tsc --noEmit` PASS.

## Build

Host `npx next build` PASS.

## git diff --check

Not re-run after commit.

## git status --short

Pushed `origin/central/approved-header-production-deploy-v1`. Unrelated local dirt not deployed.

## Open issues

Stale-client Server Action ID mismatches after cutover. No first-party Home crash.
