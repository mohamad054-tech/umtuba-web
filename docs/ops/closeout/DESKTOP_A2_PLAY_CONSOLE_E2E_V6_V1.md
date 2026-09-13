# DESKTOP_A2_PLAY_CONSOLE_E2E_V6_V1

**DEVICE:** DESKTOP-A2  
**DATE:** 2026-08-16 (this continuation) / 2026-08-15 (asset production)  
**TASK_ID:** DESKTOP_A2_PLAY_CONSOLE_E2E_V6_V1  
**PACKAGE:** `com.umtuba.app`  
**KIND:** OPERATOR FULL AUTHORITY Closed Testing listing/setup. Play Console not writable from Cursor browser after one retry. Closed Testing only. No Production submit. No v5 promote. No AAB rebuild/upload. No product source change. No commit. Phone password not requested or recorded. Nothing written to the Windows Desktop. `_port_extract` untouched.

```
PLAY_LISTING = LOCAL_ASSETS_READY / NOT_SAVED
CLOSED_TESTING_ROLLOUT = NOT_PERFORMED
OPT_IN_LINK = UNKNOWN
PRODUCTION_SUBMISSION = NO
OPERATOR_ACTION_REQUIRED = YES
BLOCKERS = Cursor Play Console tab unavailable after one retry. Feature graphic + 2 phone screenshots not uploaded. Main store listing not saved. Privacy URL is LIVE HTTP 200 but Console URL not re-saved. Advertising ID / remaining App content not OCR'd or saved. Closed Testing not rolled out. Opt-in link / qualifying-period start / opted-in count unknown. Configured 25 ≠ opted-in.
```

```
FEATURE_GRAPHIC = LOCAL_READY / NOT_UPLOADED
FEATURE_GRAPHIC_PATH = docs/ops/closeout/play-assets/feature-graphic-1024x500-v6.png
FEATURE_GRAPHIC_DIMENSIONS = 1024x500
FEATURE_GRAPHIC_SHA256 = 60dabcfafce75b6275f0857f02f24240bc6a5c517740065ca389f255dd58cd7e
PHONE_SCREENSHOT_1_PATH = docs/ops/closeout/play-assets/phone-01-watch.png
PHONE_SCREENSHOT_1_DIMENSIONS = 1080x1920
PHONE_SCREENSHOT_1_SURFACE = Watch
PHONE_SCREENSHOT_1_SHA256 = 5fe1c8a069a60816e5aafe7e13a6d8f5c2cc3358ca8f6d972b933bcdcf7d9892
PHONE_SCREENSHOT_2_PATH = docs/ops/closeout/play-assets/phone-02-create.png
PHONE_SCREENSHOT_2_DIMENSIONS = 1080x1920
PHONE_SCREENSHOT_2_SURFACE = Create
PHONE_SCREENSHOT_2_SHA256 = 14b080a85309b5edeb8e0a09d72fcd3b9dd1ef68237ecaae042a458179628453
ICON = ALREADY_IN_CONSOLE (do not replace unless missing)
PRIVACY_PUBLIC_URL = https://umtuba.com/privacy
PRIVACY_HTTP = 200 (HEAD + GET this session; GET len=50616)
ADVERTISING_ID_DECLARATION = NO (v6 AAB, no AD_ID; Console not re-saved this session)
ADS = No
UGC = honest v6 YES (do NOT paste play-assets/PASTE_UGC.txt v3 NO)
PLAY_RECOGNIZED_VERSION_CODE = 6 (GO/prior + A1 leave-v6-in-place; not re-OCR'd). A1 recommended versionCode 7 is NOT proven uploaded (DESKTOP_A1_ANDROID_V6_POST_UPLOAD_OPEN_ROUTING_V1 has no FINAL RETURN). Do not upload a new AAB from this device.
TESTER_LIST = UMTUBA Closed Testers (GO/prior; not re-OCR'd)
CONFIGURED_TESTERS = 25 (configured; not opted-in)
QUALIFYING_PERIOD_START = UNKNOWN
QUALIFYING_TESTERS = UNKNOWN
GOOGLE_PLAY_MUTATED = NO
```

`PROJECT_STATE.md` / `CURRENT_TASK.md` / `CURSOR_REPORT.md` / `SESSION_HANDOFF.md` not overwritten.

Prior asset note (first wave): `docs/ops/closeout/DESKTOP_A2_PLAY_LISTING_ASSETS_PRODUCED_V1.md`. This packet remains the owner for phone-screenshot + Console E2E status.

---

## 1 — This continuation (2026-08-16) — Console not writable

OPERATOR FULL AUTHORITY to finish remaining Closed Testing listing/setup without waiting for another GO. Honored: no Apply for Production; no v5 promote; no AAB rebuild/upload; no phone password; no Windows Desktop writes; no `_port_extract`.

`browser_tabs` list = **empty** (no existing Play tab to lock).

| Attempt | Action | Result |
|---------|--------|--------|
| Existing tab | `browser_tabs` list | **EMPTY** — nothing to lock |
| 1 (one retry) | `browser_tabs` new → viewId `a5aa7c` `about:blank` | Tab created |
| 1a | `browser_lock` viewId `a5aa7c` | **FAIL** — `No browser tab available. Please navigate to a page first.` |
| 1b | `browser_navigate` `https://play.google.com/console` viewId `a5aa7c` | **FAIL** — `Browser view not found: a5aa7c` (tab vanished) |

**STOP.** No third MCP loop. No login, no OCR, no upload, no save, no Closed Testing rollout.

Mandatory Closed Testing rollout gates were **not** proven in Console this session, so rollout was **not** performed (cannot claim listing + App content + Advertising ID + privacy URL + Alpha versionCode complete).

---

## 2 — Local assets re-measured this session

| File | Dimensions | Bytes | SHA256 |
|------|------------|-------|--------|
| `play-assets/feature-graphic-1024x500-v6.png` | **1024×500** | 41443 | `60dabcfafce75b6275f0857f02f24240bc6a5c517740065ca389f255dd58cd7e` |
| `play-assets/phone-01-watch.png` | **1080×1920** | 1501532 | `5fe1c8a069a60816e5aafe7e13a6d8f5c2cc3358ca8f6d972b933bcdcf7d9892` |
| `play-assets/phone-02-create.png` | **1080×1920** | 236908 | `14b080a85309b5edeb8e0a09d72fcd3b9dd1ef68237ecaae042a458179628453` |

Do **not** upload stale `feature-graphic-1024x500.png`. Icon already in Console.

Privacy re-check (anonymous): `https://umtuba.com/privacy` HEAD **200**, GET **200** (50616 bytes). If Console still shows 404, operator must re-save that exact URL.

Advertising ID: `DESKTOP_A2_ADVERTISING_ID_DECLARATION_V6_V1` — v6 AAB versionCode 6 has **no** `AD_ID`. Console answer = **No**. Not saved this session.

---

## 3 — Phone screenshots — PRODUCED (Play-legal; 2026-08-15; not re-captured)

Fresh `adb screencap` on cover. Not a1-v5 / a3-v6 QA reuse. Letterbox only onto `#050510` to **1080×1920** (ratio 1.778 ≤ 2). 24-bit PNG, no alpha. No stretch. No fake chrome.

**Watch:** Real v6 feed (public video, @mohamad, Like/Save/Share). Report + Delete visible because this clip is the signed-in creator’s own video and the feed showed “You’re caught up.” Volume 100% overlay present. No passwords, DMs, or tokens. Handle only (no email).

**Create:** Real v6 compose form (choose video, caption, Terms checkbox, Publish disabled). No PII.

**Rejected for listing (kept raw only):** Discover loading-only; Profile with visible email; later Watch frames.

`PLAY_ASSET_SET_READY = YES` locally. **Not uploaded.**

---

## 4 — Exact operator clicks (human Chrome/Edge as Play developer)

```
SCREEN = https://play.google.com/console
FIELD = Main store listing → Feature graphic + Phone screenshots; App content remainder; Alpha / Closed testing
QUESTION_EXACT_WORDING = UNKNOWN — listing AI-media radios not OCR'd; do not guess
OPTIONS = Yes only if generative AI produced/substantially generated a listing asset; No only if the operator knows it did not. Listing-asset AI ≠ in-app Jinn.
EXACT_OPERATOR_ACTION =
  1. Chrome/Edge as Play developer → https://play.google.com/console → UMTUBA / com.umtuba.app
  2. Grow → Store presence → Main store listing
  3. Feature graphic: upload docs/ops/closeout/play-assets/feature-graphic-1024x500-v6.png
     (do NOT upload stale feature-graphic-1024x500.png)
  4. Phone screenshots: upload phone-01-watch.png then phone-02-create.png
  5. App name UMTUBA. Do not overwrite operator short/full description if already filled with equal-or-better text.
     If empty only: PASTE_SHORT_DESCRIPTION.txt (66/80) + PASTE_FULL_DESCRIPTION.txt (785/4000).
  6. Icon: already added — skip unless missing
  7. Save Main store listing
  8. App content:
     - Data Safety: skip if complete
     - Privacy policy: re-save exactly https://umtuba.com/privacy (public URL is HTTP 200; Console may still show 404 until re-saved)
     - Account deletion: https://umtuba.com/account-deletion (skip if Publishing overview already complete)
     - Advertising ID: Does your app use an advertising ID? → No (v6 AAB, no AD_ID)
     - Ads = No, my app does not contain ads
     - UGC = umtuba-mobile/release-artifacts/store-listing/UGC_DECLARATION.txt (YES for report/block/Terms). Honest for current v6.
       Do NOT paste play-assets/PASTE_UGC.txt or PASTE_IARC.txt (v3 NO).
     - IARC: umtuba-mobile/release-artifacts/store-listing/CONTENT_RATING_IARC.txt (moderation YES). Social Networking. Do not retake to force Everyone.
  9. AI-generated listing images: OCR the real radios; do not guess. Feature graphic was System.Drawing from real icon bytes (not GenerateImage).
  10. Testing → Closed testing / Alpha. Confirm release is ONLY the versionCode currently on Play
      (6 unless A1 already uploaded 7 — do not upload a new AAB yourself). Do not promote v5.
  11. Testers = UMTUBA Closed Testers, configured 25 (25 ≠ opted-in). Preserve that list.
  12. Roll out CLOSED TESTING ONLY if listing + mandatory App content cards are genuinely complete in Console.
      If any required card is still open, do not roll out.
  13. After rollout: copy opt-in link, qualifying-period start shown by Play, opted-in/qualifying count.
      Do not report 25 configured emails as opted-in.
  Do not Apply for Production.
```

---

## 5 — App content / Closed Testing (not mutated this session)

| Card | This session |
|------|----------------|
| Main store listing graphics | NOT_UPLOADED |
| Main store listing save | NOT_SAVED |
| Data safety | NOT_REOPENED (already complete) |
| Privacy URL re-save | NOT_PERFORMED (public URL LIVE 200) |
| Advertising ID = No | NOT_SAVED (declaration packet exists) |
| Ads = No | NOT_SAVED |
| UGC honest v6 YES | NOT_SAVED |
| IARC / TA / countries | NOT_SAVED |
| AI media | NOT_INSPECTED |
| Reviewer access | NOT_REOPENED |
| Closed Testing rollout | NOT_PERFORMED |
| Opt-in link / qualifying start / opted-in | UNKNOWN |
| Production | **NO** |

---

## 6 — Files this packet owns

Unchanged local assets (re-hashed 2026-08-16):

- `docs/ops/closeout/play-assets/feature-graphic-1024x500-v6.png`
- `docs/ops/closeout/play-assets/phone-01-watch.png`
- `docs/ops/closeout/play-assets/phone-02-create.png`

This packet update only. No product files. No AAB. No commit.
