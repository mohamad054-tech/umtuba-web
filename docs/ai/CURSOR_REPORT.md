# CURSOR_REPORT — Surgical live web defects V1 2026-08-22

```text
TASK_ID = CENTRAL_WEB_VISIBLE_REGRESSIONS_AND_SOCIAL_RECOVERY_SURGICAL_V1
STATUS = VERIFIED_AND_DEPLOYED
START_PRODUCTION_SHA = 71f289cba6212c50db9f0f237ac1e145b2936dcc
FIX_COMMIT_SHA = 9f937e2ff7cd13c8cba5cebf94ea4e9f48dae3fc
FINAL_PRODUCTION_SHA = 9f937e2ff7cd13c8cba5cebf94ea4e9f48dae3fc
LIVE_RELEASE = 9f937e2f-20260821213212
TYPECHECK = PASS
TESTS = PASS
BUILD = PASS
PRODUCTION_DEPLOYED = YES
MOBILE_SOURCE_CHANGED = NO
NEXT_ACTION = WAIT_FOR_CENTRAL
```

## Summary

Live was already `71f289cb`. The 13-locale listbox still clipped inside overflow-hidden / backdrop-blur ancestors. Menu is now portaled with solid option colors. Arabic secondary raised to `#e9ecf4`. Cutover `71f289cb-20260821235319` → `9f937e2f-20260821213212`. Cookie locale matrix: all 13 switch. Settings remains guest 307. Browser MCP tabs vanish. Report: `D:\umtuba-central\reports\UMTUBA_CENTRAL_WEB_VISIBLE_REGRESSIONS_AND_SOCIAL_RECOVERY_SURGICAL_V1.md`.

## Exact files changed

- `app/components/i18n/LanguageSelector.tsx`
- `app/globals.css`
- `lib/i18n/languageSelector.test.ts`
- `lib/i18n/arabicReadability.test.ts`
- handoff docs

## Migrations created

NONE.

## Security review

No schema/RLS/secret changes.

## Tests

40 targeted PASS.

## TypeScript

PASS.

## Build

PASS. Host `BUILD_ID=H6o-TvVjJUpsrOHJ9Ph92`.

## git diff --check

PASS.

## git status --short

Clean on feature files after commit `9f937e2f`.

## Open issues

Browser MCP cannot screenshot the open listbox. Settings is auth-gated for guests.
