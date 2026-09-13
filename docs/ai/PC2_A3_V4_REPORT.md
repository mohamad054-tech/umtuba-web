# PC2-A3 Store + App Store Operator Closeout V4

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = STORE PRODUCTION CLOSE + APP STORE OPERATOR
TASK_ID = PC2_STORE_APPSTORE_FINAL_CLOSE_V4
DATE = 2026-08-15
MODE = STORE PRODUCTION CLOSE + APP STORE OPERATOR
COMMIT_CREATED = NO
PUSHED = NO
IOS_REBUILD = NOT_RUN
REUPLOAD_BUILD_3 = NOT_RUN
APP_STORE_REVIEW_SUBMIT = NOT_RUN
EXTERNAL_BETA = NOT_RUN
SECRET_VALUES_PRINTED = NO
CURSOR_REPORT_OVERWRITTEN = NO
CURRENT_TASK_OVERWRITTEN = NO
STORE_PRODUCT_FILES_MODIFIED = NO
DAD5EB5_PREMIUM_CHROME_REDONE = NO
ASSETLINKS_LEFT_UNCOMMITTED = YES
```

## Required return fields

```text
STORE_PRODUCTION_SHA = UNKNOWN_NOT_EXPOSED; NOT_B3C05D8
STORE_PRODUCTION_VERIFIED = NO
STORE_SANDBOX_STATE = PRODUCTION_CATEGORY_LEAK; DIRECT_SANDBOX_URLS_VISIBLE_404; SOURCE_CONTAINED_AT_B3C05D8
STORE_AUTH_CART = NOT_EXECUTED
STORE_AUTH_CHECKOUT = NOT_EXECUTED
STORE_ORDERS = NOT_EXECUTED
STORE_RESPONSIVE = UNAUTH_OVERFLOWX_0_AT_360_390_1024_1440
STORE_RTL_LTR = UNAUTH_BOTH_EXECUTED; NATIVE_AR_RTL + EN_LTR; ENGLISH_PUNCTUATION_RTL_RESIDUE
STORE_DEPLOY_REQUIRED = YES
APP_PRIVACY = NOT_VERIFIED_IN_ASC; SOURCE_MAP_READY_IN_APP_PRIVACY_MD
AGE_RATING = ASC_STILL_UGC_FALSE; MESSAGING_FALSE; ADVISORY_NOT_PATCHED; UNSAFE_TO_SUBMIT
APP_INFORMATION = ASC_PUSHED; TITLE_SUBTITLE_CATEGORIES_PRESENT
SCREENSHOTS = NOT_VERIFIED_IN_ASC; IPAD_13_STILL_REQUIRED_WHILE_SUPPORTS_TABLET_TRUE
DESCRIPTION_METADATA = ASC_PUSHED_AND_RE_PULLED
SUPPORT_PRIVACY_URLS = ASC_PUSHED_LIVE_200
REVIEW_INFO = ABSENT; REVIEWER_PASSWORD_NOT_INVENTED
ACCOUNT_DELETION = WEB_LIVE_200; ASC_DECLARATION_NOT_VERIFIED
UGC_APPSTORE = QUESTIONNAIRE_STILL_FALSE; PRODUCT_HAS_UGC_AND_MESSAGES
EXPORT_COMPLIANCE = BINARY_USES_NON_EXEMPT_ENCRYPTION_FALSE; ASC_CHECKBOX_NOT_SEEN; TF_NOT_BLOCKED
REMAINING_OPERATOR_INPUT = AGE_RATING_UGC_AND_MESSAGING_MUST_BE_YES
APP_STORE_METADATA_READY = PARTIAL_LISTING_PUSHED_NOT_REVIEW_READY
BLOCKERS = [PRODUCTION_NOT_ON_B3C05D8, PRODUCTION_SANDBOX_CATEGORY_LEAK, AUTH_SESSION_ABSENT, AGE_RATING_UGC_AND_MESSAGING_FALSE, APP_PRIVACY_NUTRITION_LABELS_NOT_VERIFIED, REVIEWER_ACCOUNT_NOT_SUPPLIED, REVIEW_CONTACT_ABSENT, SCREENSHOTS_NOT_VERIFIED_IN_ASC, IPAD_SCREENSHOTS_REQUIRED_WHILE_SUPPORTS_TABLET_TRUE]
```

---

## Summary

This V4 track verified **current** `https://umtuba.com` Store (2026-08-15, this session) and completed every App Store Connect operator item that can be done **without a replacement binary**.

Web HEAD is `b3c05d8d8d5d5ac0b397fe468a3160b952e1cfb2` (`feat(store): contain sandbox catalog and close storefront release gaps`), even with `origin/office/platform-translation-trunk-port-v1`. Store product files were not rebuilt. Uncommitted A3 assetlinks files (`lib/android/*`, `app/.well-known/assetlinks.json/route.ts`) were left on disk. `docs/ai/CURSOR_REPORT.md` was not overwritten. `dad5eb5` Premium chrome was not redone.

**SOURCE_READY ≠ PRODUCTION_VERIFIED.** Accepted Store source at `b3c05d8` is still **not** the live deploy. Production still merchandises `UMTUBA_E2E_20260721 Category` on `/store` and `/store/search`. Direct sandbox store/PDP URLs still render visible Next 404. Guest cart / checkout / orders / wishlist still redirect to login. No buyer credentials exist in repo/docs, so authenticated surfaces are **NOT_EXECUTED**.

App Store Connect listing was **partially patched** via `eas metadata:push` using the EAS-stored ASC API key (key not printed). Live-200 URLs and operator-packet listing copy were written. The age-rating `advisory` object was **omitted** so UGC/messaging were **not** re-asserted as false and were **not** invented as a full questionnaire. Re-pull confirmed listing fields landed and advisory is unchanged (`userGeneratedContent: false`, `messagingAndChat: false`). Temporary `store.config.json` was deleted after verify. **Do not Submit for Review.**

---

## 1. Git / source (this workspace)

```text
REPO = umtuba-web-translation-trunk-port-v1
BRANCH = office/platform-translation-trunk-port-v1
HEAD = b3c05d8d8d5d5ac0b397fe468a3160b952e1cfb2
UPSTREAM = origin/office/platform-translation-trunk-port-v1 @ b3c05d8
AHEAD = 0
BEHIND = 0
DIVERGENCE = NO
FF_ONLY_PULL = NOT_NEEDED
```

`git fetch --prune` ran. Fetch updated unrelated remotes (`alpha-0.2`, new `central/*` branches). Assigned branch was already even with origin. No commit, push, checkout, reset, stash, or clean.

Assetlinks left in place (uncommitted, not blocking the production Store probe):

- `lib/android/assetLinks.ts`
- `lib/android/assetLinks.test.ts`
- `app/.well-known/assetlinks.json/route.ts`

Live `https://umtuba.com/.well-known/assetlinks.json` is still **404**. AASA is still **200**.

---

## 2. Store — SOURCE_READY vs PRODUCTION_VERIFIED

| Class | State | Evidence |
| --- | --- | --- |
| **SOURCE_READY** | YES at `b3c05d8` | Prior A1 V2: 74/74 targeted tests, `tsc` PASS, `build` PASS, local `next start` hides E2E merchandising and 404s sandbox slugs. This V4 did **not** rebuild or re-run those suites. |
| **PRODUCTION_VERIFIED** | NO | Live `https://umtuba.com` still shows the E2E category chip; no in-stock filter control; catalog empty of product cards; auth purchase surfaces not executed. |
| **PRODUCTION SHA** | Unknown | Nginx HTML has no git SHA / Next `buildId` in the probed markup. Identity is behavioral: E2E category present + no In-stock fieldset ⇒ **not** `b3c05d8`. |

### Deploy dependency

Central must deploy **`b3c05d8`** (or a descendant that includes that Store commit) to `umtuba.com` / `www.umtuba.com`. Until then containment cannot become `PRODUCTION_FIXED`.

Remote E2E rows were not deleted (by design). Ops cleanup remains `scripts/store-e2e/cleanup-store-sandbox.sql` — not run here.

---

## 3. Current production Store probe (live NOW)

Method: HTTP HEAD/GET + Playwright Chromium against `https://umtuba.com` at 360 / 390 / 1024 / 1440. Artifacts: `worktrees/_pc2_a3_v4_qa/` (not Store product files). No local rebuild. No fabricated session.

### Landing `/store`

- HTTP **200**. Hero “Presence Commerce” / “UMTUBA STORE”. Empty state **“Catalog is quiet right now”**.
- Visible merchandising leak: category chip **`UMTUBA_E2E_20260721 Category`** / `umtuba-e2e-20260721` in home HTML and Playwright chips at 360/390/1024/1440.
- No product cards / no non-sandbox PDP hrefs (`REAL_PDP none`).
- `overflowX=0` at all probed widths.

### Catalog / search / filter

- `/store/search` HTTP **200**. Empty: **“No matches”** / **0 results**.
- Filter chips include **UMTUBA_E2E_20260721 Category**, Digital Products, Education & Courses, Software & Digital Tools, Books & Documents.
- `/store/search?availability=in_stock` HTTP 200. **In-stock control count = 0** (old deploy fingerprint; `b3c05d8` source adds this control).
- `/store/search?category=digital-products`: still 0 product hrefs; E2E chip remains in the filter list.
- `/store/search?category=umtuba-e2e-20260721`: E2E chip still present; 0 product cards (direct sandbox PDP already 404s).

### PDP

- Direct sandbox PDP `/store/umtuba-e2e-20260721/product/e2e-simple-mug`: HTTP 200, **visible `h1=404`**, title `404: This page could not be found.`
- Direct sandbox store `/store/umtuba-e2e-20260721`: same visible 404.
- **No real catalog PDP** could be opened: production home/search expose no non-sandbox product links. Do not mark PDP PASS.

### Favorites / cart / checkout / orders

| Surface | Guest production result |
| --- | --- |
| `/store/wishlist` | 307/redirect → `/login?next=/store/wishlist` |
| `/store/cart` | → `/login?next=/store/cart` |
| `/store/checkout` | → `/login?next=/store/checkout` |
| `/store/orders` | → `/login?next=/store/orders` |

Authenticated cart, checkout, orders, and signed-in favorites were **not** executed. Blocker: no buyer credentials in repo, task docs, or `REVIEWER_NOTES.md` (`REVIEWER_ACCESS_READY = NO`). Fabricating a session was refused.

`CartIconButton` source (unchanged this task) zeros the badge when `getUser()` is null and sends guests to login. Guest Playwright contexts showed Sign in, not a signed-in purchase flow.

### Sandbox / demo exposure

```text
SOURCE_FIXED = YES @ b3c05d8
PRODUCTION_FIXED = NO
PRODUCTION_LEAK = UMTUBA_E2E_20260721 Category still merchandised on /store and /store/search
PRODUCTION_DIRECT_SANDBOX_BODY = visible Next 404 (same as last probe)
```

### 1024 / mobile widths

Playwright `overflowX=0` at **360, 390, 1024, 1440** for `/store`, `/store/search`, sandbox 404s, login-gated purchase URLs, and forced `dir=rtl`. Gold store chrome present. 360 Arabic search still shows English-sentence punctuation leading (`.matches`, `.filters`) and tight header chrome — residual i18n/layout, **not** a `dad5eb5` redo.

### RTL / LTR

| Mode | Result |
| --- | --- |
| Native production (this PC locale) | `dir=rtl` `lang=ar`. Arabic chrome. `overflowX=0`. |
| Forced `dir=rtl` | `overflowX=0` at 360/390/1024/1440. |
| `Accept-Language: en-US` | `dir=ltr` `lang=en`. English “Sign in” / “Catalog is quiet right now”. `overflowX=0`. |

Not a full bilingual copy audit. English under RTL still flips sentence-final punctuation.

### Loading / error / empty

- **Empty:** home “Catalog is quiet right now”; search “No matches” + Clear/filters. Honest empty, not a fake catalog.
- **Error:** sandbox slugs → framework 404 UI. Search error chrome exists (`StoreErrorState` in source); not claimed as a production outage for the default All-category search (that path was empty, not a crash).
- **Loading:** “Updating…” pending copy exists in `b3c05d8` source; not captured mid-flight on production.

---

## 4. App Store Connect — operator items without a new binary

Read path: `npx eas-cli` 22.x, logged in as Expo owner of `@umtuba`. Commands used the **ASC API key already stored in the EAS credentials service**. No local `.p8`. No Apple env vars printed. Key material not printed.

Build 3 unchanged:

```text
BUNDLE = com.umtuba.app
VERSION = 1.0.0 (3)
ASC_APP = 6801665530
PROCESSING = VALID
INTERNAL_TF = IN_BETA_TESTING
EXTERNAL_TF = READY_FOR_BETA_SUBMISSION (not submitted)
APP_STORE_LIVE / IN_REVIEW / PENDING = none
ITUNES_LOOKUP resultCount = 0
TF_FEEDBACK = none
TF_CRASHES = none
```

### What was PATCHed (this session)

`eas metadata:lint` → valid. `eas metadata:push --non-interactive` against a **safe** `store.config.json` that **omitted `advisory` and `review`**.

EAS reported:

```text
Updated version info for 1.0
Updated localized version for en-US
Updated app categories
Updated localized info for en-US
Skipped age rating update, no advisory configured
Skipped store review details, not configured
```

Re-pull confirmed ASC now has:

| Field | Value now in ASC pull |
| --- | --- |
| title | UMTUBA |
| subtitle | Watch. Create. Belong. |
| description | Operator-packet short-video copy (honest: Live/Learning/Store not shipped on iOS) |
| keywords | watch, video, create, social, community, umtuba |
| promoText | Watch short videos and publish your own. Report and hide content you do not want to see. |
| privacyPolicyUrl | https://umtuba.com/privacy |
| supportUrl | https://umtuba.com/support |
| marketingUrl | https://umtuba.com |
| categories | SOCIAL_NETWORKING, ENTERTAINMENT |

Live URL HEAD this session (all **200**): `/privacy`, `/terms`, `/account-deletion`, `/support`, `/` (title Home). `APP_PRIVACY.md` / `REVIEWER_NOTES.md` still say `/support` is 404 — **stale**. Production `/support` is live (`Support \| UMTUBA`), so the pushed support URL is the live page, not the outdated doc fallback to `/privacy`.

Pulled `store.config.json` (contained UGC/messaging **false**) was **deleted** after verify so it cannot be accidentally re-pushed.

### What was intentionally not PATCHed

| Item | Why |
| --- | --- |
| Age rating / advisory | Current ASC still `userGeneratedContent: false`, `messagingAndChat: false`. Task forbids setting UGC=false. A full honest questionnaire also needs owner intensity calls (12+ vs 17+). Entire `advisory` omitted. |
| Review demo username/password | `REVIEWER_ACCESS_READY = NO`. Password not invented. |
| Review first/last/email/phone | No certain operator contact block in repo. Not invented. |
| App Privacy nutrition labels | Not in EAS metadata schema. Console not opened. |
| Screenshots | Not in EAS metadata schema. None fabricated. |
| Account-deletion ASC form | Not returned by metadata pull. Web page is live 200. |
| Content rights checkbox | Not in EAS metadata schema. |
| TestFlight “What to Test” | Not in EAS metadata schema. `eas testflight` = feedback/crashes only. |
| Submit for Review / External Beta | Forbidden. Listing still unsafe because age rating is false. |

### App Privacy (nutrition labels)

`APP_PRIVACY.md` is an evidence map, not a filed label. Tracking = No. Collect (linked, not tracking): email, user ID, user content, library photos/videos, messages if used, product interaction. No IAP / ads / precise location in that map.

**ASC nutrition labels remain NOT_VERIFIED.** Operator must paste from `umtuba-mobile/docs/app-store/APP_PRIVACY.md` in the App Privacy UI. This API path cannot see or set those answers.

### Age rating — remaining human field (the submit blocker)

Do **not** submit while these two answers stay false.

In App Store Connect → App Information → Age Rating:

1. **Does your app contain user-generated content?**  
   Current ASC: **NO / false**. Required honest answer: **YES**.  
   Evidence: users publish videos and captions (Create → Watch).
2. **Does your app contain messaging and chat?**  
   Current ASC: **NO / false**. Required honest answer: **YES**.  
   Evidence: Messages tab exists in the shipped binary.

Do not self-declare 4+. Owner still decides remaining intensity (unrestricted UGC ⇒ likely **12+ or 17+**). This task did not file those remaining answers.

### Screenshots

Plan exists (`SCREENSHOT_MATRIX.md`). iPhone **6.9"** required. iPad **13"** still required while `supportsTablet: true` (changing that flag is a **new binary** — not authorized). No screenshots were uploaded or verified in ASC this session.

### Review information / TestFlight metadata

Review block still absent from ASC pull. Suggested notes text is in `REVIEWER_NOTES.md` — paste only after a real reviewer email/password exists. TestFlight internal remains available; zero feedback/crashes. This track did not invite testers or open External Beta.

### Export compliance

iOS binary config: `usesNonExemptEncryption: false`. Internal TestFlight is not in `MISSING_EXPORT_COMPLIANCE`. The ASC build-level checkbox was **not** visible through EAS metadata. Do not invent a different answer.

### Account deletion

- Web: `https://umtuba.com/account-deletion` **200**.
- In-app path (source): Settings → Delete account opens that URL.
- ASC “account deletion information” form: **not verified** (not in EAS metadata pull).

---

## Exact files changed

Web (this task; uncommitted docs/QA only):

- `docs/ai/PC2_A3_V4_REPORT.md` (this file)
- `worktrees/_pc2_a3_v4_qa_probe.cjs`
- `worktrees/_pc2_a3_v4_followup.cjs`
- `worktrees/_pc2_a3_v4_qa/*` (screenshots + `report.json` + `followup.json` + submit status snapshot)

Store product files: **none**. Assetlinks: **left as-is**. `CURSOR_REPORT.md` / `CURRENT_TASK.md`: **not overwritten**.

Mobile: temporary `store.config.json` created for lint/push/pull, then **deleted**. No lasting mobile product edit. No iOS rebuild.

## Migrations created

None.

## Security review

- No secrets, `.env`, Apple `.p8`, EAS tokens, or reviewer passwords printed or invented.
- ASC API key used only via EAS credentials service.
- Age-rating false answers were not pushed.
- App Review was not submitted.
- Guest Store routes still login-gate; no auth bypass attempted.
- Production E2E rows not deleted.

## Tests

Not re-run. No Store/TypeScript product change this task. Prior A1 V2 bar (74/74, tsc, build) is unchanged source state at `b3c05d8`.

## TypeScript

Not run (no TypeScript change in this workspace).

## Build

Not run. Store UI/entry points not changed. iOS rebuild forbidden.

## git diff --check

Not required for product files (none edited). This report is markdown-only.

## git status --short (owned / relevant)

```text
HEAD b3c05d8 (even with origin)
?? docs/ai/PC2_A3_V4_REPORT.md
?? worktrees/_pc2_a3_v4_qa_probe.cjs
?? worktrees/_pc2_a3_v4_followup.cjs
?? worktrees/_pc2_a3_v4_qa/
?? lib/android/                    (pre-existing A3; left)
?? app/.well-known/assetlinks.json/ (pre-existing A3; left)
```

Sibling dirty/untracked docs, vitest logs, and visual-QA worktrees were not owned by this task.

## Open issues

1. **Production is not `b3c05d8`.** E2E category still merchandised. `STORE_DEPLOY_REQUIRED = YES`.
2. **AUTH_* = NOT_EXECUTED.** Need a real buyer session for cart, checkout, orders, favorites, and a real PDP (catalog currently has 0 product cards).
3. **Age rating still UGC=false / messaging=false.** Unsafe to submit. This is the remaining operator field that blocks App Review.
4. App Privacy nutrition labels, review contact, reviewer login, and screenshots still need the ASC console / a real account / device captures.
5. iPad 13" screenshots remain required while `supportsTablet: true`.
6. Production `assetlinks.json` still 404 (source-only; fingerprint still must not be invented).

## What this task did / did not do

| Action | Status |
| --- | --- |
| Confirm HEAD `b3c05d8` | DONE |
| Leave assetlinks uncommitted | DONE |
| Probe live production Store now | DONE |
| Distinguish SOURCE vs PRODUCTION | DONE |
| Authenticated cart/checkout/orders | NOT_EXECUTED (no credentials) |
| Redo Premium chrome | NO |
| Rebuild Store / iOS / re-upload build 3 | NO |
| PATCH ASC listing URLs + copy + categories | DONE |
| PATCH age rating | NO (omitted; still false) |
| Invent reviewer password | NO |
| Submit App Review / External Beta | NO |
| Overwrite CURSOR_REPORT.md | NO |

---

## Machine-readable close

```text
TASK_ID = PC2_STORE_APPSTORE_FINAL_CLOSE_V4
STORE_PRODUCTION_SHA = UNKNOWN_NOT_EXPOSED; NOT_B3C05D8
STORE_PRODUCTION_VERIFIED = NO
STORE_SANDBOX_STATE = PRODUCTION_CATEGORY_LEAK; DIRECT_SANDBOX_URLS_VISIBLE_404; SOURCE_CONTAINED_AT_B3C05D8
STORE_AUTH_CART = NOT_EXECUTED
STORE_AUTH_CHECKOUT = NOT_EXECUTED
STORE_ORDERS = NOT_EXECUTED
STORE_RESPONSIVE = UNAUTH_OVERFLOWX_0_AT_360_390_1024_1440
STORE_RTL_LTR = UNAUTH_BOTH_EXECUTED; NATIVE_AR_RTL + EN_LTR; ENGLISH_PUNCTUATION_RTL_RESIDUE
STORE_DEPLOY_REQUIRED = YES
APP_PRIVACY = NOT_VERIFIED_IN_ASC; SOURCE_MAP_READY_IN_APP_PRIVACY_MD
AGE_RATING = ASC_STILL_UGC_FALSE; MESSAGING_FALSE; ADVISORY_NOT_PATCHED; UNSAFE_TO_SUBMIT
APP_INFORMATION = ASC_PUSHED; TITLE_SUBTITLE_CATEGORIES_PRESENT
SCREENSHOTS = NOT_VERIFIED_IN_ASC; IPAD_13_STILL_REQUIRED_WHILE_SUPPORTS_TABLET_TRUE
DESCRIPTION_METADATA = ASC_PUSHED_AND_RE_PULLED
SUPPORT_PRIVACY_URLS = ASC_PUSHED_LIVE_200
REVIEW_INFO = ABSENT; REVIEWER_PASSWORD_NOT_INVENTED
ACCOUNT_DELETION = WEB_LIVE_200; ASC_DECLARATION_NOT_VERIFIED
UGC_APPSTORE = QUESTIONNAIRE_STILL_FALSE; PRODUCT_HAS_UGC_AND_MESSAGES
EXPORT_COMPLIANCE = BINARY_USES_NON_EXEMPT_ENCRYPTION_FALSE; ASC_CHECKBOX_NOT_SEEN; TF_NOT_BLOCKED
REMAINING_OPERATOR_INPUT = AGE_RATING_UGC_AND_MESSAGING_MUST_BE_YES
APP_STORE_METADATA_READY = PARTIAL_LISTING_PUSHED_NOT_REVIEW_READY
BLOCKERS = [PRODUCTION_NOT_ON_B3C05D8, PRODUCTION_SANDBOX_CATEGORY_LEAK, AUTH_SESSION_ABSENT, AGE_RATING_UGC_AND_MESSAGING_FALSE, APP_PRIVACY_NUTRITION_LABELS_NOT_VERIFIED, REVIEWER_ACCOUNT_NOT_SUPPLIED, REVIEW_CONTACT_ABSENT, SCREENSHOTS_NOT_VERIFIED_IN_ASC, IPAD_SCREENSHOTS_REQUIRED_WHILE_SUPPORTS_TABLET_TRUE]
COMMIT = NO
PUSH = NO
APP_STORE_SUBMITTED = NO
STATUS = COMPLETE_WITH_BLOCKERS
```

END PC2_STORE_APPSTORE_FINAL_CLOSE_V4
