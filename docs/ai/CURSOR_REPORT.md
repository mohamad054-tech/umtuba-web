# CURSOR_REPORT — Surgical live web defects V1 2026-08-22

```text
TASK_ID = CENTRAL_WEB_VISIBLE_REGRESSIONS_AND_SOCIAL_RECOVERY_SURGICAL_V1
STATUS = SOURCE_READY_PENDING_DEPLOY
START_PRODUCTION_SHA = 71f289cba6212c50db9f0f237ac1e145b2936dcc
START_LIVE_RELEASE = 71f289cb-20260821235319
WEB_BRANCH = central/web-visible-regressions-surgical-v1
WEB_WORKTREE = D:\umtuba-central\repos\umtuba-web-visible-regressions-surgical-v1
MOBILE_SOURCE_CHANGED = NO
```

## Summary

Live `BUILD_ID=rCelyWLoOrXaSjv2MWSne` matches `71f289cb`. The 13-locale listbox was deployed, but it stayed inside overflow-hidden / backdrop-blur ancestors so RTL users still saw العربية plus a blank sheet. Menu is now portaled to `document.body` with solid option colors. Arabic secondary ink raised (`#e9ecf4`) with weight 600. Facebook-style Profile is already live at `/profile` (`9ffc49d1` ancestor of production). Home not replaced. Full report: `D:\umtuba-central\reports\UMTUBA_CENTRAL_WEB_VISIBLE_REGRESSIONS_AND_SOCIAL_RECOVERY_SURGICAL_V1.md`.

## Exact files changed

- `app/components/i18n/LanguageSelector.tsx`
- `app/globals.css`
- `lib/i18n/languageSelector.test.ts`
- `lib/i18n/arabicReadability.test.ts`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

NONE.

## Security review

No schema, RLS, or secret changes. Locale cookie persist path unchanged.

## Tests

40 targeted PASS (`languageSelector`, `arabicReadability`, `i18nFoundation`, `shellCoherence`).

## TypeScript

PASS (`tsc --noEmit` via build).

## Build

PASS. Local `BUILD_ID=YPFjoWRPhzG10dO9LH1XS`.

## git diff --check

PASS.

## git status --short

See commit.

## Open issues

Live proof + production cutover still required after this source commit. Browser MCP tabs vanish on this host.
