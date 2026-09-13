# DESKTOP_A2_PLAY_STORE_ASSETS_FINISH_V1

**DEVICE:** DESKTOP-A2  
**DEVICE_ROLE:** GOOGLE_PLAY_ASSET_PACKAGE / NON_BINARY_LISTING  
**WAVE_ID:** DESKTOP_ANDROID_V5_BUILD_AND_PLAY_PREP_V6  
**MODE:** EVIDENCE_ONLY / LOCAL_PACKAGE_FINISH / NO_CONSOLE_WRITE / NO_AAB_UPLOAD / NO_PRODUCTION_APPLY / NO_MOBILE_SOURCE_EDIT  
**DATE:** 2026-08-14 (~19:15)  
**TASK_ID:** DESKTOP_A2_PLAY_STORE_ASSETS_FINISH_V1  
**PACKAGE:** `com.umtuba.app`  
**VERSION_NAME:** `1.0.0`  
**PLAY_BINARY_ON_STORE:** versionCode **3** (Internal Testing CORE published). versionCode **4** AAB exists locally and is **not** the final candidate / **not** uploaded. versionCode **5** is **not** built. Do not assume v5 is live.  
**WEB:** `C:\Users\1\Desktop\umtuba\umtuba-web`  
**MOBILE (read-only; A1 owns product / v5 source / GO / build):** `C:\Users\1\Desktop\umtuba\umtuba-mobile`

Start from V2 (`DESKTOP_A2_PLAY_ASSETS_FINAL_PRODUCTION_PACKAGE_V2`). Do not redo the 512 icon or feature graphic from zero. Finish everything that does **not** require an AAB upload. Where Console is inaccessible, confirm local package completeness and leave an operator upload checklist. Do not claim Play-saved unless saved.

Play Console was **not** writable from this session (browser MCP: tabs empty; `browser_tabs` new created a tab that vanished; `browser_navigate` to `https://play.google.com/console` failed twice with “No browser tab available”). No Console field was saved. No graphic was uploaded. Cards below remain a **local package + paste-ready text**. Paste-ready is not saved.

No secrets. Tester addresses are not reproduced. Reviewer password is not printed. Mobile product files, `versionCode`, `eas.json`, patches, A1 working tree, and `v5-source-deposit` were not edited. No AAB was built or uploaded. `CURRENT_TASK.md` was not overwritten. Nothing was written to the Windows Desktop. `_port_extract` was not touched.

Local package: `docs/ops/closeout/play-assets/`

---

## DESKTOP-A2 REPORT

```
DESKTOP-A2 REPORT
TASK_ID = DESKTOP_A2_PLAY_STORE_ASSETS_FINISH_V1
ICON = YES / LOCAL_PLAY_SPEC / NOT_UPLOADED
FEATURE_GRAPHIC = YES / LOCAL_PLAY_SPEC / NOT_UPLOADED
LISTING = TEXT_PASTE_READY_V3_SAFE / NOT_SAVED / GRAPHICS_NOT_UPLOADED
SCREENSHOTS = NO / PHONE_MISSING / TABLET_MISSING / NOT_FABRICATED
ADS = YES / PASTE_READY_NO_ADS / NOT_SAVED
IARC = YES / PASTE_READY_HONEST_V3 / NOT_SAVED
UGC_DECLARATIONS = YES / PASTE_READY_HONEST_NO_FOR_V3 / NOT_SAVED
COUNTRIES = YES / CT_ALL_AVAILABLE_OPERATOR / PRODUCTION_NOT_OCR / PASTE_READY
CONTACT = YES / PASTE_READY / NOT_OCR / NOT_SAVED
APP_SIGNING = NO / OCR_REQUIRED / EAS_UPLOAD_KEY_EXISTS_DO_NOT_ROTATE
PLAY_NON_BINARY_READY = NO
OPERATOR_ITEMS = (1) upload icon-512x512.png; (2) upload feature-graphic-1024x500.png; (3) capture >=2 real Internal Testing v3 phone screenshots (Watch/Discover/Create/Messages; no mock Safety); (4) tablet only if Console marks required; (5) save Ads = No; (6) save IARC honest v3 (moderation NO); (7) save listing short+full from this package (no Safety claims); (8) save category Social + website https://umtuba.com + existing developer contact; (9) confirm/paste account-deletion URL if card still open; (10) save UGC honest NO if form allows; (11) News/COVID/Government/Financial/Health = NO; (12) OCR App Signing — do not generate a new upload key; (13) confirm Closed Testing countries remain all-available; (14) TA remainder only — do not change ages. Do not upload v4/v5. Do not Apply for production.
```

Qualifier (do not collapse): every **YES** above means **local package / paste-ready / live URL verified this session**. None of those YES values mean saved or uploaded to Play. Console was not writable. `SCREENSHOTS = NO` because no real Internal Testing v3 captures exist; capture plan is in the package. `APP_SIGNING = NO` — enrollment never OCR’d; do not generate a new upload key. `PLAY_NON_BINARY_READY = NO` until the operator uploads the local 512 icon + feature graphic, captures ≥2 real v3 phone screenshots, saves the paste-ready cards, and OCRs App Signing.

---

## Verdict

| Field | Result |
|-------|--------|
| PLAY_BINARY | **v3** on Play. v4 local only (`37dde25f`) and **not** final (own-delete absent from that AAB). v5 **not built**. |
| CONSOLE_WRITABLE_THIS_SESSION | **NO** (browser MCP: no usable tab; Console navigate failed) |
| GOOGLE_PLAY_MUTATED | **NO** |
| ANY_CARD_SAVED_THIS_SESSION | **NO** |
| ANY_GRAPHIC_UPLOADED_THIS_SESSION | **NO** |
| V4_UPLOADED | **NO** (forbidden) |
| V5_UPLOADED | **NO** (does not exist; forbidden) |
| APPLY_FOR_PRODUCTION | **NOT DONE** (forbidden) |
| AAB_BUILT | **NO** |
| MOBILE_SOURCE_TOUCHED | **NO** |
| CURRENT_TASK_WRITTEN | **NO** |
| DATA_SAFETY_REOPENED | **NO** |
| APP_ACCESS_REOPENED | **NO** |
| PLAY_NON_BINARY_READY | **NO** |
| ANDROID_PRODUCTION_RELEASE_READY | **NO** |
| LOCAL_PACKAGE_COMPLETE_WITHOUT_SCREENSHOTS_AND_OCR | **YES** |

A false YES on report / block / Terms-before-publish / in-app delete while **v3** is the Play binary is a policy violation. Listing text in this package does **not** claim Safety tools.

`PLAY_NON_BINARY_READY = NO` because this session could not save Console cards, phone screenshots are still missing, and App Signing was not OCR’d. The V2 512 icon and feature graphic remain **Play-spec locally** (re-measured this session). Paste-ready Ads / IARC / UGC / listing / contact / deletion / countries / content declarations / TA remainder / App Signing confirm card are **in-repo**. Paste-ready is not saved to Play.

---

## 0 — Delta vs V2 (do not redo from zero)

| V2 finding | This finish session |
|------------|---------------------|
| `ICON_512_READY = YES` local 512×512 | **Confirmed.** Same bytes / SHA256. Not re-exported. **Not uploaded.** |
| `FEATURE_GRAPHIC_READY = YES` local 1024×500 24-bit | **Confirmed.** Same bytes / SHA256. **Not uploaded.** |
| Short / full description paste-ready | **Unchanged.** Still **NOT_SAVED.** |
| Privacy + account-deletion HTTP 200 | **Re-verified this session** (HEAD 200). Terms + website also HEAD 200. |
| Ads / IARC / UGC paste-ready honest v3 | **Unchanged.** Still **NOT_SAVED.** |
| `PHONE_SCREENSHOTS_READY = NO` | **Still NO.** Re-hunted. No PNG/JPEG screenshots in web closeout or mobile `release-artifacts`. Not fabricated. |
| `TABLET_SCREENSHOTS_READY = NO` | **Still NO.** Not fabricated. |
| `APP_SIGNING_READY = NO` | **Still NO.** Confirm card written. Enrollment not OCR’d. EAS upload key exists — do not rotate. |
| `STORE_LISTING_READY = NO` | **Still NO.** Text ready; graphics not uploaded; screenshots missing. |
| `PLAY_NON_BINARY_READY = NO` | **Still NO.** Console inaccessible. |
| Console not writable | **Unchanged.** Browser MCP could not open Console. |
| Countries / App Signing / News-COVID / TA remainder / operator checklist as standalone files | **Added** under `play-assets/` so the operator has a one-folder kit. |

V2 closed the 512-icon gap and flattened the feature graphic. This session **did not regenerate** those files. It re-measured them, re-verified live URLs, completed the remaining paste-ready cards, and wrote the operator upload checklist.

---

## 1 — Scope vs prior packets (do not reopen completed work)

| Item | Status | This wave |
|------|--------|-----------|
| App Access / login details | **COMPLETE** | **Do not reopen.** |
| Reviewer instructions | **ENTERED** with App Access (v3-honest) | **Do not paste** local v4 `REVIEWER_INSTRUCTIONS.txt`. |
| Data Safety | **COMPLETE / SAVED** (operator 2026-08-13) | **Do not reopen.** |
| Target ages | **13–15 / 16–17 / 18+** | **Do not change.** Do not select under-13. Do not switch to 18+ only. Remainder paste-ready in `PASTE_TARGET_AUDIENCE_REMAINDER.txt`. |
| Account deletion URL | `https://umtuba.com/account-deletion` live HTTP **200** this session | **Do not tell the operator the URL is missing.** Do not paste `/privacy` or `/`. |
| Privacy policy URL | `https://umtuba.com/privacy` live HTTP **200** this session / operator-set | **Do not change.** |
| Internal Testing CORE | **CLOSED / PASS** on v3 | Does **not** count toward 12/14. |
| Closed Testing countries | All available selected (operator 2026-08-13) | Confirm only. Paste card added. |
| UGC Play declarations | Honest **NO** for v3 | Do not save YES until a **verified** UGC+own-delete binary is on Play. |
| v4 AAB | Local; not final; not uploaded | **Do not upload.** |
| v5 AAB | **Not built** | **Do not assume live. Do not upload. Do not build.** |
| A1 v5 source / deposit / GO / build | Concurrent; A1 owns | **Do not touch.** `CURRENT_TASK.md` not overwritten. |

---

## 2 — Truthful current app behavior (v3 on Play)

Unchanged from V2. Play binary is still versionCode **3**.

| Surface | v3 on Play now |
|---------|----------------|
| Watch / Discover / Create / Messages | YES (Internal Testing CORE PASS) |
| Live | INTENTIONALLY_UNAVAILABLE |
| Ads / AdMob | **NO** |
| In-app report content / users | **NO** |
| In-app block | **NO** |
| Terms before Create publish | **NO** |
| In-app account-delete link | **NO** |
| Web account deletion | **YES** — live URL |

Local v4 packets under `umtuba-mobile/release-artifacts/store-listing/` remain **v4 YES drafts**. **Do not paste them** while v3 is the Play binary. `GRAPHICS_STATUS.txt` still lists Watch **with Report visible** / Create **Terms checkbox** — that is a **v4** list. **Do not use.**

---

## 3 — Live URL re-verify (read-only, this session)

Fetched 2026-08-14 ~19:15. No login. No form submit. Play Console was not opened.

| URL | This session | Notes |
|-----|--------------|-------|
| `https://umtuba.com/account-deletion` | **LIVE** — HTTP HEAD **200**. Page retrieved; title “Delete your UMTUBA account \| UMTUBA” | Sign-in required to submit. Queues a request. Not immediate `deleteUser`. |
| `https://umtuba.com/privacy` | **LIVE** — HTTP HEAD **200**. Page retrieved | Documents `/account-deletion` as the erasure page. Children-and-teens: not directed at children too young for social platforms. |
| `https://umtuba.com/terms` | **LIVE** — HTTP HEAD **200** | Eligibility / community rules. Points to `/account-deletion`. |
| `https://umtuba.com` | **LIVE** — HTTP HEAD **200** | Website / store contact. |

`ACCOUNT_DELETION_URL_PUBLICLY_REACHABLE = YES`  
`PRIVACY_POLICY_URL_PUBLICLY_REACHABLE = YES`  
Do **not** paste `https://umtuba.com/privacy` or `https://umtuba.com` into the Play deletion field.

Play User Data ([13327111](https://support.google.com/googleplay/android-developer/answer/13327111)): web deletion resource = **SATISFIED**. In-app path in the **current Play binary (v3)** = **NO**.

---

## 4 — Icon 512×512 (not re-exported)

Official: exactly **512 × 512**, 32-bit PNG with alpha, max 1024 KB, full square (Play applies the mask). No ranking badges.

| File | This-session measurement |
|------|--------------------------|
| `docs/ops/closeout/play-assets/icon-512x512.png` | **512×512**, PNG color_type **6** (RGBA), 78796 bytes, SHA256 `9e3d0315a33c6799de601dd34cd8bf8cc3a8d16f3bf75592baec2ceb7240b391`. Matches V2 and `checksums.sha256`. Play spec **PASS**. **Not uploaded.** |
| Uploaded to Console this session | **NO** |

`ICON = YES` (local Play-spec file; **NOT_UPLOADED**).

Do not invent a new mark. Do not upload the 1024 grid file as the hi-res icon. Do not add rounded corners or outer drop shadows.

---

## 5 — Feature graphic (not re-exported)

Official: JPEG or 24-bit PNG (**no alpha**), exactly **1024 × 500**. Required to publish a store listing.

| File | This-session measurement |
|------|--------------------------|
| `docs/ops/closeout/play-assets/feature-graphic-1024x500.png` | **1024×500**, PNG color_type **2** (RGB, no alpha), 86710 bytes, SHA256 `bc380a16ca86a883530db0a0fc3efa669866a2f89866146f0ba988ac5ac6c1da`. Matches V2. Play spec **PASS**. **Not uploaded.** |

`FEATURE_GRAPHIC = YES` (local Play-spec file; **NOT_UPLOADED**).

---

## 6 — Phone and tablet screenshots

Official: minimum **two** screenshots across device types to publish a listing. JPEG or 24-bit PNG (no alpha). Each side 320–3840 px; longest side ≤ 2× shortest. Phone is the listing-complete gate. 7-inch / 10-inch: official text is **you can add** (not a hard publish requirement unless Console marks those slots required). App is not Wear / TV / Auto / XR.

| Hunt this session | Result |
|-------------------|--------|
| `docs/ops/closeout/play-assets/` | Icon + feature graphic only. **No** screenshot PNG/JPEG. |
| `docs/ops/closeout` `*.{png,jpg,jpeg}` | **Only** the two Play graphics above. |
| `umtuba-mobile/release-artifacts/store-listing` | Text packets only (11 files). **No** screenshot images. `GRAPHICS_STATUS.txt` is a **v4** capture list — **do not use.** |
| Name-match `*screenshot*` under mobile | **0** files. |
| Internal Testing v3 closeout | Device QA **PASS**; **no** stored screenshot files. |

`SCREENSHOTS = NO`  
`PHONE_SCREENSHOTS_READY = NO`  
`TABLET_SCREENSHOTS_READY = NO`  
`FABRICATED = NO`

**Do not fabricate. Do not mock UGC Safety / Report / Block / Terms / Delete-account UI.** Those controls are **not** in the Play binary (v3).

Capture plan remains `play-assets/PHONE_SCREENSHOT_CAPTURE_PLAN.txt`. Promo video: **NONE**. Do not invent a YouTube URL.

---

## 7 — Listing copy (v3-safe; not saved)

`LISTING = TEXT_PASTE_READY_V3_SAFE / NOT_SAVED / GRAPHICS_NOT_UPLOADED`

App name: `UMTUBA`

Short description (**66 / 80**) — `PASTE_SHORT_DESCRIPTION.txt`:

```
Watch, create, and message on UMTUBA. Social video for talent 13+.
```

Full description — `PASTE_FULL_DESCRIPTION.txt` — no Safety / report / block sentence. Does **not** claim Live, Store, Learning, Games, AI Companion, or in-app Safety tools.

Listing is **not** complete until 512 icon + feature graphic + ≥2 real v3 phone screenshots are **uploaded**.

---

## 8 — Privacy, support/contact, account deletion, countries, app signing

| Item | Evidence this session | Status |
|------|----------------------|--------|
| Privacy policy | `https://umtuba.com/privacy` HTTP HEAD **200**. Operator-set. | **YES** / URL_LIVE / DO_NOT_CHANGE / NOT claimed re-saved |
| Website | `https://umtuba.com` HTTP HEAD **200** | Paste-ready |
| Store contact email | Existing Play **developer-account** contact only. Do not invent `support@`. Do not use the Play reviewer mailbox. | **CONTACT = YES** / PASTE_READY / NOT_OCR / NOT_SAVED |
| Phone | Blank unless Console requires | Paste-ready |
| Category | Social | Paste-ready (`PASTE_SUPPORT_CONTACT.txt`) |
| Account deletion | `https://umtuba.com/account-deletion` HTTP HEAD **200**. In-app v3 = **NO**. | **YES** / URL_LIVE / PASTE_READY / CARD_SAVE_NOT_OCR |
| Closed Testing countries | All available selected (operator 2026-08-13). Confirm card written. | **COUNTRIES = YES** / CT_ALL_AVAILABLE_OPERATOR / PRODUCTION_NOT_OCR / PASTE_READY |
| Production countries | Not OCR’d | Confirm same all-available set when the field appears. Do not invent a restricted set. Do not create a Production track from this card. |
| App signing | v3 used existing EAS upload keystore (`SIGNING_CREDENTIALS_CHANGED = NO`; remote id `p6De1DDtE_`). Enrollment never captured locally. Console not opened. | **APP_SIGNING = NO** / OCR_REQUIRED. Confirm only (`PASTE_APP_SIGNING.txt`). **Do not generate a new upload key.** EAS `SIGNING_READY = YES` is **not** Play enrollment OCR. |

---

## 9 — Ads / IARC / UGC (honest for v3)

| Field | Result |
|-------|--------|
| ADS | **YES** / PASTE_READY_NO_ADS / **NOT_SAVED** |
| Exact Ads option | **No, my app does not contain ads** |
| IARC | **YES** / PASTE_READY_HONEST_V3 / **NOT_SAVED** (moderation = **NO**) |
| IARC category | Social Networking (or Social / Communication — not Game, not Utility) |
| IARC first-party violence / sexual / language / drugs / gambling / horror as featured product | **NO** |
| IARC users interact / share videos / unrestricted internet / public UGC / public profile | **YES** |
| IARC location share / IAP | **NO** |
| IARC in-app moderation (report / block) | **NO** for the current Play binary |
| UGC_DECLARATIONS | **YES** / PASTE_READY_HONEST_NO_FOR_V3 / **NOT_SAVED** |
| UGC present / public / 1:1 | **YES** |
| UGC report content / report users / block / Terms-before-publish | **NO** |

Save UGC YES **only** after a **verified** UGC + own-delete binary is the Play review binary. Central apply of `20260928` is backend, not a Play binary. Uncommitted v5 source is not a Play binary.

News / COVID / Government / Financial / Health = **NO** — `PASTE_CONTENT_DECLARATIONS.txt`.

---

## 10 — Console write this session

| Action | Result |
|--------|--------|
| Play Console opened | **NO** (browser MCP: no usable tab; navigate failed) |
| Any Console field saved | **NO** |
| Graphics uploaded | **NO** |
| v4 / v5 uploaded | **NO** |
| Apply for production | **NOT DONE** |

`GOOGLE_PLAY_MUTATED = NO`  
`CONSOLE_WRITABLE_THIS_SESSION = NO`

---

## 11 — Local package inventory (complete without screenshots / OCR)

All under `docs/ops/closeout/play-assets/` (web repo; not Windows Desktop):

| File | Purpose | Origin |
|------|---------|--------|
| `icon-512x512.png` | Play hi-res icon. SHA256 `9e3d0315a33c6799de601dd34cd8bf8cc3a8d16f3bf75592baec2ceb7240b391` | V2 (re-measured) |
| `feature-graphic-1024x500.png` | Play feature graphic (24-bit, no alpha). SHA256 `bc380a16ca86a883530db0a0fc3efa669866a2f89866146f0ba988ac5ac6c1da` | V2 (re-measured) |
| `checksums.sha256` | Hashes of the two graphics | V2 (re-matched) |
| `_inspect.json` | Measurement + URL evidence | Updated this session |
| `MANIFEST.md` | Operator index | Updated this session |
| `PASTE_ADS.txt` | Ads = No | V2 |
| `PASTE_IARC.txt` | Honest v3 questionnaire | V2 |
| `PASTE_SHORT_DESCRIPTION.txt` | 66/80 | V2 |
| `PASTE_FULL_DESCRIPTION.txt` | v3-safe; no Safety sentence | V2 |
| `PASTE_UGC.txt` | Honest NO for report/block/terms | V2 |
| `PASTE_ACCOUNT_DELETION.txt` | Exact URL | V2 |
| `PASTE_SUPPORT_CONTACT.txt` | Website + existing developer email | V2 |
| `PHONE_SCREENSHOT_CAPTURE_PLAN.txt` | v3 Watch/Discover/Create/Messages; no mock Safety | V2 |
| `PASTE_COUNTRIES.txt` | CT all-available confirm | **This session** |
| `PASTE_APP_SIGNING.txt` | Enrollment OCR card; do not rotate | **This session** |
| `PASTE_CONTENT_DECLARATIONS.txt` | News/COVID/Gov/Financial/Health = NO | **This session** |
| `PASTE_TARGET_AUDIENCE_REMAINDER.txt` | Remainder only; ages unchanged | **This session** |
| `OPERATOR_UPLOAD_CHECKLIST.txt` | Operator steps | **This session** |

`LOCAL_PACKAGE_COMPLETE_WITHOUT_SCREENSHOTS_AND_OCR = YES`

---

## 12 — Operator actions still required (no AAB, no Apply)

See `play-assets/OPERATOR_UPLOAD_CHECKLIST.txt`.

1. Upload `play-assets/icon-512x512.png` to Main store listing → Hi-res icon.  
2. Upload `play-assets/feature-graphic-1024x500.png` to Feature graphic.  
3. Capture ≥2 (recommended 4) real-device **Internal Testing v3** phone screenshots: Watch / Discover / Create / Messages. **No mock Safety UI.**  
4. Tablet shots only if Console marks 7-inch/10-inch required.  
5. Save Ads = No.  
6. Save IARC honest v3 (moderation NO).  
7. Save listing short + full text from this package (no Safety claims).  
8. Save category Social + website `https://umtuba.com` + existing developer contact email.  
9. Confirm / paste account deletion URL `https://umtuba.com/account-deletion` if that card is still open.  
10. Save UGC honest NO if the form allows.  
11. News / COVID / Government / Financial / Health = NO if still shown.  
12. OCR App Signing enrollment — **do not generate a new upload key.**  
13. Confirm Closed Testing countries remain all-available. Production countries: confirm same set when the field appears; do not create a Production track from that card.  
14. Target audience remaining steps only — **do not change ages.**

**Do not** upload v4 or v5. **Do not** Apply for production. **Do not** reopen Data Safety, App Access, or the three target-age boxes.

---

## 13 — What this session did / did not do

| Did | Did not |
|-----|---------|
| Read PROJECT_STATE + V2 asset packet + A3 non-binary / Closed Testing packets | Overwrite `CURRENT_TASK.md` |
| Re-fetch account-deletion, privacy, terms, website (HEAD 200) | Claim those Console cards were re-saved |
| Re-measure V2 512 icon + 1024×500 feature graphic (hashes match) | Re-export or invent new branding |
| Re-hunt phone/tablet screenshots (none exist) | Capture or mock screenshots |
| Add countries / App Signing / content-declaration / TA-remainder paste cards + operator checklist | Upload graphics to Play |
| Attempt Play Console via browser MCP (failed; no usable tab) | Claim Console save or OCR |
| Write this closeout | Commit / push; upload AAB; Apply for production; write Windows Desktop; touch `_port_extract`; edit mobile source |

`GOOGLE_PLAY_MUTATED = NO`  
`PRODUCT_CODE_CHANGED = NO`  
`AAB_BUILT = NO`  
`V4_UPLOAD_PERFORMED = NO`  
`V5_UPLOAD_PERFORMED = NO`  
`CURRENT_TASK_WRITTEN = NO`

---

## 14 — NEXT_SINGLE_OPERATOR_ACTION

In Play Console, upload `docs/ops/closeout/play-assets/icon-512x512.png` and `feature-graphic-1024x500.png`, then save Ads = No, IARC honest v3, and the v3-safe listing text from this package. Capture ≥2 real-device **Internal Testing v3** phone screenshots (Watch / Discover / Create / Messages). Do not mock Safety UI. OCR App Signing without generating a new upload key. Do not upload v4 or v5. Do not Apply for production.

Then STOP.
