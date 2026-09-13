# UMTUBA_STORE_FULL_ARABIC_UI_AND_PRODUCT_DISPLAY_FIX_V1

Owner GO: complete Arabic Store preview (chrome + products) when application locale is `ar`, and when `?dir=rtl` forces Arabic/RTL.

Previous task `UMTUBA_STORE_ARABIC_DISPLAY_BINDING_FIX_V1` only bound product field selection to the request locale. Header, search, nav, filters, and rails stayed English.

See `docs/ai/CURSOR_REPORT.md` for the full handoff sections.

```text
TASK_ID = UMTUBA_STORE_FULL_ARABIC_UI_AND_PRODUCT_DISPLAY_FIX_V1
STATUS = COMPLETE
OWNER_CURRENT_COOKIE_LOCALE = UNKNOWN
RESOLVED_REQUEST_LOCALE = en when umtuba_locale is absent or en; ar when umtuba_locale=ar
ARABIC_UI_COMPLETE = YES
ARABIC_PRODUCT_TITLES_COMPLETE = YES
ARABIC_PRODUCT_DESCRIPTIONS_COMPLETE = YES
RTL_COMPLETE = YES
ENGLISH_UI_PRESERVED = YES
CATALOG_CHANGED = NO
DATABASE_CHANGED = NO
GEMINI_RERUN = NO
LIVE_DEPLOY = NO
NEXT_ACTION = OWNER_VISUAL_QA
```

## How the owner sets Arabic without ?dir=rtl

1. Open `http://127.0.0.1:3000/settings?section=language`
2. Choose **العربية** (persists `umtuba_locale=ar`)
3. Open `http://127.0.0.1:3000/sandbox/store/cj-launch?dept=HOME`

Temporary override: add `?dir=rtl` to any cj-launch URL.
