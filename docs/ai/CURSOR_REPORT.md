# CURSOR_REPORT — Welcome beta label cleanup V1

```text
TASK_ID = PC2_UMTUBA_WELCOME_BETA_LABEL_CLEANUP_V1
STATUS = IMPLEMENTED_LOCAL_PREVIEW
BASE_COMMIT = 3dc06aacc2cbc12509144f7c1310f74c235a42ee
WORKTREE = C:/Users/Giga store/Desktop/umtuba/umtuba-web-official-logo-approved-video-v1
BRANCH = pc2/official-logo-from-approved-video-v1
LOCAL_PREVIEW = http://localhost:3010/welcome
PUSH = NO
MERGED = NO
DEPLOYED = NO
LOGO_CHANGED = NO
GLOBE_CHANGED = NO
PRODUCT_FUNCTIONALITY_CHANGED = NO
```

## Summary

Removed the visible Welcome beta/trial labels only: the Alpha 0.2 badge and Join Beta / Join the Beta CTAs. Logo, globe, and nav routes are unchanged. No replacement wording.

## Exact files changed

- `app/components/landing/LandingHero.tsx` — removed Alpha badge and Join Beta nav chip; nav links stay centered via `flex-1 justify-center`
- `app/welcome/page.tsx` — removed Join the Beta CTA
- `lib/site/welcomeBetaLabels.test.ts` — source assertions
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/PC2_UMTUBA_WELCOME_BETA_LABEL_CLEANUP_V1.md`
- this report

## Migrations created

None.

## Security review

- Copy-only Welcome chrome. No auth logic change. `JoinBetaLink.tsx` left unused (not deleted) so harden tests still see `tryCreateClient`.
- No secrets. Isolated worktree only.

## Tests

`npx vitest run lib/site/welcomeBetaLabels.test.ts lib/site/brandAssets.test.ts lib/site/metadata.test.ts`

PASS — 3 files, 18 tests.

## TypeScript

`npx tsc --noEmit` — PASS.

## Build

`npx next build` — PASS.

## git diff --check

PASS.

## git status --short

Brand/Welcome/docs only at handoff (before isolated commit).

## Open issues

- `JoinBetaLink.tsx` is unused after Welcome CTA removal (intentionally kept).
- `Beta Mission` heading remains (not in the owner remove list).
- Not pushed, not merged, not deployed.
