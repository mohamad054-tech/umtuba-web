# UMTUBA_STORE_ARABIC_DISPLAY_BINDING_FIX_V1

Owner GO applied. Minimal locale-binding fix from UMTUBA_STORE_ARABIC_DISPLAY_BINDING_AUDIT_V1.

See `docs/ai/CURSOR_REPORT.md` for the full handoff sections.

```text
TASK_ID = UMTUBA_STORE_ARABIC_DISPLAY_BINDING_FIX_V1
STATUS = COMPLETE
FILES_CHANGED = app/sandbox/store/cj-launch/page.tsx; app/sandbox/store/cj-launch/[slug]/page.tsx; lib/sandbox/cjLaunch/resolvePreviewLocale.ts; lib/sandbox/cjLaunch/resolvePreviewLocale.test.ts; docs/ai/tasks/UMTUBA_STORE_ARABIC_DISPLAY_BINDING_FIX_V1.md; docs/ai/CURSOR_REPORT.md
ROOT_CAUSE_FIXED = YES
ARABIC_COOKIE_LOCALE_WORKS = YES
ARABIC_TITLE_FIELD = localized.title_ar
ARABIC_DESCRIPTION_FIELD = localized.description_ar
ENGLISH_TITLE_FIELD = localized.title_en_clean
ENGLISH_DESCRIPTION_FIELD = localized.description_en_clean
RTL_OVERRIDE_PRESERVED = YES
ALL_VIEW_PASS = YES
FASHION_PASS = YES
HOME_PASS = YES
OTHER_CATEGORY_PASS = YES (PET)
PRODUCT_DETAIL_PASS = YES
CATALOG_SHA256_BEFORE = bee64499b82a957777020ebdb5e5e7626dc0b73f16ff8861abce2b9eb84d47c1
CATALOG_SHA256_AFTER = bee64499b82a957777020ebdb5e5e7626dc0b73f16ff8861abce2b9eb84d47c1
CATALOG_CHANGED = NO
DATABASE_CHANGED = NO
GEMINI_RERUN = NO
HOLD_DATA_CHANGED = NO
LIVE_DEPLOY = NO
TESTS = vitest lib/sandbox/cjLaunch/resolvePreviewLocale.test.ts PASS (6); publishable.test.ts PASS
DIFF_CHECK = PASS
BLOCKERS = Browser MCP tabs closed immediately; verification used HTTP probes on 127.0.0.1:3000 plus unit tests
NEXT_ACTION = OWNER_LOCAL_PREVIEW
```

## Binding

Listing and PDP call `resolveRequestLocale()`, then `resolveCjLaunchPreviewLocale()`.

- Request locale `ar` → overlay `title_ar` / `description_ar`, RTL, do not persist `dir=rtl`
- Any other request locale → `title_en_clean` / `description_en_clean`, LTR
- `?dir=rtl` → force `ar` / RTL and keep the query on in-page links

`customerOverlay.ts` was left unchanged. Title and description already map correctly once locale is `ar`.
